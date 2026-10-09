import torch
import torch.nn.functional as F
import os
from model import CNNModel
from preprocess import preprocess_image

model = CNNModel()
model.load_state_dict(torch.load('pneumoscan.pt', map_location='cpu'))
model.eval()

files = ["6_1791567596_person1_virus_13.jpeg", "6_1791567613_IM-0011-0001.jpeg", "6_1791567077_person1_virus_11.jpeg", "6_1791567111_IM-0009-0001.jpeg"]

for f in files:
    path = os.path.join('uploads', f)
    img_tensor = preprocess_image(path)
    out = model(img_tensor)
    probs = F.softmax(out, dim=1)
    print(f, probs)
