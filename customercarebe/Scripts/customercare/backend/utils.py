from django.core.mail import EmailMessage

class Util:
    @staticmethod
    def send_email(data):
        email = EmailMessage(
            subject=data['email_subject'],
            body=data['email_body'],
            to=[data['to_email']],
        )
        email.send()

import requests

def send_expo_push_notification(token, title, body):
    message = {
        "to": token,
        "sound": "default",
        "title": title,
        "body": body,
    }
    headers = {
        "Content-Type": "application/json",
    }
    return requests.post("https://exp.host/--/api/v2/push/send", json=message, headers=headers)
