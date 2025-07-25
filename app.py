import os
import datetime
import time
from quart import Quart, request, jsonify, Response, send_from_directory, render_template, redirect, url_for, session, websocket, render_template_string
from quart_auth    import QuartAuth, login_required, login_user, logout_user, current_user, AuthUser
from quart_cors import cors
import logging
import ldap3
import uvicorn
import threading
import asyncio
from multiprocessing import Lock
from multiprocessing import shared_memory
from werkzeug.routing import BaseConverter
from werkzeug.utils import secure_filename
import re
import json
import struct
from urllib.parse import quote, unquote, unquote_plus
import websockets
import requests
import httpx
import ssl
from PIL import Image

# --- Configuration for Queue Monitoring and Freeing ---
MONITOR_SERVER_BASE_URL = "http://192.168.236.84:5174"
MONITOR_SERVER_WS_URL = "ws://192.168.236.84:5174/ws"
MONITOR_CHECK_INTERVAL_SECONDS = 0.25
MONITOR_IDLE_DURATION_TO_FREE_SECONDS = 15
MONITOR_FREE_PAYLOAD = {"unload_models": True, "free_memory": True}
# --- End Configuration ---

# --- Privileged Users ---
privileged_users = ['qbsoon']
# --- End of Privileged Users ---

# --- Monitoring Script Functions ---
_queue_lock = Lock()
_prompt_lock = Lock()

def _open_shared(name: str, size: int, initial: int):
	try:
		shm = shared_memory.SharedMemory(name=name)
		created = False
	except FileNotFoundError:
		shm = shared_memory.SharedMemory(create=True, name=name, size=size)
		created = True
	if created:
		shm.buf[:4] = struct.pack("i", initial)
	return shm

_queue_shm  = _open_shared("comfy_queue",  4, initial=-1)
_prompt_shm = _open_shared("comfy_prompt", 4, initial=0)

def get_queue_count() -> int:
	with _queue_lock:
		return struct.unpack("i", _queue_shm.buf[:4])[0]

def set_queue_count(val: int):
	with _queue_lock:
		_queue_shm.buf[:4] = struct.pack("i", val)

def next_prompt_id() -> str:
	with _prompt_lock:
		cur = struct.unpack("i", _prompt_shm.buf[:4])[0]
		nxt = cur + 1
		_prompt_shm.buf[:4] = struct.pack("i", nxt)
		return hex(nxt)

def monitor_get_total_queue_count(base_url):
	queue_url = f"{base_url}/queue"
	try:
		response = requests.get(queue_url, timeout=5)
		response.raise_for_status()
		data = response.json()
		running_count = len(data.get("queue_running", []))
		pending_count = len(data.get("queue_pending", []))
		return running_count + pending_count
	except requests.exceptions.HTTPError as http_err:
		app.logger.error(f"BGTask: HTTP error fetching queue: {http_err} (URL: {queue_url})")
	except requests.exceptions.ConnectionError as conn_err:
		app.logger.error(f"BGTask: Connection error fetching queue: {conn_err} (URL: {queue_url})")
	except requests.exceptions.Timeout as timeout_err:
		app.logger.error(f"BGTask: Timeout error fetching queue: {timeout_err} (URL: {queue_url})")
	except requests.exceptions.RequestException as req_err:
		app.logger.error(f"BGTask: RequestException fetching queue: {req_err} (URL: {queue_url})")
	except json.JSONDecodeError:
		app.logger.error(f"BGTask: JSONDecodeError from {queue_url}.")
		if 'response' in locals() and hasattr(response, 'text'):
			app.logger.error(f"BGTask: Response Text: {response.text[:100]}...")
	return -1

def monitor_free_server_resources(base_url, payload):
	free_url = f"{base_url}/free"
	headers = {"Content-Type": "application/json"}
	try:
		app.logger.info(f"BGTask: Attempting to free resources at {free_url} with payload: {payload}")
		response = requests.post(free_url, data=json.dumps(payload), headers=headers, timeout=30)
		response.raise_for_status()
		app.logger.info(f"BGTask: Successfully called free resources. Status: {response.status_code}")
		return True
	except requests.exceptions.HTTPError as http_err:
		app.logger.error(f"BGTask: HTTP error freeing resources: {http_err} (URL: {free_url})")
	except requests.exceptions.ConnectionError as conn_err:
		app.logger.error(f"BGTask: Connection error freeing resources: {conn_err} (URL: {free_url})")
	except requests.exceptions.Timeout as timeout_err:
		app.logger.error(f"BGTask: Timeout error freeing resources: {timeout_err} (URL: {free_url})")
	except requests.exceptions.RequestException as req_err:
		app.logger.error(f"BGTask: RequestException freeing resources: {req_err} (URL: {free_url})")
	return False

def background_queue_monitor_logic():
	""" The main loop for monitoring the queue. """
	app.logger.info(f"BGTask: Monitoring queue at {MONITOR_SERVER_BASE_URL}/queue.")
	app.logger.info(f"BGTask: Will check every {MONITOR_CHECK_INTERVAL_SECONDS} seconds.")
	app.logger.info(
		f"BGTask: If queue is >0, then becomes 0 and stays 0 for "
		f"{MONITOR_IDLE_DURATION_TO_FREE_SECONDS} seconds, resources will be freed."
	)

	was_active_before_becoming_zero = False
	idle_since_timestamp = None
	freed_during_this_idle_period = False

	while True:
		try:
			current_time_display = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
			current_queue_count = monitor_get_total_queue_count(MONITOR_SERVER_BASE_URL)

			set_queue_count(current_queue_count)

			if current_queue_count == -1:
				app.logger.warning(f"BGTask: {current_time_display} - Failed to get queue count. Resetting state.")
				was_active_before_becoming_zero = False
				idle_since_timestamp = None
				freed_during_this_idle_period = False

			elif current_queue_count > 0:
				if not was_active_before_becoming_zero or idle_since_timestamp is not None:
					app.logger.info(f"BGTask: {current_time_display} - Queue is now active ({current_queue_count} items).")
				was_active_before_becoming_zero = True
				idle_since_timestamp = None
				freed_during_this_idle_period = False

			else:
				if was_active_before_becoming_zero:
					if idle_since_timestamp is None:
						idle_since_timestamp = time.time()
						freed_during_this_idle_period = False
						app.logger.info(
							f"BGTask: {current_time_display} - Queue transitioned from active to 0. "
							f"Starting {MONITOR_IDLE_DURATION_TO_FREE_SECONDS}s countdown."
						)
					else:
						current_idle_duration = time.time() - idle_since_timestamp
						if int(current_idle_duration) % 5 == 0 and current_idle_duration > 0.3 and not freed_during_this_idle_period:
							app.logger.info(
								f"BGTask: {current_time_display} - Queue remains 0 (was active). "
								f"Idle for {current_idle_duration:.2f}s."
							)

						if current_idle_duration >= MONITOR_IDLE_DURATION_TO_FREE_SECONDS and not freed_during_this_idle_period:
							app.logger.info(
								f"BGTask: {current_time_display} - Queue has been 0 for "
								f"{current_idle_duration:.2f}s after being active. Triggering free resources."
							)
							if monitor_free_server_resources(MONITOR_SERVER_BASE_URL, MONITOR_FREE_PAYLOAD):
								freed_during_this_idle_period = True
								was_active_before_becoming_zero = False
								app.logger.info(f"BGTask: {current_time_display} - Resources freed. State reset.")

				else:
					if idle_since_timestamp is None:
						app.logger.debug(f"BGTask: {current_time_display} - Queue is 0 (was not recently active). No countdown initiated.")
						idle_since_timestamp = time.time()

			time.sleep(MONITOR_CHECK_INTERVAL_SECONDS)

		except Exception as e:
			app.logger.error(f"BGTask: Unexpected error in monitor loop: {e}", exc_info=True)
			time.sleep(5)

# --- End Monitoring Script Functions ---


# --- Quart Application Setup ---
logging.getLogger('ldap3').setLevel(logging.DEBUG)

app = Quart(__name__, template_folder='pages')
cors(app)

# --- End of Quart Application Setup ---


# --- Logging Configuration ---
log_directory = "logs"
if not os.path.exists(log_directory):
	os.makedirs(log_directory)

log_file = os.path.join(log_directory, "comfy_site.log")

# Rotate logs: 10 MB per file, keep last 10 files
file_handler = logging.handlers.RotatingFileHandler(log_file, maxBytes=1024*1024*10, backupCount=9, encoding='utf-8')

# Format: 2025-05-18 10:00:00,123 INFO in app: Log message
log_formatter = logging.Formatter(
	'%(asctime)s %(levelname)s in %(module)s: %(message)s'
)

file_handler.setFormatter(log_formatter)
file_handler.setLevel(logging.DEBUG)

app.logger.handlers = []
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.DEBUG)
app.logger.propagate = False

werkzeug_logger = logging.getLogger('werkzeug')
werkzeug_logger.handlers = []
werkzeug_logger.addHandler(file_handler)
werkzeug_logger.setLevel(logging.WARNING)
werkzeug_logger.propagate = False

app.logger.info('Site file logging configured (always active).')

# --- End of Logging Configuration ---


# --- Session reset ---
@app.before_request
def make_session_non_permanent():
	session.permanent = False

# --- Custom URL Converter for Regex ---
class RegexConverter(BaseConverter):
	def __init__(self, url_map, *items):
		super().__init__(url_map)
		self.regex = items[0]

app.url_map.converters['regex'] = RegexConverter


# --- LDAP Configuration ---
app.config['LDAP_HOST'] = 'kpi.kul.pl'
app.config['LDAP_PORT'] = 636
app.config['LDAP_USE_SSL'] = True
app.config['LDAP_BASE_DN'] = 'dc=kpi,dc=kul,dc=pl'

app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY')

app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB

cert_path = '/etc/ssl/certs/ca-certificates.crt'
ca_cert_path = os.environ.get('LDAP_CA_CERTS_FILE', cert_path)
app.config['LDAP_TLS_CA_CERTS_FILE'] = ca_cert_path

app.config['LDAP_TLS_REQUIRE_CERT'] = ssl.CERT_REQUIRED

app.config['LDAP_USER_DN'] = 'ou=Users,dc=kpi,dc=kul,dc=pl'
app.config['LDAP_USER_RDN_ATTR'] = 'uid'
app.config['LDAP_USER_LOGIN_ATTR'] = 'uid'
app.config['LDAP_USER_FULLNAME_ATTR'] = os.environ.get('LDAP_USER_FULLNAME_ATTR', 'cn')

class User(AuthUser):
	def __init__(self, identifier):
		super().__init__(identifier)
		profile = session.get('user_profile', {})
		self.username = profile.get('username')
		self.dn = profile.get('dn')
		self.data = data = profile.get('attributes', {})

	def get_id(self):
		return self.dn

	def get_fullname(self):
		return self.data.get(app.config['LDAP_USER_FULLNAME_ATTR'], [self.username])[0]
	
	@property
	def identifier(self) -> str:
		return self.username
	
login_manager = QuartAuth(app, user_class=User)
login_manager.login_view = "login"

# --- End of LDAP Configuration ---


# --- User Management ---
@app.route('/login', methods=['GET', 'POST'])
async def login():
	if await current_user.is_authenticated:
		return redirect(url_for('home'))

	if request.method == 'POST':
		form = await request.form
		username = form.get('username')
		password = form.get('password')
		app.logger.info(f"Attempting login for user: {username}")

		if not username or not password:
			app.logger.warning("Login attempt with missing username or password.")
			return await render_template("auth.html", error="Missing username or password")

		conn = None
		try:
			app.logger.debug("--- Manual LDAP Authentication ---")

			user_dn = f"{app.config['LDAP_USER_LOGIN_ATTR']}={username},{app.config['LDAP_USER_DN']}"
			app.logger.debug(f"Manual Auth: Constructed User DN: {user_dn}")

			tls_config = ldap3.Tls(validate=ssl.CERT_NONE, version=ssl.PROTOCOL_TLSv1_2)

			server = ldap3.Server(
				app.config['LDAP_HOST'],
				port=app.config['LDAP_PORT'],
				use_ssl=app.config['LDAP_USE_SSL'],
				tls=tls_config
			)
			app.logger.debug(f"Manual Auth: Connecting to server: {server.host}:{server.port} SSL={server.ssl}")

			conn = ldap3.Connection(
				server,
				user=user_dn,
				password=password,
				authentication=ldap3.SIMPLE,
				auto_bind=False
			)
			app.logger.debug("Manual Auth: Connection object created with auto_bind=False. Attempting bind...")

			bind_successful = conn.bind()
			app.logger.debug(f"Manual Auth: Explicit bind result: {bind_successful}")

			if bind_successful:
				app.logger.info(f"Manual Auth: Bind SUCCESSFUL for DN: {user_dn}")

				search_base = app.config['LDAP_USER_DN']
				search_filter = f"({app.config['LDAP_USER_LOGIN_ATTR']}={username})"
				attributes_to_get = [app.config['LDAP_USER_FULLNAME_ATTR'], app.config['LDAP_USER_LOGIN_ATTR']]
				app.logger.debug(f"Manual Auth: Searching for user attributes. Base='{search_base}', Filter='{search_filter}', Attrs={attributes_to_get}")

				if conn.search(search_base=search_base,
							   search_filter=search_filter,
							   search_scope=ldap3.SUBTREE,
							   attributes=attributes_to_get):

					if len(conn.entries) == 1:
						entry = conn.entries[0]
						actual_user_dn = entry.entry_dn
						app.logger.debug(f"Manual Auth: User entry found: {entry.entry_dn}")
						app.logger.debug(f"Manual Auth: User attributes: {entry.entry_attributes_as_dict}")

						user_data = {k: v[0] for k, v in entry.entry_attributes_as_dict.items() if v}

						user_attributes_dict = {k: v[0] for k, v in entry.entry_attributes_as_dict.items() if v}

						user_profile_for_session = {
							'dn': actual_user_dn,
							'username': username,
							'attributes': user_attributes_dict
						}
						session['user_profile'] = user_profile_for_session
						app.logger.debug(f"Manual Auth: Stored user profile in session for {username}")

						user = User(username)
						login_user(user)
						app.logger.info(f"User {username} object created and logged in via Flask-Login.")
						try:
							user_gallery_path = os.path.join(GALLERY_BASE_DIR, username)
							os.makedirs(user_gallery_path, exist_ok=True)
							app.logger.info(f"Ensured gallery directory exists for user {username} at {user_gallery_path}")
						except OSError as e:
							app.logger.error(f"Failed to create gallery directory for user {username} at {user_gallery_path}: {e}")
						return redirect(url_for('home'))
					else:
						app.logger.error(f"Manual Auth: Search returned {len(conn.entries)} entries for filter '{search_filter}'. Expected 1.")
						return await render_template("auth.html", error="Login failed: Could not uniquely identify user.")
				else:
					app.logger.error(f"Manual Auth: Search failed after successful bind. Filter='{search_filter}'. Result: {conn.result}")
					return await render_template("auth.html", error="Login failed: Could not retrieve user data.")

			else:
				app.logger.warning(f"Manual Auth: Bind FAILED for DN: {user_dn}. Result: {conn.result}")
				if conn.result and conn.result.get('result') == 49:
					return await render_template("auth.html", error="Invalid username or password")
				else:
					return await render_template("auth.html", error="LDAP bind failed (not invalid credentials).")

		except ldap3.core.exceptions.LDAPException as e:
			app.logger.error(f"Manual Auth: LDAPException during manual authentication: {e}", exc_info=True)
			return await render_template("auth.html", error="An LDAP error occurred during login.")
		except Exception as e:
			app.logger.error(f"Manual Auth: Non-LDAP Exception during manual authentication: {e}", exc_info=True)
			return await render_template("auth.html", error="An unexpected error occurred during login.")
		finally:
			if conn and conn.bound:
				conn.unbind()
			app.logger.debug("--- Finished Manual LDAP Authentication ---")

	return await render_template("auth.html")

@app.route('/logout')
@login_required
async def logout():
	session.pop('user_profile', None)
	logout_user()
	app.logger.info("User logged out.")
	return redirect(url_for('login'))

# --- End of User Management ---


GALLERY_BASE_DIR = "gallery"
THUMBNAIL_SUBDIR = "thumbnails"
THUMBNAIL_WIDTH = 200
THUMBNAIL_FORMAT = "JPEG"
THUMBNAIL_QUALITY = 85


# --- Helper function for Manifest ---
def get_image_files(directory):
	"""Zwraca listę plików obrazów posortowaną wg daty modyfikacji (malejąco)."""
	images_with_mtime = []
	if not os.path.isdir(directory):
		return []

	for filename in os.listdir(directory):
		if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
			try:
				filepath = os.path.join(directory, filename)
				mtime = os.path.getmtime(filepath)
				images_with_mtime.append((filename, mtime))
			except OSError as e:
				app.logger.warning(f"Could not get modification time for {filename}: {e}")

	images_with_mtime.sort(key=lambda item: item[1], reverse=True)

	sorted_filenames = [item[0] for item in images_with_mtime]
	return sorted_filenames


# --- Determining model filename prefix ---
def model_filename(model):
	if model=="sd_xl_base_1.0.safetensors":
		return 'sdxl'
	if model=='sd3.5_large_fp8_scaled.safetensors':
		return 'sd35'
	if model=='sd_xl_turbo_1.0_fp16.safetensors':
		return 'sdxlturbo'
	if model=='flux1-dev-Q8_0.gguf':
		return 'flux'
	if model=='hidream_i1_fast_fp8.safetensors':
		return 'hdi1f'
	if model=='VerusVision_1.0b_Transformer_fp8.safetensors':
		return 'verusvision'
	if model=='colorizing':
		return 'colorizing'
	if model=='upscaling':
		return 'upscaling'
	if model=='outpainting':
		return 'outpainting'


# --- Endpoint generating IIIF manifest ---
@app.route('/api/iiif-manifest', endpoint='generate_iiif_manifest')
@login_required
async def generate_iiif_manifest():
	uid = request.args.get('uid')
	limit_start = request.args.get('from')
	limit_end = request.args.get('to')
	try:
		filter_model = request.args.get('model')
		app.logger.debug(f"Model filter provided: {filter_model}")
	except:
		filter_model = None

	try:
		filter_keywords = request.args.get('keywords')
		filter_keywords_type = request.args.get('keywordsRadio')
		app.logger.debug(f"Keywords filter provided: {filter_keywords}")
	except:
		filter_keywords = None
		filter_keywords_type = None
		

	if limit_start:
		try:
			limit_start = int(limit_start)
			if limit_start <= 0:
				limit_start = None
		except ValueError:
			limit_start = None
	
	if limit_end:
		try:
			limit_end = int(limit_end)
			if limit_end <= 0:
				limit_end = None
		except ValueError:
			limit_end = None


	if not uid:
		return jsonify({"error": "Missing 'uid' parameter"}), 400
	
	if str(uid) != str(current_user.username):
		app.logger.warning(f"User {current_user.username} attempted to access manifest for UID {uid}.")
		return jsonify({"error": "Unauthorized access to gallery manifest"}), 403

	user_gallery_path = os.path.join(GALLERY_BASE_DIR, str(uid))
	image_files = get_image_files(user_gallery_path)

	image_files = [i_f for i_f in image_files if not i_f.startswith("upload")]

	public_manifest_data = load_public_manifest() 
	
	base_url_dynamic = request.host_url.rstrip('/')

	manifest_id = url_for('generate_iiif_manifest', uid=uid, _external=True)

	gallery_base_url = f"{base_url_dynamic}/gallery/"
	thumbnail_base_url = f"{base_url_dynamic}/thumbnails/"

	if filter_model:
		model_prefix = model_filename(filter_model)
		if model_prefix!="sdxl":
			filtered_image_files = [f for f in image_files if f.startswith(model_prefix)]
		else:
			filtered_image_files = [f for f in image_files if (f.startswith('sdxl') and not f.startswith('sdxlturbo'))]
		if len(filtered_image_files) != 0:
			image_files = filtered_image_files.copy()
		else:
			image_files = None

	if filter_keywords:
		app.logger.debug(f"Filter keywords provided: {filter_keywords}")
		decoded_sentence = unquote_plus(filter_keywords)
		keywords = decoded_sentence.split(",")
		keywords = [k.strip().lower() for k in keywords if k.strip()]
		filtered_image_files = []
		for f in image_files:
			user_gallery_path = os.path.join(GALLERY_BASE_DIR, str(uid))
			f_fp = os.path.join(user_gallery_path, f)
			f_wf = get_workflow_from_image_path(f_fp)
			f_cp = py_find_checkpoint_in_workflow(f_wf)
			f_prompt_p = py_get_positive_prompt_from_comfy_workflow(f_wf, f_cp)
			if filter_keywords_type == 'all':
				if all(keyword.lower() in f_prompt_p.lower() for keyword in keywords):
					filtered_image_files.append(f)
			if filter_keywords_type == 'any':
				if any(keyword.lower() in f_prompt_p.lower() for keyword in keywords):
					filtered_image_files.append(f)
		if len(filtered_image_files) != 0:
			image_files = filtered_image_files.copy()
		else:
			image_files = None

	manifest = {
		"@context": "http://iiif.io/api/presentation/2/context.json",
		"@id": manifest_id,
		"@type": "sc:Manifest",
		"label": f"Gallery for User {uid}" + (f" (From {limit_start})" if limit_start else "" + (f'To {limit_end})' if limit_end else "")) + (f" (Model: {filter_model})" if filter_model else "") + (f" (Keywords: {unquote_plus(filter_keywords)})" if filter_keywords else ""),
		"totalCanvases": len(image_files) if image_files is not None else 0,
		"sequences": [
			{
				"@id": f"{manifest_id}/sequence/normal",
				"@type": "sc:Sequence",
				"label": "Default order",
				"canvases": []
			}
		]
	}

	if not image_files:
		app.logger.info(f"No images found for manifest (UID: {uid}). Returning empty manifest.")
		if filter_model or filter_keywords:
			manifest["label"] = manifest.get("label", "") + " - No Results"
		return jsonify(manifest) 
	
	app.logger.debug(f"Found {len(image_files)} images for manifest (UID: {uid}).")

	if limit_end is not None and len(image_files) > limit_end:
		image_files = image_files[:limit_end]

	if limit_start is not None and len(image_files) > 0:
		image_files = image_files[limit_start:]

	for i, filename in enumerate(image_files):
		is_public = False
		for public_entry in public_manifest_data:
			if public_entry.get("original_uid") == str(uid) and \
			   public_entry.get("original_filename") == filename:
				is_public = True
				break
		
		img_width, img_height = 100, 100
		thumb_width, thumb_height = THUMBNAIL_WIDTH, THUMBNAIL_WIDTH
		try:
			original_image_path = os.path.join(user_gallery_path, filename)
			with Image.open(original_image_path) as img:
				img_width, img_height = img.size
				if img_width > 0:
					thumb_height = int(img_height * (THUMBNAIL_WIDTH / img_width))
				else:
					thumb_height = THUMBNAIL_WIDTH
		except Exception as e:
			app.logger.warning(f"Could not read dimensions for {filename} (UID: {uid}): {e}")

		canvas_id = f"{manifest_id}/canvas/canvas-{i}"
		quoted_filename = quote(filename)

		full_image_url = f"{gallery_base_url}{uid}/{quoted_filename}"
		thumb_image_url = f"{thumbnail_base_url}{uid}/{quoted_filename}"

		image_resource = {
			"@id": full_image_url,
			"@type": "dctypes:Image",
			"format": f"image/{filename.split('.')[-1].lower()}",
			"width": img_width,
			"height": img_height,
		}

		canvas = {
			"@id": canvas_id,
			"@type": "sc:Canvas",
			"label": filename,
			"width": img_width,
			"height": img_height,
			"images": [
				{
					"@id": f"{canvas_id}/image-{i}",
					"@type": "oa:Annotation",
					"motivation": "sc:painting",
					"resource": image_resource,
					"on": canvas_id
				}
			],
			"thumbnail": {
				 "@id": thumb_image_url,
				 "@type": "dctypes:Image",
				 "width": thumb_width,
				 "height": thumb_height
			},
			"service": [
				{
					"is_public": is_public
				}
			]
		}
		manifest["sequences"][0]["canvases"].append(canvas)

	return jsonify(manifest)


# --- Route to render the main HTML file ---
@app.route("/")
@login_required
async def home():
   return await render_template("index.html", username=current_user.username)


# --- Route to serve the gallery files ---
@app.route('/gallery/<path:subpath>')
@login_required
async def handle_gallery_file(subpath):
	app.logger.debug(f"--- Handling gallery ORIGINAL file request ---")
	decoded_subpath = unquote(subpath) # np. "0/plik.png"
	app.logger.debug(f"Decoded subpath for original: {decoded_subpath}")

	original_path = os.path.join(GALLERY_BASE_DIR, decoded_subpath)

	if os.path.isfile(original_path):
		directory, filename = os.path.split(original_path)
		app.logger.debug(f"Serving original file: {original_path}")
		return await send_from_directory(directory, filename)
	else:
		app.logger.warning(f"Original file not found at: {original_path}")
		return "File not found", 404


# --- Thumbnails route ---
@app.route('/thumbnails/<path:subpath>')
@login_required
async def handle_thumbnail(subpath):
	decoded_subpath = unquote(subpath)

	parts = decoded_subpath.split('/')
	if len(parts) != 2 or not parts[0] or not parts[1]:
		app.logger.error(f"Invalid thumbnail path structure received by handle_thumbnail: {decoded_subpath}")
		return "Invalid path structure", 400

	uid = parts[0]
	filename = parts[1]
	thumbnail_dir = os.path.join(GALLERY_BASE_DIR, uid, THUMBNAIL_SUBDIR)
	thumbnail_path = os.path.join(thumbnail_dir, filename)
	original_path = os.path.join(GALLERY_BASE_DIR, uid, filename)

	if os.path.isfile(thumbnail_path):
		app.logger.debug(f"Serving existing thumbnail: {thumbnail_path}")
		return await send_from_directory(thumbnail_dir, filename)

	app.logger.info(f"Thumbnail not found, attempting generation: {thumbnail_path}")
	if not os.path.isfile(original_path):
		app.logger.error(f"Original image NOT FOUND for thumbnail generation at: {original_path}")
		return "Original image not found", 404

	try:
		with Image.open(original_path) as img:
			if img.mode in ("RGBA", "P") and THUMBNAIL_FORMAT == "JPEG":
				img = img.convert("RGB")
			width_percent = (THUMBNAIL_WIDTH / float(img.size[0]))
			new_height = int((float(img.size[1]) * float(width_percent)))
			img.thumbnail((THUMBNAIL_WIDTH, new_height))
			os.makedirs(thumbnail_dir, exist_ok=True)
			save_options = {}
			if THUMBNAIL_FORMAT == "JPEG":
				save_options['quality'] = THUMBNAIL_QUALITY
				save_options['optimize'] = True
			img.save(thumbnail_path, THUMBNAIL_FORMAT, **save_options)
			app.logger.info(f"Successfully generated and saved thumbnail: {thumbnail_path}")
		return await send_from_directory(thumbnail_dir, filename)
	except Exception as e:
		app.logger.error(f"Error during thumbnail generation for {original_path}: {e}")
		return "Error generating thumbnail", 500


# --- Main gallery route ---
@app.route('/gallery/<regex("([0-9]+(\/[^\/])*)?[^\/]$"):subpath>/')
@login_required
async def handle_gallery(subpath):
	full_path = os.path.join("gallery", subpath)

	if os.path.isdir(full_path):
		files = os.listdir(full_path)
		html_content = """
		<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 3.2 Final//EN">
		<html>
		<head><title>Index of /gallery/{{ subpath }}</title></head>
		<body>
			<h1>Index of /gallery/{{ subpath }}</h1>
			<table>
				<tr>
					<th valign="top"><img src="/icons/blank.gif" alt="[ICO]"></th>
					<th><a href="?C=N;O=D">Name</a></th>
					<th><a href="?C=M;O=A">Last modified</a></th>
					<th><a href="?C=S;O=A">Size</a></th>
					<th><a href="?C=D;O=A">Description</a></th>
				</tr>
				<tr><th colspan="5"><hr></th></tr>
				<tr>
					<td valign="top"><img src="/icons/back.gif" alt="[PARENTDIR]"></td>
					<td><a href="../">Parent Directory</a></td>
					<td>&nbsp;</td>
					<td align="right">-</td>
					<td>&nbsp;</td>
				</tr>
		"""
		for file_name in sorted(files):
			file_path = os.path.join(full_path, file_name)
			if os.path.isdir(file_path):
				icon = "folder.gif"
				size = "-"
			else:
				icon = "image2.gif"
				size = f"{os.path.getsize(file_path) / 1024:.1f}K"

			modification_time = datetime.datetime.fromtimestamp(
				os.path.getmtime(file_path)
			).strftime("%Y-%m-%d %H:%M")

			html_content += f"""
			<tr>
				<td valign="top"><img src="/icons/{icon}" alt="[ICON]"></td>
				<td><a href="{file_name}">{file_name}</a></td>
				<td align="right">{modification_time}</td>
				<td align="right">{size}</td>
				<td>&nbsp;</td>
			</tr>
			"""

		html_content += """
				<tr><th colspan="5"><hr></th></tr>
			</table>
			<address>Flask/2.0 Server at 127.0.0.1 Port 8000</address>
		</body>
		</html>
		"""
		return await render_template_string(html_content, subpath=subpath)

	elif os.path.isfile(full_path):
		return redirect("/gallery/"+subpath)

	else:
		return f"<h1>Path {subpath} not found</h1>", 404
	

# --- Endpoint to Delete an Image ---
@app.route('/api/delete-image', methods=['POST'])
@login_required
async def delete_image_endpoint():
	app.logger.info("--- Delete Image Endpoint Called ---")
	try:
		data = await request.get_json()
		if not data:
			app.logger.warning("Delete request received with no JSON data.")
			return jsonify({"success": False, "error": "Missing JSON data"}), 400

		uid_from_request = data.get('uid')
		filename_from_request = data.get('filename')

		app.logger.debug(f"Delete request for UID: {uid_from_request}, Filename: {filename_from_request}")

		if not uid_from_request or not filename_from_request:
			app.logger.warning("Delete request missing UID or filename.")
			return jsonify({"success": False, "error": "Missing uid or filename in request"}), 400

		if str(uid_from_request) != str(current_user.username):
			app.logger.error(f"SECURITY ALERT: User '{current_user.username}' attempted to delete image for UID '{uid_from_request}'.")
			return jsonify({"success": False, "error": "Unauthorized action"}), 403

		if ".." in filename_from_request or "/" in filename_from_request or "\\" in filename_from_request:
			app.logger.error(f"SECURITY ALERT: Invalid characters in filename for deletion: '{filename_from_request}'")
			return jsonify({"success": False, "error": "Invalid filename"}), 400

		user_gallery_dir = os.path.join(GALLERY_BASE_DIR, str(current_user.username))
		original_image_path = os.path.join(user_gallery_dir, filename_from_request)
		thumbnail_image_path = os.path.join(user_gallery_dir, THUMBNAIL_SUBDIR, filename_from_request)

		app.logger.info(f"Attempting to delete original: {original_image_path}")
		app.logger.info(f"Attempting to delete thumbnail: {thumbnail_image_path}")

		deleted_original = False
		deleted_thumbnail = False

		if os.path.isfile(original_image_path):
			try:
				os.remove(original_image_path)
				deleted_original = True
				app.logger.info(f"Successfully deleted original image: {original_image_path}")
			except OSError as e:
				app.logger.error(f"Error deleting original image {original_image_path}: {e}")
		else:
			app.logger.warning(f"Original image not found for deletion: {original_image_path}")

		if os.path.isfile(thumbnail_image_path):
			try:
				os.remove(thumbnail_image_path)
				deleted_thumbnail = True
				app.logger.info(f"Successfully deleted thumbnail image: {thumbnail_image_path}")
			except OSError as e:
				app.logger.error(f"Error deleting thumbnail image {thumbnail_image_path}: {e}")
		else:
			app.logger.warning(f"Thumbnail image not found for deletion: {thumbnail_image_path}")

		if deleted_original or deleted_thumbnail:
			app.logger.info(f"Deletion process completed for {filename_from_request} (Original deleted: {deleted_original}, Thumbnail deleted: {deleted_thumbnail})")
			return jsonify({"success": True, "message": "Image and/or thumbnail deleted successfully."})
		elif not os.path.exists(original_image_path) and not os.path.exists(thumbnail_image_path):
			app.logger.info(f"Neither original nor thumbnail existed for {filename_from_request}. Considered deleted.")
			return jsonify({"success": True, "message": "Image already deleted or never existed."})
		else:
			app.logger.error(f"Failed to delete files for {filename_from_request}. Check previous errors.")
			return jsonify({"success": False, "error": "Failed to delete one or more image files. See server logs."}), 500

	except Exception as e:
		app.logger.error(f"Unexpected error in delete_image_endpoint: {e}", exc_info=True)
		return jsonify({"success": False, "error": "An unexpected server error occurred."}), 500


# --- Public Gallery ---
PUBLIC_MANIFEST_DIR = "data"
PUBLIC_MANIFEST_FILENAME = "public_manifest.json"
PUBLIC_MANIFEST_PATH = os.path.join(PUBLIC_MANIFEST_DIR, PUBLIC_MANIFEST_FILENAME)
public_manifest_lock = threading.Lock()

def load_public_manifest():
	with public_manifest_lock:
		if not os.path.exists(PUBLIC_MANIFEST_PATH):
			# Create the directory if it doesn't exist
			os.makedirs(os.path.dirname(PUBLIC_MANIFEST_PATH), exist_ok=True)
			return []
		try:
			with open(PUBLIC_MANIFEST_PATH, 'r') as f:
				return json.load(f)
		except (FileNotFoundError, json.JSONDecodeError):
			return []

def save_public_manifest(manifest_data):
	with public_manifest_lock:
		os.makedirs(os.path.dirname(PUBLIC_MANIFEST_PATH), exist_ok=True)
		with open(PUBLIC_MANIFEST_PATH, 'w') as f:
			json.dump(manifest_data, f, indent=2)

@app.route('/api/toggle-public-status', methods=['POST'])
@login_required
async def toggle_public_status():
	data = await request.get_json()
	filename = data.get('filename')
	image_owner_uid = data.get('image_owner_uid')

	if not filename or not image_owner_uid:
		return jsonify({"success": False, "error": "Missing filename or image owner UID"}), 400

	if str(image_owner_uid) != str(current_user.username):
		app.logger.warning(f"User {current_user.username} attempted to toggle public status for image owned by {image_owner_uid}")
		return jsonify({"success": False, "error": "Unauthorized"}), 403

	public_manifest = load_public_manifest()
	image_entry = {"original_uid": str(image_owner_uid), "original_filename": filename}
	
	is_currently_public = False

	for entry in public_manifest:
		if entry.get("original_uid") == image_entry["original_uid"] and \
		   entry.get("original_filename") == image_entry["original_filename"]:
			is_currently_public = True
			break

	if is_currently_public:
		public_manifest = [
			entry for entry in public_manifest
			if not (entry.get("original_uid") == image_entry["original_uid"] and \
					entry.get("original_filename") == image_entry["original_filename"])
		]
		action = "removed"
	else:
		image_entry["timestamp_published"] = datetime.datetime.utcnow().isoformat()
		public_manifest.append(image_entry)
		public_manifest.sort(key=lambda x: x.get("timestamp_published", ""), reverse=True)
		action = "added"

	save_public_manifest(public_manifest)
	app.logger.info(f"User {current_user.username} {action} image {filename} (owner: {image_owner_uid}) to/from public gallery.")
	return jsonify({"success": True, "action": action, "is_public": not is_currently_public})

@app.route('/api/public-iiif-manifest', endpoint='generate_public_iiif_manifest')
@login_required
async def generate_public_iiif_manifest():
	public_images_data = load_public_manifest()

	public_images_data = [i_f for i_f in public_images_data if not i_f.get('original_filename').startswith("upload")]
	
	base_url_dynamic = request.host_url.rstrip('/')
	manifest_id = url_for('generate_public_iiif_manifest', _external=True)
	limit_start = request.args.get('from')
	limit_end = request.args.get('to')
	try:
		filter_model = request.args.get('model')
		app.logger.debug(f"Model filter provided: {filter_model}")
	except:
		filter_model = None

	try:
		filter_keywords = request.args.get('keywords')
		filter_keywords_type = request.args.get('keywordsRadio')
		app.logger.debug(f"Keywords filter provided: {filter_keywords}")
	except:
		filter_keywords = None
		filter_keywords_type = None

	if limit_start:
		try:
			limit_start = int(limit_start)
			if limit_start <= 0:
				limit_start = None
		except ValueError:
			limit_start = None
	
	if limit_end:
		try:
			limit_end = int(limit_end)
			if limit_end <= 0:
				limit_end = None
		except ValueError:
			limit_end = None

	if filter_model:
		model_prefix = model_filename(filter_model)
		if model_prefix:
			if model_prefix!="sdxl":
				filtered_image_files = [f for f in public_images_data if f.get('original_filename').startswith(model_prefix)]
			else:
				filtered_image_files = [f for f in public_images_data if (f.get('original_filename').startswith('sdxl') and not f.get('original_filename').startswith('sdxlturbo'))]
		if len(filtered_image_files) != 0:
			public_images_data = filtered_image_files.copy()
		else:
			public_images_data = None

	if filter_keywords:
		decoded_sentence = unquote_plus(filter_keywords)
		keywords = decoded_sentence.split(",")
		keywords = [k.strip().lower() for k in keywords if k.strip()]
		filtered_image_files = []
		for f in public_images_data:
			user_gallery_path = os.path.join(GALLERY_BASE_DIR, f.get('original_uid'))
			f_fn = f.get('original_filename')
			f_fp = os.path.join(user_gallery_path, f_fn)
			f_wf = get_workflow_from_image_path(f_fp)
			f_cp = py_find_checkpoint_in_workflow(f_wf)
			f_prompt_p = py_get_positive_prompt_from_comfy_workflow(f_wf, f_cp)
			if filter_keywords_type == 'all':
				if all(keyword.lower() in f_prompt_p.lower() for keyword in keywords):
					filtered_image_files.append(f)
			if filter_keywords_type == 'any':
				if any(keyword.lower() in f_prompt_p.lower() for keyword in keywords):
					filtered_image_files.append(f)
		if len(filtered_image_files) != 0:
			public_images_data = filtered_image_files.copy()
		else:
			public_images_data = None

	manifest = {
		"@context": "http://iiif.io/api/presentation/2/context.json",
		"@id": manifest_id,
		"@type": "sc:Manifest",
		"label": "Public Gallery" + (f" (From {limit_start})" if limit_start else "" + (f'To {limit_end})' if limit_end else "")) + (f" (Model: {filter_model})" if filter_model else "") + (f" (Keywords: {unquote_plus(filter_keywords)})" if (filter_keywords and keywords) else ""),
		"totalCanvases": len(public_images_data) if public_images_data is not None else 0,
		"sequences": [{
			"@id": f"{manifest_id}/sequence/normal",
			"@type": "sc:Sequence",
			"label": "Default order",
			"canvases": []
		}]
	}


	if not public_images_data:
		app.logger.info("Public gallery is empty. Returning empty manifest.")
		if filter_model or filter_keywords:
			manifest["label"] = manifest.get("label", "") + " - No Results"
		return jsonify(manifest)
	

	if limit_end is not None and len(public_images_data) > limit_end:
		public_images_data = public_images_data[:limit_end]

	if limit_start is not None and len(public_images_data) > 0:
		public_images_data = public_images_data[limit_start:]


	for i, item_data in enumerate(public_images_data):
		original_uid = item_data.get("original_uid")
		original_filename = item_data.get("original_filename")

		if not original_uid or not original_filename:
			app.logger.warning(f"Skipping invalid entry in public manifest: {item_data}")
			continue

		user_gallery_path = os.path.join(GALLERY_BASE_DIR, str(original_uid))
		original_image_path = os.path.join(user_gallery_path, original_filename)
		
		img_width, img_height = 100, 100
		thumb_width, thumb_height = THUMBNAIL_WIDTH, THUMBNAIL_WIDTH 
		try:
			with Image.open(original_image_path) as img:
				img_width, img_height = img.size
				if img_width > 0:
					thumb_height = int(img_height * (THUMBNAIL_WIDTH / img_width))
		except Exception as e:
			app.logger.warning(f"Could not read dimensions for public image {original_filename} (UID: {original_uid}): {e}")

		canvas_id = f"{manifest_id}/canvas/canvas-public-{i}"
		quoted_filename = quote(original_filename)

		full_image_url = f"{base_url_dynamic}/gallery/{original_uid}/{quoted_filename}"
		thumb_image_url = f"{base_url_dynamic}/thumbnails/{original_uid}/{quoted_filename}"

		image_resource = {
			"@id": full_image_url,
			"@type": "dctypes:Image",
			"format": f"image/{original_filename.split('.')[-1].lower()}",
			"width": img_width,
			"height": img_height,
			"metadata": [
				{"label": "Uploaded by", "value": original_uid}
			]
		}
		canvas = {
			"@id": canvas_id,
			"@type": "sc:Canvas",
			"label": original_filename,
			"width": img_width,
			"height": img_height,
			"images": [{
				"@id": f"{canvas_id}/image-public-{i}",
				"@type": "oa:Annotation",
				"motivation": "sc:painting",
				"resource": image_resource,
				"on": canvas_id
			}],
			"thumbnail": {
				 "@id": thumb_image_url,
				 "@type": "dctypes:Image",
				 "width": thumb_width,
				 "height": thumb_height
			},
			"service": [
				{
					"original_uploader": original_uid
				}
			]
		}
		manifest["sequences"][0]["canvases"].append(canvas)
	
	return jsonify(manifest)

# --- End Public Gallery ---


# --- Begin parse workflow functions ---
def get_workflow_from_image_path(image_path):
	if not os.path.exists(image_path):
		app.logger.warning(f"get_workflow_from_image_path: Image path not found: {image_path}")
		return None
	
	try:
		with Image.open(image_path) as img:
			raw_workflow_json_string = img.info.get('prompt') if hasattr(img, 'info') and isinstance(img.info, dict) else None
			
			if not raw_workflow_json_string:
				app.logger.debug(f"get_workflow_from_image_path: No 'prompt' metadata in img.info for {image_path}")
				return None
			return raw_workflow_json_string
	except FileNotFoundError:
		app.logger.warning(f"get_workflow_from_image_path: Image file not found (FileNotFoundError): {image_path}")
		return None
	except Exception as e:
		app.logger.error(f"get_workflow_from_image_path: Error processing image {image_path}: {e}", exc_info=True)
		return None

def py_find_checkpoint_in_workflow(raw_workflow_json_string):
	if not raw_workflow_json_string or not isinstance(raw_workflow_json_string, str):
		return None
	
	checkpoints = [
		'sd3.5_large_fp8_scaled.safetensors',
		'sd_xl_base_1.0.safetensors',
		'sd_xl_turbo_1.0_fp16.safetensors',
		'FLUX1/flux1-dev-Q8_0.gguf',
		'PixArt-Sigma-XL-2-2K-MS.pth',
		'hidream_i1_fast_fp8.safetensors',
		'VerusVision_1.0b_Transformer_fp8.safetensors',
		'control-lora-recolor-rank256.safetensors',
		'RealESRGAN_x4plus.pth',
		'RealESRGAN_x2.pth',
		'FreeUpscaling',
		'flux1-fill-dev-Q8_0.gguf'
	]
	for cp_name in checkpoints:
		if f'"{cp_name}"' in raw_workflow_json_string:
			return cp_name
	return None

def py_get_positive_prompt_from_comfy_workflow(raw_workflow_json_string, checkpoint_name):
	if not raw_workflow_json_string or not isinstance(raw_workflow_json_string, str) or not checkpoint_name:
		app.logger.debug("py_get_positive_prompt: Missing raw_workflow_json_string or checkpoint_name.")
		return ""

	workflow_data = None
	try:
		workflow_data = json.loads(raw_workflow_json_string)
	except json.JSONDecodeError:
		app.logger.warning(f"py_get_positive_prompt: Could not decode prompt JSON. Checkpoint was: {checkpoint_name}")
		return ""

	if not isinstance(workflow_data, dict):
		app.logger.debug(f"py_get_positive_prompt: Parsed workflow_data is not a dict. Type: {type(workflow_data)}")
		return ""
	
	positive_prompt = ""
	try:
		if checkpoint_name == 'sd_xl_base_1.0.safetensors':
			positive_prompt = workflow_data.get("6", {}).get("inputs", {}).get("text", "")
		elif checkpoint_name == 'sd3.5_large_fp8_scaled.safetensors':
			positive_prompt = workflow_data.get("6", {}).get("inputs", {}).get("text", "")
		elif checkpoint_name == 'sd_xl_turbo_1.0_fp16.safetensors':
			positive_prompt = workflow_data.get("6", {}).get("inputs", {}).get("text", "")
		elif checkpoint_name == 'FLUX1/flux1-dev-Q8_0.gguf':
			positive_prompt = workflow_data.get("11", {}).get("inputs", {}).get("text", "")
		elif checkpoint_name == 'PixArt-Sigma-XL-2-2K-MS.pth':
			positive_prompt = workflow_data.get("5", {}).get("inputs", {}).get("text", "")
		elif checkpoint_name == 'hidream_i1_fast_fp8.safetensors':
			positive_prompt = workflow_data.get("16", {}).get("inputs", {}).get("text", "")
		elif checkpoint_name == 'VerusVision_1.0b_Transformer_fp8.safetensors':
			positive_prompt = workflow_data.get("6", {}).get("inputs", {}).get("text", "")
		elif checkpoint_name == 'control-lora-recolor-rank256.safetensors':
			positive_prompt = workflow_data.get("3", {}).get("inputs", {}).get("text", "")
		elif checkpoint_name == 'flux1-fill-dev-Q8_0.gguf':
			positive_prompt = workflow_data.get("23", {}).get("inputs", {}).get("text", "")


	except Exception as e:
		app.logger.error(f"Error in py_get_positive_prompt_from_comfy_workflow for {checkpoint_name}: {e}", exc_info=True)
		return ""
	
	return str(positive_prompt).lower() if positive_prompt else ""
# --- End Begin parse workflow functions ---


# --- Server Queue Count ---
@app.route('/api/get-server-queue-count', methods=['GET'])
@login_required
async def get_server_queue_count_endpoint():
	cnt = get_queue_count()
	if cnt < 0:
		return jsonify({"success": False, "error": "Queue count not available.", "queue_count": -1}), 503
	return jsonify({"success": True, "queue_count": cnt})


# --- Unique ID for new prompts ---
@app.route('/api/prompt-unique-id', methods=['GET'])
@login_required
async def get_prompt_unique_id():
	uid = next_prompt_id()
	return jsonify({"success": True, "unique_id": uid})


# --- Upload image ---
@app.route('/api/upload-image', methods=['POST'])
@login_required
async def upload_editor_image():
	app.logger.info("--- Editor Image Upload Endpoint Called ---")

	files = await request.files
	if 'imageFile' not in files:
		app.logger.warning("No imageFile part in request.files")
		return jsonify({"success": False, "error": "No image file part in the request"}), 400
	file = files['imageFile']

	if file.filename == '':
		app.logger.warning("No selected file for upload.")
		return jsonify({"success": False, "error": "No selected file"}), 400

	allowed_extensions = {'png', 'jpg', 'jpeg'}
	original_filename = secure_filename(file.filename)
	file_ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''

	if not file_ext or file_ext not in allowed_extensions:
		app.logger.warning(f"Invalid file type uploaded: {original_filename} (ext: {file_ext})")
		return jsonify({"success": False, "error": "Invalid file type. Only JPG, JPEG, PNG allowed."}), 400

	user_gallery_dir = os.path.join(GALLERY_BASE_DIR, str(current_user.username))
	os.makedirs(user_gallery_dir, exist_ok=True)

	new_filename_base = "upload"
	i = 0

	try:
		existing_files_in_gallery = os.listdir(user_gallery_dir)
	except OSError:
		app.logger.error(f"Could not list directory: {user_gallery_dir}")
		existing_files_in_gallery = []

	existing_upload_files = [
		f for f in existing_files_in_gallery 
		if f.lower().startswith(new_filename_base) and f.lower().endswith(f".{file_ext}")
	]

	upload_numbers = []
	for f_name in existing_upload_files:
		match = re.match(rf"{new_filename_base}(\d+)\.{re.escape(file_ext)}", f_name, re.IGNORECASE)
		if match:
			try:
				upload_numbers.append(int(match.group(1)))
			except ValueError:
				pass

	if upload_numbers:
		i = max(upload_numbers) + 1
	
	final_new_filename = f"{new_filename_base}{i}.{file_ext}"
	
	final_filename_to_save = final_new_filename

	final_filepath = os.path.join(user_gallery_dir, final_filename_to_save)

	try:
		await file.save(final_filepath)
		app.logger.info(f"Successfully saved editor image: {final_filepath} for user {current_user.username}")
		return jsonify({"success": True, "filename": final_filename_to_save})
	except Exception as e:
		app.logger.error(f"Error saving editor image {final_filepath}: {e}", exc_info=True)
		return jsonify({"success": False, "error": "Server error while saving the file."}), 500
	

# --- Error Handlers ---
@app.errorhandler(413)
async def request_entity_too_large(error):
	app.logger.warning(f"Upload failed: File too large (413). Limit is {app.config.get('MAX_CONTENT_LENGTH') / (1024*1024)}MB.")
	return jsonify(success=False, error="File is too large. Please upload a file smaller than {}MB.".format(app.config.get('MAX_CONTENT_LENGTH') // (1024*1024)), limit=app.config.get('MAX_CONTENT_LENGTH') // (1024*1024)), 413

@app.errorhandler(401)
async def _redirect_unauthorized(e):
	return redirect(url_for('login'))

# --- End of Error Handlers ---


# --- ComfyUI Proxy ---
@app.route('/cui/', defaults={'path': ''}, methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
@app.route('/cui/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
@login_required
async def proxy_to_comfy(path):
	if path == '' and current_user.username not in privileged_users:
		return redirect(url_for('home'))
	suffix = request.full_path[len('/cui'):]
	target = f"{MONITOR_SERVER_BASE_URL}{suffix}"
	HOP_BY_HOP = {
		'connection','keep-alive','proxy-authenticate',
		'proxy-authorization','te','trailers',
		'transfer-encoding','upgrade'
	}

	forward_headers = {
		k:v for k,v in request.headers.items()
		if k.lower() not in HOP_BY_HOP
	}

	async with httpx.AsyncClient() as client:
		resp = await client.request(
			request.method,
			target,
			headers=forward_headers,
			content=await request.get_data(),
			timeout=300.0
		)

	response_headers = [
		(k,v) for k,v in resp.headers.items()
		if k.lower() not in HOP_BY_HOP
	]
	return Response(resp.content, status=resp.status_code, headers=response_headers)

@app.websocket('/cui/ws')
@login_required
async def proxy_ws():
    qs  = websocket.scope["query_string"].decode()
    uri = MONITOR_SERVER_WS_URL + (f"?{qs}" if qs else "")
    extra = [("Cookie", websocket.headers["cookie"])] if "cookie" in websocket.headers else None

    async with websockets.connect(uri) as backend_ws:
        async def front_to_back():
            try:
                while True:
                    msg = await websocket.receive()
                    await backend_ws.send(msg)
            except:
                pass

        async def back_to_front():
            try:
                async for msg in backend_ws:
                    await websocket.send(msg)
            except:
                pass

        await asyncio.gather(front_to_back(), back_to_front())

@app.route('/kjweb_async/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
async def proxy_kjweb_async(path):
	backend_path = f"/kjweb_async/{path}"
	qs = request.query_string.decode()
	target = f"{MONITOR_SERVER_BASE_URL}{backend_path}" + (f"?{qs}" if qs else "")
	async with httpx.AsyncClient() as client:
		resp = await client.request(
			request.method,
			target,
			headers={k:v for k,v in request.headers.items() if k.lower()!="host"},
			content=await request.get_data(),
			timeout=120.0
		)
	return Response(resp.content, status=resp.status_code, headers=resp.headers.items())

# --- End of ComfyUI Proxy ---


# --- Background Queue Monitor Threading ---
_monitor_started = False
def _ensure_monitor():
	global _monitor_started
	if not _monitor_started:
		threading.Thread(target=background_queue_monitor_logic, daemon=True).start()
		_monitor_started = True

_ensure_monitor()


# --- General route to serve files in all other directories ---
@app.route("/<path:directory>/<filename>")
@login_required
async def serve_file(directory, filename):
	directory_path = os.path.join(".", directory)
	if not os.path.exists(directory_path):
		return f"<h1>Directory {directory} not found</h1>", 404

	return await send_from_directory(directory_path, filename)


# --- Main entry point for the application ---
if __name__ == "__main__":
	_ensure_monitor()
	uvicorn.run(
		"app:app",
		host="192.168.236.84",
		port=5173,
		workers=4,
		log_level="info",
		proxy_headers=True,
		forwarded_allow_ips="*"
	)
