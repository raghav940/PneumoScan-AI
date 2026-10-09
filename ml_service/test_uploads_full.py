import os
import torch
import torch.nn.functional as F
from model import CNNModel
from preprocess import preprocess_image

# Load the trained ResNet‑18 model
model = CNNModel()
model_path = 'pneumoscan.pt'
if os.path.exists(model_path):
    model.load_state_dict(torch.load(model_path, map_location='cpu'))
    print(f"Loaded weights from {model_path}")
else:
    raise FileNotFoundError(f"{model_path} not found")
model.eval()

# Helper to map class index to label
idx_to_label = {0: "Normal", 1: "Pneumonia"}

upload_dir = 'uploads'
files = [f for f in os.listdir(upload_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
if not files:
    print('No image files found in uploads/')
else:
    for f in files:
        img_path = os.path.join(upload_dir, f)
        try:
            tensor = preprocess_image(img_path)
            out = model(tensor)
            probs = F.softmax(out, dim=1)[0]
            pred_idx = torch.argmax(probs).item()
            orig_conf = probs[pred_idx].item()
            # Apply the same confidence boost as in app.py
            confidence = 0.90 + (orig_conf - 0.5) * 0.16
            label = idx_to_label[pred_idx]
            print(f"{f}: label={label}, raw_conf={orig_conf:.4f}, adjusted_conf={confidence:.4f}")
        except Exception as e:
            print(f"Error processing {f}: {e}")
