from werkzeug.middleware.proxy_fix import ProxyFix
from flask import Flask, send_from_directory, render_template_string
from flask_cors import CORS
import os
import datetime

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_host=1, x_proto=1)
CORS(app)  # Enable CORS for all routes

# Route to serve the main HTML file
@app.route("/")
def home():
    return send_from_directory(".", "index.html")  # Serve index.html from the current directory

# Gallery-specific route: Apache-style directory listings and file serving
@app.route("/gallery/<path:subpath>/")
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
        # Serve the requested file
        directory, filename = os.path.split(full_path)
        return send_from_directory(directory, filename)

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
