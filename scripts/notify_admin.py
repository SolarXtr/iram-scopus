import requests
import os
import json

# Fetch credentials from Environment Variables (GitHub Secrets)
CHANNEL_ACCESS_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN")
ADMIN_USER_ID = os.environ.get("LINE_ADMIN_USER_ID") 

MESSAGE = (
    "⚠️ [iRAM System Reminder]\n"
    "ถึงเวลาอัปเดตข้อมูล Scopus ประจำรอบ 15 วันแล้วครับ\n"
    "รบกวน Admin รันสคริปต์ `fetch_data.py` ในเครือข่าย มน. ครับ"
)

def send_notification():
    if not CHANNEL_ACCESS_TOKEN or not ADMIN_USER_ID:
        print("Error: Missing LINE API credentials.")
        return

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {CHANNEL_ACCESS_TOKEN}"
    }

    payload = {
        "to": ADMIN_USER_ID,
        "messages": [
            {
                "type": "text",
                "text": MESSAGE
            }
        ]
    }

    response = requests.post("https://api.line.me/v2/bot/message/push", headers=headers, data=json.dumps(payload))
    if response.status_code == 200:
        print("Notification sent successfully!")
    else:
        print(f"Failed to send notification: {response.text}")

if __name__ == "__main__":
    send_notification()
