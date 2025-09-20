import os
import requests
import base64
import time

# GitHub configuration
GITHUB_CONFIG = {
    'username': 'mbaskhairoun',
    'repository': 'SGSA-Pics',
    'token': os.environ.get('IMAGE_UPLOAD_TOKEN'),
    'base_url': 'https://api.github.com/repos/mbaskhairoun/SGSA-Pics/contents'
}

def test_upload():
    if not GITHUB_CONFIG['token']:
        print('❌ IMAGE_UPLOAD_TOKEN environment variable not set')
        return

    print('🔑 Token found, testing upload...')

    # Create a simple test file
    test_content = base64.b64encode(b'Test logo content').decode('utf-8')
    file_name = f'test-logo-{int(time.time())}.txt'
    file_path = f"announcements/{file_name}"

    url = f"{GITHUB_CONFIG['base_url']}/{file_path}"

    headers = {
        'Authorization': f"token {GITHUB_CONFIG['token']}",
        'Content-Type': 'application/json'
    }

    data = {
        'message': f'Upload test file {file_name}',
        'content': test_content,
        'branch': 'main'
    }

    try:
        response = requests.put(url, json=data, headers=headers)

        if response.status_code in [200, 201]:
            result = response.json()
            print('✅ Upload successful!')
            print(f'📁 File URL: {result["content"]["html_url"]}')
        else:
            print(f'❌ Upload failed: {response.status_code}')
            print(f'Error: {response.text}')

    except Exception as e:
        print(f'❌ Error during upload: {e}')

if __name__ == '__main__':
    test_upload()