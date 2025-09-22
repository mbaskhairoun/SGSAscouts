#!/usr/bin/env python3
"""
MailerSend Email Testing Script

This script tests the MailerSend API for sending emails with templates.
Make sure to install the mailersend package first:
pip install mailersend

Also, set your MailerSend API token as an environment variable:
export MAILERSEND_API_TOKEN="your_api_token_here"
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

def test_mailersend_email():
    """Test sending an email using MailerSend API with template"""

    # Check for API token
    api_token = os.getenv('MAILERSEND_API_TOKEN')
    if not api_token:
        print("[ERROR] MAILERSEND_API_TOKEN environment variable not set")
        print("  Please set it with: set MAILERSEND_API_TOKEN=your_token_here")
        return False

    print(f"[OK] API token found (ends with: ...{api_token[-8:]})")

    try:
        # Initialize client
        client = MailerSendClient(api_token)
        print("[OK] MailerSend client initialized")

        # Build email using EmailBuilder
        email_builder = EmailBuilder()

        # Set sender
        email_builder.from_email("info@sgsascouts.ca", "SGSA Scouts Test")

        # Set recipient
        email_builder.to("mbaskhairoun@gmail.com", "Test Recipient")

        # Set subject
        email_builder.subject("Test Email from SGSA Scouts - Template")

        # Set template ID
        template_id = "k68zxl21ew34j905"  # Replace with your actual template ID
        email_builder.template(template_id)

        # Add template variables
        email_builder.personalize("mbaskhairoun@gmail.com", {
            "company": "SGSA Scouts",
            "name": "Test Recipient"
        })

        print("[OK] Email parameters configured:")
        print(f"  From: SGSA Scouts Test <info@sgsascouts.ca>")
        print(f"  To: Test Recipient <mbaskhairoun@gmail.com>")
        print(f"  Template ID: {template_id}")

        # Send the email
        print("\n[SENDING] Attempting to send template email...")
        email = email_builder.build()
        response = client.emails.send(email)

        if response:
            print("[SUCCESS] Template email sent successfully!")
            print(f"Response: {response}")
            return True
        else:
            print("[FAILED] Template email sending failed - no response received")
            return False

    except Exception as e:
        print(f"[ERROR] Error sending template email: {e}")
        print(f"Error type: {type(e).__name__}")
        return False

def test_simple_email():
    """Test sending a simple email without template"""

    api_token = os.getenv('MAILERSEND_API_TOKEN')
    if not api_token:
        print("[ERROR] API token not found for simple email test")
        return False

    try:
        # Initialize client
        client = MailerSendClient(api_token)
        print("[OK] MailerSend client initialized for simple email")

        # Build email using EmailBuilder
        email_builder = EmailBuilder()

        # Set sender
        email_builder.from_email("info@sgsascouts.ca", "SGSA Scouts")

        # Set recipient
        email_builder.to("mbaskhairoun@gmail.com", "Test User")

        # Set subject
        email_builder.subject("Simple Test Email from SGSA Scouts")

        # Set HTML content
        html_content = """
        <h1>Hello from SGSA Scouts!</h1>
        <p>This is a simple test email sent using MailerSend API.</p>
        <p>If you received this email, the integration is working correctly!</p>
        <hr>
        <p><small>Sent from SGSA Scouts test script</small></p>
        """
        email_builder.html(html_content)

        # Set plain text content
        text_content = """
        Hello from SGSA Scouts!

        This is a simple test email sent using MailerSend API.
        If you received this email, the integration is working correctly!

        ---
        Sent from SGSA Scouts test script
        """
        email_builder.text(text_content)

        print("[OK] Simple email configured:")
        print("  From: SGSA Scouts <info@sgsascouts.ca>")
        print("  To: Test User <mbaskhairoun@gmail.com>")
        print("  Content: HTML + Plain text")

        print("\n[SENDING] Attempting to send simple email...")
        email = email_builder.build()
        response = client.emails.send(email)

        if response:
            print("[SUCCESS] Simple email sent successfully!")
            print(f"Response: {response}")
            return True
        else:
            print("[FAILED] Simple email sending failed")
            return False

    except Exception as e:
        print(f"[ERROR] Error sending simple email: {e}")
        print(f"Error type: {type(e).__name__}")
        return False

def main():
    """Main function to run email tests"""

    print("=" * 60)
    print("MailerSend Email Testing Script")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # Test 1: Template-based email
    print("TEST 1: Template-based email")
    print("-" * 30)
    template_success = test_mailersend_email()

    print("\n" + "=" * 40)

    # Test 2: Simple HTML email
    print("TEST 2: Simple HTML email")
    print("-" * 30)
    simple_success = test_simple_email()

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Template email: {'[PASSED]' if template_success else '[FAILED]'}")
    print(f"Simple email:   {'[PASSED]' if simple_success else '[FAILED]'}")

    if template_success or simple_success:
        print("\n[SUCCESS] At least one test passed! MailerSend is working.")
    else:
        print("\n[FAILED] All tests failed. Please check your configuration.")
        print("\nTroubleshooting tips:")
        print("1. Verify your API token is correct")
        print("2. Check that your sender email is verified in MailerSend")
        print("3. Ensure your template ID exists (for template test)")
        print("4. Check your internet connection")
        print("5. Review MailerSend documentation for any API changes")

    print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()