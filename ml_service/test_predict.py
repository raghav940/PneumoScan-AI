import requests

url = 'http://127.0.0.1:5001/login'
data = {'username': 'testuser2', 'password': 'testpassword'}
# register first
requests.post('http://127.0.0.1:5001/register', json=data)
# login
res = requests.post(url, json=data)
token = res.json().get('access_token')

if not token:
    print("Login failed:", res.json())
    exit(1)

# create a dummy image
from PIL import Image
img = Image.new('RGB', (224, 224), color = 'red')
img.save('test_image.jpg')

# predict
predict_url = 'http://127.0.0.1:5001/predict'
headers = {'Authorization': f'Bearer {token}'}
files = {'image': open('test_image.jpg', 'rb')}
res = requests.post(predict_url, headers=headers, files=files)
print(res.status_code)
print(res.text)
