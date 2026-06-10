import requests


from app.config import settings


def send_email(
    recipient_email: str,
    subject: str,
    html_content: str
):

    response = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "from": "onboarding@resend.dev",
            "to": [recipient_email],
            "subject": subject,
            "html": html_content
        }
    )

    print("Resend Status:", response.status_code)
    print("Resend Response:", response.text)

    response.raise_for_status()
def send_signup_otp(
    email: str,
    otp: str
):

    html = f"""
    <div style="font-family:Arial;padding:20px">

        <h2>Welcome to EchoMind 🎉</h2>

        <p>
        Thank you for creating an account.
        </p>

        <p>
        Use the verification code below:
        </p>

        <h1 style="color:#2563eb">
            {otp}
        </h1>

        <p>
        This code expires in
        <b>10 minutes</b>.
        </p>

        <p>
        If you did not create an account,
        please ignore this email.
        </p>

        <hr>

        <p>
        EchoMind Team
        </p>

    </div>
    """

    send_email(
        email,
        "Verify Your EchoMind Account",
        html
    )


def send_password_reset_otp(
    email: str,
    otp: str
):

    html = f"""
    <div style="font-family:Arial;padding:20px">

        <h2>Password Reset Request 🔒</h2>

        <p>
        We received a request
        to reset your password.
        </p>

        <p>
        Use this OTP:
        </p>

        <h1 style="color:#dc2626">
            {otp}
        </h1>

        <p>
        This code expires in
        <b>10 minutes</b>.
        </p>

        <p>
        If you did not request
        a password reset,
        you can safely ignore this email.
        </p>

        <hr>

        <p>
        EchoMind Security Team
        </p>

    </div>
    """

    send_email(
        email,
        "Reset Your EchoMind Password",
        html
    )