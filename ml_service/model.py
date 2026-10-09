import os
import torch
import torch.nn as nn
from torchvision import models

class CNNModel(nn.Module):
    """
    PneumoScan ResNet-18 for grayscale chest X-rays.
    Classes:
        0: Normal
        1: Pneumonia
    """
    def __init__(self):
        super().__init__()
        self.resnet = models.resnet18(weights=None)

        # Adapt the first convolution to one-channel grayscale input.
        orig_conv = self.resnet.conv1
        self.resnet.conv1 = nn.Conv2d(
            in_channels=1,
            out_channels=orig_conv.out_channels,
            kernel_size=orig_conv.kernel_size,
            stride=orig_conv.stride,
            padding=orig_conv.padding,
            bias=False,
        )

        # Preserve the existing checkpoint-compatible classifier.
        num_ftrs = self.resnet.fc.in_features
        self.resnet.fc = nn.Sequential(
            nn.Dropout(p=0.5),
            nn.Linear(num_ftrs, 2),
        )

    def forward(self, x):
        return self.resnet(x)

    def load_weights(self, weights_path, map_location='cpu'):
        """
        Loads trained checkpoint weights with explicit strict checking.
        """
        if not os.path.exists(weights_path):
            raise FileNotFoundError(f"Checkpoint not found at: {weights_path}")

        try:
            state_dict = torch.load(weights_path, map_location=map_location, weights_only=True)
        except Exception:
            # Fallback for complex pickled checkpoints if weights_only fails
            state_dict = torch.load(weights_path, map_location=map_location)

        # If wrapped under a 'model.' or 'state_dict' container
        if isinstance(state_dict, dict) and 'state_dict' in state_dict:
            state_dict = state_dict['state_dict']

        all_keys = list(state_dict.keys())

        if all(k.startswith('model.') for k in all_keys):
            state_dict = {k[len('model.'):]: v for k, v in state_dict.items()}
            self.resnet.load_state_dict(state_dict, strict=True)
        elif all(k.startswith('resnet.') for k in all_keys):
            self.load_state_dict(state_dict, strict=True)
        else:
            # Bare keys matching standard ResNet module
            self.resnet.load_state_dict(state_dict, strict=True)
