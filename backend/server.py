from flask import Flask, request, jsonify, redirect, session
from flask_cors import CORS
import requests
import os
import json
import time
import secrets
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)
CORS(app, supports_credentials=True)

# LinkedIn OAuth Config
LINKEDIN_CLIENT_ID = os.getenv('LINKEDIN_CLIENT_ID', '')
LINKEDIN_CLIENT_SECRET = os.getenv('LINKEDIN_CLIENT_SECRET', '')
LINKEDIN_REDIRECT_URI = os.getenv('LINKEDIN_REDIRECT_URI', 'https://web-production-08a17.up.railway.app/linkedin/callback')

# Store jobs and tokens
jobs = {}
linkedin_tokens = {}

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/linkedin/auth', methods=['GET'])
def linkedin_auth():
    if not LINKEDIN_CLIENT_ID:
        return jsonify({'error': 'LinkedIn credentials not configured'}), 400
    state = secrets.token_hex(16)
    session['oauth_state'] = state
    auth_url = f"https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id={LINKEDIN_CLIENT_ID}&redirect_uri={LINKEDIN_REDIRECT_URI}&state={state}&scope=openid%20profile%20w_member_social"
    return redirect(auth_url)

@app.route('/linkedin/callback', methods=['GET'])
def linkedin_callback():
    code = request.args.get('code')
    if not code:
        return jsonify({'error': 'No code'}), 400
    response = requests.post('https://www.linkedin.com/oauth/v2/accessToken', data={
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': LINKEDIN_REDIRECT_URI,
        'client_id': LINKEDIN_CLIENT_ID,
        'client_secret': LINKEDIN_CLIENT_SECRET
    })
    if response.status_code == 200:
        token_data = response.json()
        linkedin_tokens['access_token'] = token_data['access_token']
        linkedin_tokens['expires_at'] = time.time() + token_data.get('expires_in', 3600)
        profile = requests.get('https://api.linkedin.com/v2/userinfo', headers={'Authorization': f'Bearer {token_data["access_token"]}'}).json()
        linkedin_tokens['user_id'] = profile.get('sub', '')
        return '<html><body><h1>LinkedIn Connected!</h1><script>window.close();</script></body></html>'
    return jsonify({'error': 'Failed'}), 400

@app.route('/linkedin/status', methods=['GET'])
def linkedin_status():
    if linkedin_tokens.get('access_token') and time.time() < linkedin_tokens.get('expires_at', 0):
        return jsonify({'connected': True})
    return jsonify({'connected': False})

@app.route('/generate-from-newsout', methods=['POST'])
def generate():
    data = request.json
    job_id = secrets.token_hex(8)
    jobs[job_id] = {'status': 'processing', 'percent': 0, 'data': data}
    import threading
    threading.Thread(target=process_job, args=(job_id,)).start()
    return jsonify({'job_id': job_id})

def process_job(job_id):
    job = jobs[job_id]
    data = job['data']
    for i in range(1, 11):
        time.sleep(1)
        jobs[job_id]['percent'] = i * 10
    linkedin_url = None
    if linkedin_tokens.get('access_token'):
        linkedin_url = post_to_linkedin(data)
    jobs[job_id]['status'] = 'complete'
    jobs[job_id]['percent'] = 100
    jobs[job_id]['linkedin_post_url'] = linkedin_url

def post_to_linkedin(data):
    access_token = linkedin_tokens.get('access_token')
    user_id = linkedin_tokens.get('user_id')
    if not access_token or not user_id:
        return None
    post_data = {
        "author": f"urn:li:person:{user_id}",
        "lifecycleState": "PUBLISHED",
        "specificContent": {"com.linkedin.ugc.ShareContent": {
            "shareCommentary": {"text": f"🚀 {data.get('title', '')}\n\n{data.get('summary', '')[:400]}\n\n📊 AI Score: {data.get('avg_score', 85)}%\n\n#AI #Tech"},
            "shareMediaCategory": "NONE"
        }},
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"}
    }
    response = requests.post('https://api.linkedin.com/v2/ugcPosts', headers={
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
    }, json=post_data)
    if response.status_code in [200, 201]:
        return f"https://www.linkedin.com/feed/update/{response.headers.get('x-restli-id', '')}"
    return None

@app.route('/status/<job_id>', methods=['GET'])
def get_status(job_id):
    return jsonify(jobs.get(job_id, {'status': 'not_found', 'percent': 0}))

@app.route('/api/articles/count', methods=['GET'])
def count():
    return jsonify({'count': 10})

if __name__ == '__main__':
    print("\n🚀 AI Pulse Backend on http://localhost:5050")
    if not LINKEDIN_CLIENT_ID:
        print("⚠️  Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in .env")
    app.run(host='0.0.0.0', port=5050, debug=True)
