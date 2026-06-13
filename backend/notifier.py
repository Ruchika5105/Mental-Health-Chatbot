# backend/notifier.py
import os
import smtplib
import logging
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

logger = logging.getLogger(__name__)

# ── Indian SMS via Fast2SMS ───────────────────────────────────────────────────

def send_sms(to_phone: str, student_name: str) -> bool:
    if not to_phone or not to_phone.strip():
        print("DEBUG SMS: No phone number — skipping")
        return False

    api_key = os.getenv("FAST2SMS_API_KEY")
    if not api_key:
        print("DEBUG SMS: FAST2SMS_API_KEY missing in .env")
        return False

    # Clean phone number — Fast2SMS needs 10 digits only
    phone = to_phone.strip()
    for prefix in ["+91", "91"]:
        if phone.startswith(prefix):
            phone = phone[len(prefix):]
            break
    phone = phone.replace(" ", "").replace("-", "")

    if len(phone) != 10 or not phone.isdigit():
        print(f"DEBUG SMS: Invalid number after cleaning: '{phone}'")
        return False

    message = (
        f"URGENT Maia Alert: {student_name} may need immediate support. "
        f"Please check on them now. iCall: 9152987821"
    )

    print(f"DEBUG SMS: Sending to {phone} via Fast2SMS")
    print(f"DEBUG SMS: API key starts with: {api_key[:8]}...")

    # Try DLT route first (most reliable for India)
    try:
        response = requests.post(
            "https://www.fast2sms.com/dev/bulkV2",
            headers={"authorization": api_key},
            json={
                "route":    "v3",
                "sender_id": "FSTSMS",
                "message":  message,
                "language": "english",
                "flash":    0,
                "numbers":  phone
            },
            timeout=15
        )
        print(f"DEBUG SMS: Status code = {response.status_code}")
        print(f"DEBUG SMS: Raw response = {response.text}")

        result = response.json()
        if result.get("return") is True:
            print(f"DEBUG SMS: Success!")
            return True
        else:
            print(f"DEBUG SMS: Route v3 failed: {result}")
            # Try quick route as fallback
            return _try_quick_route(api_key, phone, message)

    except Exception as e:
        print(f"DEBUG SMS: Exception — {type(e).__name__}: {e}")
        return False


def _try_quick_route(api_key: str, phone: str, message: str) -> bool:
    """Fallback to quick route if v3 fails."""
    try:
        print("DEBUG SMS: Trying quick route as fallback...")
        response = requests.post(
            "https://www.fast2sms.com/dev/bulkV2",
            headers={"authorization": api_key},
            json={
                "route":    "q",
                "message":  message,
                "language": "english",
                "flash":    0,
                "numbers":  phone
            },
            timeout=15
        )
        print(f"DEBUG SMS: Quick route response = {response.text}")
        result = response.json()
        if result.get("return") is True:
            print("DEBUG SMS: Quick route success!")
            return True
        print(f"DEBUG SMS: Quick route also failed: {result}")
        return False
    except Exception as e:
        print(f"DEBUG SMS: Quick route exception — {e}")
        return False


# ── Email via Gmail SMTP ──────────────────────────────────────────────────────

def send_email(to_email: str, student_name: str) -> bool:
    """Send email alert via Gmail SMTP."""
    if not to_email or not to_email.strip():
        print("DEBUG EMAIL: No email — skipping")
        return False

    from_addr = os.getenv("ALERT_EMAIL_FROM")
    password  = os.getenv("ALERT_EMAIL_PASSWORD")

    if not from_addr or not password:
        print("DEBUG EMAIL: Gmail credentials missing in .env")
        return False

    print(f"DEBUG EMAIL: Sending to {to_email} from {from_addr}")

    try:
        msg            = MIMEMultipart("alternative")
        msg["Subject"] = f"URGENT: {student_name} may need immediate support"
        msg["From"]    = from_addr
        msg["To"]      = to_email

        html = f"""
        <html>
        <body style="font-family:Arial,sans-serif;max-width:580px;margin:auto;padding:20px">

          <div style="background:#dc2626;color:white;padding:20px;
                      border-radius:10px 10px 0 0;text-align:center">
            <h2 style="margin:0;font-size:20px">🚨 Urgent Mental Health Alert</h2>
            <p style="margin:6px 0 0;font-size:13px;opacity:0.9">Maia Student Support App</p>
          </div>

          <div style="background:#fef2f2;padding:24px;
                      border:1px solid #fca5a5;border-radius:0 0 10px 10px">

            <p style="font-size:15px;color:#111827;margin:0 0 16px">
              This is an automated emergency alert from the Maia mental health app.
            </p>

            <div style="background:#fff;border-left:4px solid #dc2626;
                        padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:20px">
              <p style="margin:0;font-size:15px;color:#374151">
                <strong>{student_name}</strong> may be experiencing a mental health
                crisis and needs your support right now.
              </p>
            </div>

            <p style="font-size:14px;color:#374151;font-weight:600;margin:0 0 8px">
              Please take these steps immediately:
            </p>
            <ol style="font-size:14px;color:#374151;margin:0 0 20px;padding-left:20px">
              <li style="margin-bottom:6px">Contact {student_name} immediately by phone or in person</li>
              <li style="margin-bottom:6px">If you cannot reach them, go to their location</li>
              <li style="margin-bottom:6px">If there is immediate danger, call <strong>112</strong></li>
            </ol>

            <div style="background:#fff3cd;border:1px solid #ffc107;
                        border-radius:8px;padding:14px;margin-bottom:20px">
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#856404">
                Crisis helplines (India):
              </p>
              <p style="margin:0;font-size:13px;color:#856404">
                📞 iCall: <strong>9152987821</strong><br/>
                📞 Vandrevala Foundation: <strong>1860-2662-345</strong><br/>
                📞 Emergency services: <strong>112</strong>
              </p>
            </div>

            <hr style="border:none;border-top:1px solid #fca5a5;margin:20px 0"/>

            <p style="font-size:11px;color:#9ca3af;margin:0">
              This alert was sent on {datetime.now().strftime('%d %B %Y at %I:%M %p')}
              with {student_name}'s prior consent during app onboarding.
              You are receiving this because you were listed as their emergency contact.
            </p>
          </div>

        </body>
        </html>"""

        msg.attach(MIMEText(html, "html"))

        print("DEBUG EMAIL: Connecting to Gmail SMTP...")
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(from_addr, password)
            server.sendmail(from_addr, to_email, msg.as_string())

        print(f"DEBUG EMAIL: Success — sent to {to_email}")
        return True

    except smtplib.SMTPAuthenticationError:
        print("DEBUG EMAIL: Authentication failed.")
        print("DEBUG EMAIL: Use Gmail App Password, not your real password.")
        print("DEBUG EMAIL: Google Account → Security → 2FA → App Passwords")
        return False
    except Exception as e:
        print(f"DEBUG EMAIL: Error — {type(e).__name__}: {e}")
        return False


# ── WhatsApp via WhatsApp Business API (optional) ────────────────────────────

def send_whatsapp(to_phone: str, student_name: str) -> bool:
    """
    Optional: Send WhatsApp alert via CallMeBot (free, no account needed).
    Setup: wa.me/+34644597188?text=I allow callmebot to send me messages
    Then get your API key from the bot.
    """
    api_key = os.getenv("CALLMEBOT_API_KEY")
    if not api_key:
        return False

    phone = to_phone.strip().replace("+", "").replace(" ", "")
    message = (
        f"URGENT - Maia Alert: {student_name} may need immediate support. "
        f"Please check on them now. iCall: 9152987821"
    )

    try:
        response = requests.get(
            "https://api.callmebot.com/whatsapp.php",
            params={
                "phone":   phone,
                "text":    message,
                "apikey":  api_key
            },
            timeout=10
        )
        success = response.status_code == 200
        print(f"DEBUG WHATSAPP: {'Success' if success else 'Failed'}")
        return success
    except Exception as e:
        print(f"DEBUG WHATSAPP: Error — {e}")
        return False


# ── Main notify function ──────────────────────────────────────────────────────

def notify(student_name: str, phone: str, email: str) -> dict:
    print(f"\n{'='*50}")
    print(f"DEBUG NOTIFY: Crisis alert for {student_name}")
    print(f"DEBUG NOTIFY: Phone='{phone}' Email='{email}'")
    print(f"{'='*50}")

    # Try SMS (Fast2SMS)
    sms_ok = False
    if phone and phone.strip():
        sms_ok = send_sms(phone, student_name)
    else:
        print("DEBUG NOTIFY: No phone number — skipping SMS")

    # Try WhatsApp (CallMeBot) as SMS backup
    whatsapp_ok = False
    if not sms_ok and phone and phone.strip():
        whatsapp_ok = send_whatsapp(phone, student_name)

    # Try email (Gmail)
    email_ok = False
    if email and email.strip():
        email_ok = send_email(email, student_name)
    else:
        print("DEBUG NOTIFY: No email — skipping email")

    result = {
        "sms_sent":       sms_ok or whatsapp_ok,
        "email_sent":     email_ok,
        "whatsapp_sent":  whatsapp_ok,
        "success":        sms_ok or whatsapp_ok or email_ok
    }

    print(f"\nDEBUG NOTIFY: Final result = {result}")
    print(f"{'='*50}\n")
    return result