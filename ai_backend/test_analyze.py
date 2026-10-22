import httpx, pathlib, json, sys

file_path = r"C:\\Users\\Pram Singh\\.gemini\\antigravity\\scratch\\ai-medical-report-explainer\\ai_backend\\demo reports\\demo-1.png"

with open(file_path, "rb") as f:
    files = {"file": (pathlib.Path(file_path).name, f, "image/png")}
    try:
        r = httpx.post("http://127.0.0.1:8000/analyze", files=files, timeout=30.0)
        print("Status:", r.status_code)
        print("Response:")
        print(r.text)
    except Exception as e:
        print("Error:", e)
