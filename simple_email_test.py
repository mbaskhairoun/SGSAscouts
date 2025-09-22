#!/usr/bin/env python3
"""
Simple MailerSend Email Test

This script tests sending a simple email (no template) using MailerSend API.
"""

import os
import sys
from datetime import datetime

try:
    from mailersend import EmailBuilder, MailerSendClient
    print("[OK] MailerSend package imported successfully")
except ImportError as e:
    print("[ERROR] Error importing MailerSend:")
    print("  Please install it with: pip install mailersend")
    print(f"  Error details: {e}")
    sys.exit(1)

def send_simple_email():
    """Send a simple test email"""

    # Get API token from environment variable
    api_token = os.getenv('MAILERSEND_API_TOKEN')
    if not api_token:
        print("[ERROR] MAILERSEND_API_TOKEN environment variable not set")
        print("  Set it with: set MAILERSEND_API_TOKEN=your_token_here")
        print("  Or edit this script and put your token directly in the code")
        return False

    print(f"[OK] API token found (ends with: ...{api_token[-8:]})")

    try:
        # Initialize MailerSend client
        client = MailerSendClient(api_token)
        print("[OK] MailerSend client initialized")

        # Build email
        email = EmailBuilder()

        # Configure email
        email.from_email("info@sgsascouts.ca", "SGSA Scouts")
        email.to("mbaskhairoun@gmail.com", "Test User")
        email.subject("Simple Test Email from SGSA Scouts")

        # HTML content
        html_content = """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2c5aa0;">Hello from SGSA Scouts! 🏕️</h1>
            <p>This is a simple test email sent using the MailerSend API.</p>
            <p>If you received this email, the integration is working correctly!</p>

            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Test Details:</h3>
                <ul>
                    <li><strong>Sent at:</strong> """ + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + """</li>
                    <li><strong>From:</strong> SGSA Scouts Test System</li>
                    <li><strong>API:</strong> MailerSend</li>
                </ul>
            </div>

            <p style="color: #666; font-size: 0.9em;">
                <em>This email was sent from the SGSA Scouts test script</em>
            </p>
        </div>
        """

        # Plain text content
        text_content = """
Hello from SGSA Scouts!

This is a simple test email sent using the MailerSend API.
If you received this email, the integration is working correctly!

Test Details:
- Sent at: """ + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + """
- From: SGSA Scouts Test System
- API: MailerSend

This email was sent from the SGSA Scouts test script
        """

        email.html(html_content)
        email.text(text_content)

        print("[OK] Email configured:")
        print("  From: SGSA Scouts <info@sgsascouts.ca>")
        print("  To: Test User <mbaskhairoun@gmail.com>")
        print("  Subject: Simple Test Email from SGSA Scouts")
        print("  Content: HTML + Plain text")

        # Send the email
        print("\n[SENDING] Sending email...")
        built_email = email.build()
        response = client.emails.send(built_email)

        if response:
            print("[SUCCESS] Email sent successfully!")
            print(f"Response: {response}")
            return True
        else:
            print("[FAILED] Email sending failed - no response received")
            return False

    except Exception as e:
        print(f"[ERROR] Failed to send email: {e}")
        print(f"Error type: {type(e).__name__}")

        # Additional error details
        if hasattr(e, 'response') and hasattr(e.response, 'text'):
            print(f"API Response: {e.response.text}")

        return False

def main():
    """Main function"""
    print("=" * 60)
    print("MailerSend Simple Email Test")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    success = send_simple_email()

    print("\n" + "=" * 60)
    print("TEST RESULT")
    print("=" * 60)

    if success:
        print("[SUCCESS] Email sent successfully!")
        print("Check your inbox at mbaskhairoun@gmail.com")
    else:
        print("[FAILED] Email test failed")
        print("\nTroubleshooting:")
        print("1. Verify your API token is correct")
        print("2. Check that info@sgsascouts.ca is verified in MailerSend")
        print("3. Check your internet connection")
        print("4. Make sure your MailerSend account is active")

    print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()