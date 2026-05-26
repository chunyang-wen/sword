import os
import requests

# --- CONFIGURATION ---
USERNAME = 'deepfish'
TOKEN = os.environ['PYTHONANYWHERE_API_TOKEN']
DOMAIN = 'deepfish.pythonanywhere.com'  # Or your custom domain
# If your account is on the EU server, change this to 'eu.pythonanywhere.com'
HOST = 'www.pythonanywhere.com'

def renew_web_app():
    url = f'https://{HOST}/api/v0/user/{USERNAME}/webapps/{DOMAIN}/reload/'
    headers = {'Authorization': f'Token {TOKEN}'}

    print(f"Attempting to renew/reload web app: {DOMAIN}...")
    response = requests.post(url, headers=headers)

    if response.status_code == 200:
        print("Success! The web app has been successfully reloaded and extended.")
    else:
        print(f"Failed to renew. Status code: {response.status_code}")
        print(f"Error message: {response.text}")

if __name__ == '__main__':
    renew_web_app()
