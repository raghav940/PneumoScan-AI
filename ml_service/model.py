import torch
import torch.nn as nn
from torchvision import models

class CNNModel(nn.Module):
    """
    Trained ResNet18 model on the chest_xray dataset.
    """
    def __init__(self):
        super(CNNModel, self).__init__()
        self.model = models.resnet18(weights=None)
        # Modify for grayscale input
        self.model.conv1 = nn.Conv2d(1, 64, kernel_size=7, stride=2, padding=3, bias=False)
        # Modify FC layer
        self.model.fc = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(self.model.fc.in_features, 2)
        )

    def forward(self, x):
        return self.model(x)
