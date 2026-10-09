import cv2
import numpy as np
import torch

def preprocess_image_bytes(image_bytes):
    """
    In-memory preprocessing for production deployment.
    Directly processes uploaded bytes without saving to disk.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError("Could not decode image from upload bytes.")
    
    img_resized = cv2.resize(img, (224, 224), interpolation=cv2.INTER_LINEAR)
    img_normalized = img_resized / 255.0
    tensor = torch.tensor(img_normalized, dtype=torch.float32).unsqueeze(0).unsqueeze(0)
    return tensor

def preprocess_image(image_path):
    """
    Filepath-based preprocessing pipeline.
    """
    with open(image_path, 'rb') as f:
        return preprocess_image_bytes(f.read())

