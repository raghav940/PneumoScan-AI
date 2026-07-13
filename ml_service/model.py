import torch
import torch.nn as nn
from torchvision import models

class CNNModel(nn.Module):
    """
    We are keeping the class name CNNModel for compatibility with the rest of the code,
    but it now wraps a Pre-trained ResNet18 instead of a custom architecture.
    """
    def __init__(self):
        super(CNNModel, self).__init__()
        # Load a pre-trained ResNet18
        self.model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)
        
        # Modify the first conv layer to accept 1 channel (grayscale) instead of 3
        # This allows us to keep the existing grayscale preprocessing pipeline intact.
        original_conv = self.model.conv1
        self.model.conv1 = nn.Conv2d(
            1, original_conv.out_channels, kernel_size=original_conv.kernel_size,
            stride=original_conv.stride, padding=original_conv.padding, bias=False
        )
        
        # Initialize the new 1-channel conv layer with the average of the RGB weights
        self.model.conv1.weight.data = original_conv.weight.data.mean(dim=1, keepdim=True)
        
        # Modify the final fully connected layer for 2 classes (Normal vs Pneumonia)
        num_ftrs = self.model.fc.in_features
        self.model.fc = nn.Sequential(
            nn.Dropout(p=0.5),
            nn.Linear(num_ftrs, 2)
        )

    def forward(self, x):
        return self.model(x)
