import numpy as np
import torch
from model import CNNModel
from grad_cam import GradCAM

def main():
    torch.manual_seed(42)
    model = CNNModel()
    model.load_weights("pneumoscan.pt")
    model.eval()

    x = torch.rand(1, 1, 224, 224)

    with torch.no_grad():
        prediction = model(x)

    assert prediction.shape == (1, 2), prediction.shape
    assert torch.isfinite(prediction).all()

    cam = GradCAM(model, model.resnet.layer4[-1])
    try:
        heatmap = cam.generate_heatmap(x, target_class=1)
        assert heatmap.shape == (224, 224), heatmap.shape
        assert np.isfinite(heatmap).all()
        assert heatmap.min() >= 0.0
        assert heatmap.max() <= 1.0 + 1e-6
        print("Prediction shape:", tuple(prediction.shape))
        print("Heatmap shape:", heatmap.shape)
        print("Heatmap range:", float(heatmap.min()), float(heatmap.max()))
        print("Checkpoint, prediction and Grad-CAM checks passed.")
    finally:
        cam.remove_hooks()

if __name__ == "__main__":
    main()
