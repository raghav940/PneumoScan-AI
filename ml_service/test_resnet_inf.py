import torch
import torchvision.models as models
import torch.nn.functional as F
from preprocess import preprocess_image

model = models.resnet18(weights=None)
model.conv1 = torch.nn.Conv2d(1, 64, kernel_size=7, stride=2, padding=3, bias=False)
model.fc = torch.nn.Linear(model.fc.in_features, 2)

state_dict = torch.load('pneumoscan.pt', map_location='cpu')
new_state_dict = {k[6:] if k.startswith('model.') else k: v for k, v in state_dict.items()}
model.load_state_dict(new_state_dict, strict=False)
model.eval()

img = preprocess_image('test_image.jpg')
out = model(img)
probs = F.softmax(out, dim=1)
print(probs)
