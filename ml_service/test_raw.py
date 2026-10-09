import torch
from model import CNNModel
from preprocess import preprocess_image

model = CNNModel()
model.load_state_dict(torch.load('custom_pneumoscan.pt', map_location='cpu'))
model.eval()

img_tensor = preprocess_image('test_image.jpg')
out = model(img_tensor)
import torch.nn.functional as F
probs = F.softmax(out, dim=1)
print(probs)
