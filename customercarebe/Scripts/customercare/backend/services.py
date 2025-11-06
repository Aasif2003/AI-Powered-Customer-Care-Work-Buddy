import requests

API_KEY = ''
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}"

def call_gemini_api(user_text):
    headers = {"Content-Type": "application/json"}
    data = {
        "contents": [
            {
                "parts": [{"text": user_text}]
            }
        ]
    }

    response = requests.post(GEMINI_URL, headers=headers, json=data)
    if response.status_code == 200:
        reply = response.json()
        return reply.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
    else:
        return f"Error: {response.status_code}"