import torch
import torch.nn as nn
from torchvision import models

class CNNModel(nn.Module):
    """
    PneumoScan ResNet-18 adapted for 1-channel grayscale chest X-rays.
    """
    def __init__(self):
        super(CNNModel, self).__init__()
        self.resnet = models.resnet18(weights=None)
        
        # Modify first conv layer for 1-channel grayscale
        orig_conv = self.resnet.conv1
        self.resnet.conv1 = nn.Conv2d(
            1, orig_conv.out_channels, kernel_size=orig_conv.kernel_size,
            stride=orig_conv.stride, padding=orig_conv.padding, bias=False
        )
        
        # Modify final FC layer for 2 classes: [0: Normal, 1: Pneumonia]
        num_ftrs = self.resnet.fc.in_features
        self.resnet.fc = nn.Sequential(
            nn.Dropout(p=0.5),
            nn.Linear(num_ftrs, 2)
        )

    def forward(self, x):
        return self.resnet(x)

    def load_weights(self, weights_path, map_location='cpu'):
        state_dict = torch.load(weights_path, map_location=map_location)
        # Check if keys are prefixed with 'resnet.' or 'model.' or bare
        if any(k.startswith('model.') for k in state_dict.keys()):
            # Strip 'model.'
            state_dict = {k.replace('model.', ''): v for k, v in state_dict.items()}
            self.resnet.load_state_dict(state_dict)
        elif any(k.startswith('resnet.') for k in state_dict.keys()):
            self.load_state_dict(state_dict)
        else:
            # Bare keys like 'conv1.weight' -> load into self.resnet
            self.resnet.load_state_dict(state_dict)

