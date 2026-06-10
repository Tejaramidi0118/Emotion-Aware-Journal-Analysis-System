import smtplib

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import settings


def send_email(
    recipient_email: str,
    subject: str,
    html_content: str
):

    sender_email = settings.EMAIL_ADDRESS
    sender_password = settings.EMAIL_APP_PASSWORD

    message = MIMEMultipart()

    message["From"] = sender_email
    message["To"] = recipient_email
    message["Subject"] = subject

    message.attach(
        MIMEText(
            html_content,
            "html"
        )
    )

    server = smtplib.SMTP(
        "smtp.gmail.com",
        587
    )

    server.starttls()

    server.login(
        sender_email,
        sender_password
    )

    server.send_message(
        message
    )

    server.quit()


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