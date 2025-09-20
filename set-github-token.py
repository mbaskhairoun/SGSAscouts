#!/usr/bin/env python3
"""
Run this script once to set the GitHub token in Firebase Realtime Database
"""

import requests
import json
import os

# Firebase Realtime Database configuration
FIREBASE_DATABASE_URL = "https://sgsa-kids-default-rtdb.firebaseio.com"

def set_github_token():
    """Set GitHub token in Firebase Realtime Database"""

    # Get token from environment variable
    token = os.environ.get('IMAGE_UPLOAD_TOKEN')

    if not token:
        print("❌ IMAGE_UPLOAD_TOKEN environment variable not set")
        print("Set it with: export IMAGE_UPLOAD_TOKEN=your_token_here")
        return

    # Firebase Realtime Database REST API endpoint
    url = f"{FIREBASE_DATABASE_URL}/config/github/token.json"

    try:
        # Send PUT request to set the token
        response = requests.put(url, json=token)

        if response.status_code == 200:
            print("✅ GitHub token saved to Firebase Realtime Database")
        else:
            print(f"❌ Error saving token: {response.status_code}")
            print(f"Response: {response.text}")

    except Exception as error:
        print(f"❌ Error saving token: {error}")

if __name__ == "__main__":
    set_github_token()