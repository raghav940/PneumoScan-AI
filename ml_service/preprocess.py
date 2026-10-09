import cv2
import numpy as np
import torch

import base64

def validate_radiograph(image_bytes):
    """
    Multi-stage validation gate to reject non-medical, corrupted, or blank uploads:
    1. Decode check
    2. Resolution check
    3. Grayscale standard deviation contrast check
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return False, "Corrupted or unsupported image file. Please upload a valid JPEG or PNG."
    
    h, w = img.shape
    if h < 180 or w < 180:
        return False, f"Image resolution ({w}x{h}) is too low for clinical radiograph evaluation. Minimum is 180x180."
    
    aspect_ratio = max(h, w) / max(1, min(h, w))
    if aspect_ratio > 2.8:
        return False, "Extreme aspect ratio detected. Standard chest radiographs are approximately square."
    
    # Radiograph Contrast check: Real chest X-rays have high dynamic range (air vs bones)
    std_dev = np.std(img)
    dynamic_range = int(np.max(img)) - int(np.min(img))
    if std_dev < 18.0 or dynamic_range < 50:
        return False, "Image lacks the contrast characteristics of a thoracic radiograph (uniform or blank scan)."
    
    return True, None

def generate_compressed_thumbnail(image_bytes, max_dim=128, quality=65):
    """
    Compresses image into an ultra-lightweight JPEG Base64 thumbnail (~3-5 KB)
    for instant rendering in the History table without server bloat.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None
    
    h, w = img.shape
    scale = max_dim / max(h, w)
    new_w, new_h = max(1, int(w * scale)), max(1, int(h * scale))
    resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
    
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
    success, encimg = cv2.imencode('.jpg', resized, encode_param)
    if success:
        b64_str = base64.b64encode(encimg).decode('utf-8')
        return f"data:image/jpeg;base64,{b64_str}"
    return None

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


