import torch
import torch.nn as nn
from torchvision import models

class ResNetModel(nn.Module):
    def __init__(self):
        super(ResNetModel, self).__init__()
        self.model = models.resnet18(weights=None)
        self.model.conv1 = nn.Conv2d(1, 64, kernel_size=7, stride=2, padding=3, bias=False)
        self.model.fc = nn.Linear(self.model.fc.in_features, 2)

    def forward(self, x):
        return self.model(x)

m = ResNetModel()
state_dict = torch.load('pneumoscan.pt', map_location='cpu')
# some keys might be unexpected like `model.fc.1.weight`? Let's check `state_dict.keys()`
res = m.load_state_dict(state_dict, strict=False)
print("Missing:", res.missing_keys)
print("Unexpected:", res.unexpected_keys)
