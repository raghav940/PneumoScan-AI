import torch
import torch.nn as nn
from torchvision import models

class CNNModel(nn.Module):
    def __init__(self):
        super(CNNModel, self).__init__()
        self.model = models.resnet18(weights=None)
        self.model.conv1 = nn.Conv2d(1, 64, kernel_size=7, stride=2, padding=3, bias=False)
        self.model.fc = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(self.model.fc.in_features, 2)
        )

    def forward(self, x):
        return self.model(x)

m = CNNModel()
try:
    m.load_state_dict(torch.load('pneumoscan.pt', map_location='cpu'))
    print("Loaded directly successfully!")
except Exception as e:
    print("Failed:", e)
