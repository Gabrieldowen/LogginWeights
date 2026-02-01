import requests

response = requests.post(
    'http://localhost:5678/webhook/log-workout',
    json={
        'text': 'Did bench press 185 pounds for 10 reps, 3 sets',
        'api_key': 'REPLACE_WITH_YOUR_CUSTOM_API_KEY'
    }
)

print(response.json())