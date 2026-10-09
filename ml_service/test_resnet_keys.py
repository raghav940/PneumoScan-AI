import torch
import torchvision.models as models

model = models.resnet18(pretrained=False)
model.conv1 = torch.nn.Conv2d(1, 64, kernel_size=7, stride=2, padding=3, bias=False)
model.fc = torch.nn.Linear(model.fc.in_features, 2)

state_dict = torch.load('pneumoscan.pt', map_location='cpu')

# Strip "model." prefix from keys
new_state_dict = {}
for k, v in state_dict.items():
    if k.startswith('model.'):
        new_state_dict[k[6:]] = v
    else:
        new_state_dict[k] = v

try:
    model.load_state_dict(new_state_dict, strict=False)
    print("Loaded successfully with stripped keys!")
except Exception as e:
    print("Failed to load:", e)
