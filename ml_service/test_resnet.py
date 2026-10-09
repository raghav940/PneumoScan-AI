import torch
import torchvision.models as models

model = models.resnet18(pretrained=False)
model.conv1 = torch.nn.Conv2d(1, 64, kernel_size=7, stride=2, padding=3, bias=False)
model.fc = torch.nn.Linear(model.fc.in_features, 2)
try:
    model.load_state_dict(torch.load('pneumoscan.pt', map_location='cpu'))
    print("Loaded pneumoscan.pt as modified ResNet18 successfully!")
except Exception as e:
    print("Failed to load pneumoscan.pt:", e)
