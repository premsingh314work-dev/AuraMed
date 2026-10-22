import httpx, json, pathlib

# Use the analysis result from the previous /analyze call
analysis = {
    "summary": "All detected parameters are within their normal reference ranges. Your body appears to be functioning well in these tested areas.",
    "parameters": [
        {
            "name": "White Blood Cell Count (WBC)",
            "value": 7.5,
            "unit": "10^3/µL",
            "reference_range": "4.5 - 11.0",
            "status": "normal",
            "explanation": "WBCs are immune system cells that fight infections. Your count is within the healthy range."
        },
        {
            "name": "Serum Creatinine",
            "value": 0.9,
            "unit": "mg/dL",
            "reference_range": "0.6 - 1.2",
            "status": "normal",
            "explanation": "Creatinine is a waste product filtered by the kidneys. A normal value shows healthy kidney filtration."
        }
    ],
    "lifestyle_recommendations": [
        "Maintain your current balanced diet and regular exercise routine.",
        "Schedule your next routine checkup as advised by your primary doctor."
    ]
}

payload = {
    "question": "What does the White Blood Cell Count indicate?",
    "report_data": analysis,
    "chat_history": []
}

try:
    r = httpx.post("http://127.0.0.1:8000/chat", json=payload, timeout=30.0)
    print("Status:", r.status_code)
    print("Response:")
    print(r.text)
except Exception as e:
    print("Error:", e)
