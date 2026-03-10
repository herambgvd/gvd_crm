"""
Email Service — Send emails using SMTP configuration
"""

import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging
import uuid
from datetime import datetime, timezone, timedelta

from core.database import get_database

logger = logging.getLogger(__name__)


async def get_email_config():
    """Get email configuration from database"""
    db = get_database()
    config = await db.config.find_one({}, {"_id": 0})
    return config


async def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None
) -> bool:
    """
    Send an email using SMTP configuration from database
    Returns True if successful, False otherwise
    """
    try:
        config = await get_email_config()
        
        if not config or not config.get("smtp_host"):
            logger.warning("SMTP not configured. Email not sent.")
            return False
        
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{config.get('smtp_from_name', 'System')} <{config.get('smtp_from_email', config.get('smtp_username'))}>"
        msg["To"] = to_email
        
        # Add text and HTML parts
        if text_content:
            part1 = MIMEText(text_content, "plain")
            msg.attach(part1)
        
        part2 = MIMEText(html_content, "html")
        msg.attach(part2)
        
        # Create SMTP connection
        smtp_port = int(config.get("smtp_port", 587))
        
        if config.get("smtp_use_ssl"):
            context = ssl.create_default_context()
            server = smtplib.SMTP_SSL(config["smtp_host"], smtp_port, context=context)
        else:
            server = smtplib.SMTP(config["smtp_host"], smtp_port)
            if config.get("smtp_use_tls"):
                server.starttls()
        
        server.login(config["smtp_username"], config["smtp_password"])
        server.sendmail(
            config.get("smtp_from_email", config["smtp_username"]),
            to_email,
            msg.as_string()
        )
        server.quit()
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False


async def send_welcome_email(
    user_email: str,
    user_name: str,
    password: str,
    verification_token: Optional[str] = None
) -> bool:
    """
    Send a welcome email to a new user with their credentials
    The email also serves as email verification
    """
    config = await get_email_config()
    platform_name = config.get("platform_name", "Flowops") if config else "Flowops"
    support_email = config.get("support_email", "") if config else ""
    
    # Generate verification URL if token provided
    verification_url = ""
    if verification_token:
        # TODO: Get base URL from config
        verification_url = f"http://localhost:3000/verify-email?token={verification_token}"
    
    subject = f"Welcome to {platform_name} - Your Account Details"
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to {platform_name}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
        <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7fa; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; border-radius: 12px 12px 0 0; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
                                    Welcome to {platform_name}
                                </h1>
                                <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 16px;">
                                    Your account has been created successfully
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                    Hello <strong>{user_name}</strong>,
                                </p>
                                <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 25px;">
                                    We're excited to have you on board! Your account has been set up and you can now access the {platform_name} platform using the credentials below.
                                </p>
                                
                                <!-- Credentials Box -->
                                <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8f9fc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 30px;">
                                    <tr>
                                        <td style="padding: 25px;">
                                            <h3 style="color: #333; margin: 0 0 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                                                Your Login Credentials
                                            </h3>
                                            <table cellpadding="0" cellspacing="0" width="100%">
                                                <tr>
                                                    <td style="padding: 8px 0;">
                                                        <span style="color: #666; font-size: 14px;">Email:</span>
                                                        <span style="color: #333; font-size: 15px; font-weight: 600; margin-left: 10px;">{user_email}</span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0;">
                                                        <span style="color: #666; font-size: 14px;">Password:</span>
                                                        <span style="color: #333; font-size: 15px; font-weight: 600; margin-left: 10px; background-color: #fff3cd; padding: 4px 10px; border-radius: 4px;">{password}</span>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Security Notice -->
                                <div style="background-color: #fff8e6; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 0 8px 8px 0; margin-bottom: 30px;">
                                    <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">
                                        <strong>Security Tip:</strong> For your security, please change your password after your first login.
                                    </p>
                                </div>
                                
                                <!-- CTA Button -->
                                <table cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="center" style="padding: 10px 0 30px;">
                                            <a href="http://localhost:3000/login" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                                                Login to Your Account
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
                                    If you have any questions or need assistance, please don't hesitate to reach out to our support team{f' at <a href="mailto:{support_email}" style="color: #667eea;">{support_email}</a>' if support_email else ''}.
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f8f9fc; padding: 25px 40px; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
                                <p style="color: #888; font-size: 13px; margin: 0; text-align: center;">
                                    This email was sent by {platform_name}.<br>
                                    Please do not reply to this automated message.
                                </p>
                                <p style="color: #999; font-size: 12px; margin: 15px 0 0; text-align: center;">
                                    &copy; {datetime.now().year} {platform_name}. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    text_content = f"""
    Welcome to {platform_name}!
    
    Hello {user_name},
    
    Your account has been created successfully. Here are your login credentials:
    
    Email: {user_email}
    Password: {password}
    
    Please log in at: http://localhost:3000/login
    
    For your security, please change your password after your first login.
    
    If you have any questions, please contact our support team{f' at {support_email}' if support_email else ''}.
    
    Best regards,
    The {platform_name} Team
    """
    
    return await send_email(user_email, subject, html_content, text_content)


async def generate_verification_token(user_id: str) -> str:
    """Generate an email verification token"""
    db = get_database()
    
    token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    
    await db.email_verification_tokens.insert_one({
        "token": token,
        "user_id": user_id,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "used": False
    })
    
    return token


async def verify_email_token(token: str) -> Optional[str]:
    """
    Verify an email token and return the user_id if valid
    Returns None if token is invalid or expired
    """
    db = get_database()
    
    token_doc = await db.email_verification_tokens.find_one({
        "token": token,
        "used": False
    })
    
    if not token_doc:
        return None
    
    # Check if expired
    expires_at = datetime.fromisoformat(token_doc["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        return None
    
    # Mark token as used
    await db.email_verification_tokens.update_one(
        {"token": token},
        {"$set": {"used": True}}
    )
    
    # Mark user email as verified
    user_id = token_doc["user_id"]
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_email_verified": True}}
    )
    
    return user_id
