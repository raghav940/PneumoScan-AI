import cv2
import numpy as np
import torch

def preprocess_image(image_path):
    """
    Standardised five-step pipeline:
    1. Grayscale Conversion
    2. Spatial Normalisation (224x224)
    3. Intensity Normalisation [0.0, 1.0]
    4. Tensor Conversion (1, 1, 224, 224) float32
    """
    # 1. Grayscale Conversion
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"Could not read image at {image_path}")
    
    # 2. Spatial Normalisation
    img_resized = cv2.resize(img, (224, 224), interpolation=cv2.INTER_LINEAR)
    
    # 3. Intensity Normalisation
    img_normalized = img_resized / 255.0
    
    # 4. Tensor Conversion
    # numpy array is (224, 224), we need (1, 1, 224, 224)
    tensor = torch.tensor(img_normalized, dtype=torch.float32)
    tensor = tensor.unsqueeze(0).unsqueeze(0)
    
    return tensor
