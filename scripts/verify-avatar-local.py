"""Local integration check for the trusted avatar upload boundary."""
import json
import shutil
import subprocess
import urllib.error
import urllib.request
import uuid
from pathlib import Path


def call(url, method, headers, body=None):
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, json.loads(response.read())
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read())


status = json.loads(subprocess.check_output([shutil.which("npx.cmd") or "npx", "supabase", "status", "-o", "json"], text=True))
base = status["API_URL"]
anon = status["ANON_KEY"]
service = status["SERVICE_ROLE_KEY"]
email = f"avatar-phase2-{uuid.uuid4()}@example.invalid"
password = str(uuid.uuid4()) + "Aa!"
admin_headers = {"apikey": service, "Authorization": f"Bearer {service}", "Content-Type": "application/json"}
code, user = call(base + "/auth/v1/admin/users", "POST", admin_headers, json.dumps({"email": email, "password": password, "email_confirm": True}).encode())
assert code in (200, 201), (code, user)
user_id = user["id"]
path = None
try:
    code, session = call(base + "/auth/v1/token?grant_type=password", "POST", {"apikey": anon, "Content-Type": "application/json"}, json.dumps({"email": email, "password": password}).encode())
    assert code == 200, (code, session)
    token = session["access_token"]
    boundary = "flukewheel-avatar-check"
    png = (Path(__file__).resolve().parent.parent / "icon.png").read_bytes()

    def upload(data, mime):
        body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"avatar.png\"\r\nContent-Type: {mime}\r\n\r\n".encode() + data + f"\r\n--{boundary}--\r\n".encode())
        return call(base + "/functions/v1/process-avatar", "POST", {"apikey": anon, "Authorization": f"Bearer {token}", "Content-Type": f"multipart/form-data; boundary={boundary}"}, body)

    code, response = upload(png, "image/png")
    assert code == 200 and response.get("code") == "OK", (code, response)
    path = response["path"]
    assert path.startswith(user_id + "/") and path.endswith(".webp")
    code, profile = call(base + f"/rest/v1/profiles?id=eq.{user_id}&select=avatar_path", "GET", {"apikey": service, "Authorization": f"Bearer {service}"})
    assert code == 200 and profile == [{"avatar_path": path}], (code, profile)
    code, bad = upload(b"<svg></svg>", "image/png")
    assert code == 400 and bad.get("code") == "INVALID_IMAGE", (code, bad)
    code, oversized = upload(png + b"0" * 1_048_576, "image/png")
    assert code == 413 and oversized.get("code") == "IMAGE_TOO_LARGE", (code, oversized)
    print("Authenticated PNG upload, profile update, invalid-image and size-limit checks passed.")
finally:
    if path:
        call(base + "/storage/v1/object/avatars/" + path, "DELETE", admin_headers)
    call(base + "/auth/v1/admin/users/" + user_id, "DELETE", admin_headers)
