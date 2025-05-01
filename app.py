from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.routing import BaseConverter
from werkzeug.utils import secure_filename
import json
from urllib.parse import quote, unquote
from PIL import Image
from flask import Flask, send_from_directory, render_template_string, redirect, request, jsonify, url_for, render_template
from flask_cors import CORS
import os
import datetime
import io
import ldap3
from ldap3.utils.log import set_library_log_detail_level, BASIC
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_ldap3_login import LDAP3LoginManager
import ssl
import logging

logging.getLogger('ldap3').setLevel(logging.DEBUG)

app = Flask(__name__, template_folder='.')
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_host=1, x_proto=1)
CORS(app)
app.logger.setLevel(logging.DEBUG)

class RegexConverter(BaseConverter):
    def __init__(self, url_map, *items):
        super(RegexConverter, self).__init__(url_map)
        self.regex = items[0]


app.url_map.converters['regex'] = RegexConverter

# --- Konfiguracja LDAP ---
app.config['LDAP_HOST'] = 'kpi.kul.pl'
app.config['LDAP_PORT'] = 636
app.config['LDAP_USE_SSL'] = True
app.config['LDAP_BASE_DN'] = 'dc=kpi,dc=kul,dc=pl'

app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'temporary_secret_key')

#cert_path = '/etc/ssl/certs/ca-certificates.crt'
#ca_cert_path = os.environ.get('LDAP_CA_CERTS_FILE', cert_path)
#app.config['LDAP_TLS_CA_CERTS_FILE'] = ca_cert_path

app.config['LDAP_TLS_REQUIRE_CERT'] = ssl.CERT_NONE

#app.config['LDAP_USER_DN'] = os.environ.get('LDAP_USER_DN', 'ou=Users,dc=kpi,dc=kul,dc=pl')
app.config['LDAP_USER_DN'] = 'ou=Users,dc=kpi,dc=kul,dc=pl'
app.config['LDAP_USER_RDN_ATTR'] = 'uid'
app.config['LDAP_USER_LOGIN_ATTR'] = 'uid'
app.config['LDAP_USER_FULLNAME_ATTR'] = os.environ.get('LDAP_USER_FULLNAME_ATTR', 'cn')
#app.config['LDAP_BIND_USER_DN'] = os.environ.get('LDAP_BIND_USER_DN', None)
#app.config['LDAP_BIND_USER_PASSWORD'] = os.environ.get('LDAP_BIND_USER_PASSWORD', None)
#app.config['LDAP_USER_SEARCH_FILTER'] = '(uid=%s)'
#app.config['LDAP_GET_USER_ATTRIBUTES'] = ['dn']
#app.config['LDAP_AUTHENTICATION_METHOD'] = 'SIMPLE'
#app.config['LDAP_SEARCH_SCOPE'] = 'SUBTREE'

#app.config['LDAP_GROUP_OBJECT_FILTER'] = '(objectClass=posixGroup)'
#app.config['LDAP_GROUP_MEMBER_ATTR'] = 'memberUid'
#app.config['LDAP_GROUP_DN'] = os.environ.get('LDAP_GROUP_DN', 'ou=Groups,dc=kpi,dc=kul,dc=pl')
#app.config['LDAP_GROUP_DN'] = 'ou=Groups,dc=kpi,dc=kul,dc=pl'

ldap_manager = LDAP3LoginManager(app)

login_manager = LoginManager(app)
login_manager.login_view = "login"

class User(UserMixin):
    def __init__(self, dn, username, data):
        self.dn = dn
        self.username = username
        self.data = data

    def get_id(self):
        return self.dn

    def get_fullname(self):
        return self.data.get(app.config['LDAP_USER_FULLNAME_ATTR'], [self.username])[0]

# --- Funkcje obsługi użytkownika ---
@login_manager.user_loader
def load_user(user_id):
    """Ładuje użytkownika na podstawie DN zapisanego w sesji."""
    app.logger.debug(f"--- user_loader called with user_id (DN): {user_id} ---")
    conn = None
    try:
        tls_config = ldap3.Tls(validate=ssl.CERT_NONE, version=ssl.PROTOCOL_TLSv1_2)

        server = ldap3.Server(
            app.config['LDAP_HOST'],
            port=app.config['LDAP_PORT'],
            use_ssl=app.config['LDAP_USE_SSL'],
            tls=tls_config
        )

        conn = ldap3.Connection(server, auto_bind=True)
        app.logger.debug(f"user_loader: Connected to LDAP anonymously (or with default bind). Bound: {conn.bound}")

        search_base = app.config['LDAP_BASE_DN']
        search_filter = f"(objectClass=*)"
        attributes_to_get = [app.config['LDAP_USER_FULLNAME_ATTR'], app.config['LDAP_USER_LOGIN_ATTR']]

        if conn.search(search_base=user_id,
                       search_filter=search_filter,
                       search_scope=ldap3.BASE,
                       attributes=attributes_to_get):

            if len(conn.entries) == 1:
                entry = conn.entries[0]
                app.logger.debug(f"user_loader: User entry found: {entry.entry_dn}")
                app.logger.debug(f"user_loader: User attributes: {entry.entry_attributes_as_dict}")

                user_data = {k: v[0] for k, v in entry.entry_attributes_as_dict.items() if v}

                username = user_data.get(app.config['LDAP_USER_LOGIN_ATTR'], None)
                if username:
                    user = User(dn=entry.entry_dn, username=username, data=user_data)
                    app.logger.info(f"user_loader: Successfully loaded user {username}")
                    return user
                else:
                     app.logger.error(f"user_loader: Login attribute '{app.config['LDAP_USER_LOGIN_ATTR']}' not found in LDAP entry for DN {user_id}")
                     return None
            else:
                app.logger.warning(f"user_loader: Search returned {len(conn.entries)} entries for DN '{user_id}'. Expected 1.")
                return None
        else:
            app.logger.error(f"user_loader: Search failed for DN '{user_id}'. Result: {conn.result}")
            return None

    except ldap3.core.exceptions.LDAPException as e:
        app.logger.error(f"user_loader: LDAPException loading user {user_id}: {e}", exc_info=True)
        return None
    except Exception as e:
         app.logger.error(f"user_loader: Non-LDAP Exception loading user {user_id}: {e}", exc_info=True)
         return None
    finally:
        if conn and conn.bound:
            conn.unbind()
        app.logger.debug(f"--- user_loader finished for user_id: {user_id} ---")

LOGIN_TEMPLATE = """
<!DOCTYPE html>
<html>
<head><title>Login</title></head>
<body>
    <h2>Login</h2>
    {% if error %}
        <p style="color:red;">{{ error }}</p>
    {% endif %}
    <form method="post">
        Username: <input type="text" name="username" required><br>
        Password: <input type="password" name="password" required><br>
        <button type="submit">Login</button>
    </form>
</body>
</html>
"""

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('home'))

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        app.logger.info(f"Attempting login for user: {username}")

        if not username or not password:
            app.logger.warning("Login attempt with missing username or password.")
            return render_template_string(LOGIN_TEMPLATE, error="Missing username or password")

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
                        app.logger.debug(f"Manual Auth: User entry found: {entry.entry_dn}")
                        app.logger.debug(f"Manual Auth: User attributes: {entry.entry_attributes_as_dict}")

                        user_data = {k: v[0] for k, v in entry.entry_attributes_as_dict.items() if v}

                        user = User(dn=entry.entry_dn, username=username, data=user_data)
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
                        return render_template_string(LOGIN_TEMPLATE, error="Login failed: Could not uniquely identify user.")
                else:
                    app.logger.error(f"Manual Auth: Search failed after successful bind. Filter='{search_filter}'. Result: {conn.result}")
                    return render_template_string(LOGIN_TEMPLATE, error="Login failed: Could not retrieve user data.")

            else:
                app.logger.warning(f"Manual Auth: Bind FAILED for DN: {user_dn}. Result: {conn.result}")
                if conn.result and conn.result.get('result') == 49:
                    return render_template_string(LOGIN_TEMPLATE, error="Invalid username or password")
                else:
                    return render_template_string(LOGIN_TEMPLATE, error="LDAP bind failed (not invalid credentials).")

        except ldap3.core.exceptions.LDAPException as e:
            app.logger.error(f"Manual Auth: LDAPException during manual authentication: {e}", exc_info=True)
            return render_template_string(LOGIN_TEMPLATE, error="An LDAP error occurred during login.")
        except Exception as e:
             app.logger.error(f"Manual Auth: Non-LDAP Exception during manual authentication: {e}", exc_info=True)
             return render_template_string(LOGIN_TEMPLATE, error="An unexpected error occurred during login.")
        finally:
            if conn and conn.bound:
                conn.unbind()
            app.logger.debug("--- Finished Manual LDAP Authentication ---")

    return render_template_string(LOGIN_TEMPLATE)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    app.logger.info("User logged out.")
    return redirect(url_for('login'))

GALLERY_BASE_DIR = "gallery"
THUMBNAIL_SUBDIR = "thumbnails"
THUMBNAIL_WIDTH = 200
THUMBNAIL_FORMAT = "JPEG"
THUMBNAIL_QUALITY = 85

# --- Helper function dla Manifestu ---
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

# --- Endpoint generujący manifest IIIF ---
@app.route('/api/iiif-manifest', endpoint='generate_iiif_manifest')
@login_required
def generate_iiif_manifest():
    uid = request.args.get('uid')
    limit_str = request.args.get('limit')
    limit = None
    if limit_str:
        try:
            limit = int(limit_str)
            if limit <= 0:
                limit = None
        except ValueError:
            limit = None

    if not uid:
        return jsonify({"error": "Missing 'uid' parameter"}), 400

    user_gallery_path = os.path.join(GALLERY_BASE_DIR, str(uid))
    image_files = get_image_files(user_gallery_path)

    if limit is not None and len(image_files) > limit:
        image_files = image_files[:limit]

    if not image_files:
        return jsonify({"error": f"No images found or directory not accessible for uid {uid}"}), 404
    
    base_url_dynamic = request.host_url.rstrip('/')

    manifest_id = url_for('generate_iiif_manifest', uid=uid, _external=True)

    gallery_base_url = f"{base_url_dynamic}/gallery/"
    thumbnail_base_url = f"{base_url_dynamic}/thumbnails/"

    # --- Budowanie struktury manifestu IIIF ---
    manifest = {
        "@context": "http://iiif.io/api/presentation/2/context.json",
        "@id": manifest_id,
        "@type": "sc:Manifest",
        "label": f"Gallery for User {uid}" + (f" (Last {limit})" if limit else ""),
        "sequences": [
            {
                "@id": f"{manifest_id}/sequence/normal",
                "@type": "sc:Sequence",
                "label": "Default order",
                "canvases": []
            }
        ]
    }
    if image_files:
        app.logger.debug(f"Found {len(image_files)} images for manifest (UID: {uid}).")
        if limit is not None and len(image_files) > limit:
            image_files = image_files[:limit]

        for i, filename in enumerate(image_files):
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
                }
            }
            manifest["sequences"][0]["canvases"].append(canvas)

    else:
        app.logger.info(f"No images found for manifest (UID: {uid}). Returning empty manifest.")
        
    return jsonify(manifest)

# Route to render the main HTML file
@app.route("/")
@login_required
def home():
   return render_template("index.html", username=current_user.username)


#@app.route('/gallery/<regex("([0-9]+(\/[^\/])*)?[^\/]$"):subpath>')
@app.route('/gallery/<path:subpath>')
@login_required
def handle_gallery_file(subpath):
    app.logger.debug(f"--- Handling gallery ORIGINAL file request ---")
    decoded_subpath = unquote(subpath) # np. "0/plik.png"
    app.logger.debug(f"Decoded subpath for original: {decoded_subpath}")

    # Zbuduj ścieżkę do oryginalnego pliku
    original_path = os.path.join(GALLERY_BASE_DIR, decoded_subpath)

    if os.path.isfile(original_path):
        directory, filename = os.path.split(original_path)
        app.logger.debug(f"Serving original file: {original_path}")
        return send_from_directory(directory, filename)
    else:
        app.logger.warning(f"Original file not found at: {original_path}")
        return "File not found", 404

# Trasa dla MINIATUR
# Regex pasujący tylko do "uid/thumbnails/filename"
#@app.route('/gallery/<regex("^([0-9]+/thumbnails/[^/]+)$"):subpath>')
@app.route('/thumbnails/<path:subpath>')
#@app.route('/thumbnails/<regex("([0-9]+(\/[^\/])*)?[^\/$"):subpath>')
@login_required
def handle_thumbnail(subpath):
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
        return send_from_directory(thumbnail_dir, filename)

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
        return send_from_directory(thumbnail_dir, filename)
    except Exception as e:
        app.logger.error(f"Error during thumbnail generation for {original_path}: {e}")
        return "Error generating thumbnail", 500

#@app.route('/gallery/<path:subpath>/')
@app.route('/gallery/<regex("([0-9]+(\/[^\/])*)?[^\/]$"):subpath>/')
@login_required
def handle_gallery(subpath):
    full_path = os.path.join("gallery", subpath)

    if os.path.isdir(full_path):
        # List files in the directory
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
        return render_template_string(html_content, subpath=subpath)

    elif os.path.isfile(full_path):
        return redirect("/gallery/"+subpath)

    else:
        # Path does not exist
        return f"<h1>Path {subpath} not found</h1>", 404

# General route to serve files in all other directories
@app.route("/<path:directory>/<filename>")
@login_required
def serve_file(directory, filename):
    directory_path = os.path.join(".", directory)
    if not os.path.exists(directory_path):
        return f"<h1>Directory {directory} not found</h1>", 404

    return send_from_directory(directory_path, filename)


if __name__ == "__main__":
    app.run(host='192.168.236.84',port=5173,debug=True)
