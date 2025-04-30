from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.routing import BaseConverter
import json
from urllib.parse import quote
from PIL import Image
from flask import Flask, send_from_directory, render_template_string, redirect, request, jsonify, url_for
from flask_cors import CORS
import os
import datetime

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_host=1, x_proto=1)
CORS(app)

class RegexConverter(BaseConverter):
    def __init__(self, url_map, *items):
        super(RegexConverter, self).__init__(url_map)
        self.regex = items[0]


app.url_map.converters['regex'] = RegexConverter

GALLERY_BASE_DIR = "gallery"

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

    canvas_base_id = f"{manifest_id}/canvas/"
    image_base_url = f"{base_url_dynamic}/gallery/{uid}/"

    for i, filename in enumerate(image_files):
        img_width, img_height = 100, 100
        try:
            with Image.open(os.path.join(user_gallery_path, filename)) as img:
                img_width, img_height = img.size
        except Exception as e:
            app.logger.warning(f"Could not read dimensions for {filename} (UID: {uid}): {e}")

        canvas_id = f"{canvas_base_id}canvas-{i}"
        image_url = f"{image_base_url}{quote(filename)}"

        image_resource = {
            "@id": image_url,
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
            ]
        }
        manifest["sequences"][0]["canvases"].append(canvas)

    return jsonify(manifest)

# Route to serve the main HTML file
@app.route("/")
def home():
    return send_from_directory(".", "index.html")  # Serve index.html from the current directory

# Gallery-specific route: Apache-style directory listings and file serving
@app.route('/gallery/<regex("([0-9]+(\/[^\/])*)?[^\/]$"):subpath>')
def handle_gallery_file(subpath):
    full_path = os.path.join("gallery", subpath)

    if os.path.isfile(full_path):
        # Serve the requested file
        directory, filename = os.path.split(full_path)
        return send_from_directory(directory, filename)

    elif os.path.isdir(full_path):
        return redirect("/gallery/"+subpath+"/")

    else:
        # Path does not exist
        return f"<h1>Path {subpath} not found</h1>", 404

#@app.route('/gallery/<path:subpath>/')
@app.route('/gallery/<regex("([0-9]+(\/[^\/])*)?[^\/]$"):subpath>/')
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
def serve_file(directory, filename):
    directory_path = os.path.join(".", directory)
    if not os.path.exists(directory_path):
        return f"<h1>Directory {directory} not found</h1>", 404

    return send_from_directory(directory_path, filename)


if __name__ == "__main__":
    app.run(host='192.168.236.84',port=5173)
