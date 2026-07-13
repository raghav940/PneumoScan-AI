import torch
import torch.nn.functional as F
import cv2
import numpy as np

class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        
        # Register hooks
        self.target_layer.register_forward_hook(self.save_activation)
        self.target_layer.register_full_backward_hook(self.save_gradient)
        
    def save_activation(self, module, input, output):
        self.activations = output
        
    def save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0]
        
    def generate_heatmap(self, input_tensor, target_class):
        self.model.eval()
        
        # Forward pass
        output = self.model(input_tensor)
        
        # Backward pass
        self.model.zero_grad()
        loss = output[0, target_class]
        loss.backward()
        
        # Pool the gradients across spatial dimensions
        pooled_gradients = torch.mean(self.gradients, dim=[0, 2, 3])
        
        # Multiply activations by pooled gradients
        activations = self.activations.detach()
        for i in range(activations.size(1)):
            activations[:, i, :, :] *= pooled_gradients[i]
            
        # Average channels to get the heatmap
        heatmap = torch.sum(activations, dim=1).squeeze()
        
        # ReLU to keep only positive influence
        heatmap = F.relu(heatmap)
        
        # Normalize to [0, 1]
        heatmap /= torch.max(heatmap) + 1e-8
        
        # Upsample to 224x224
        heatmap = heatmap.cpu().numpy()
        heatmap = cv2.resize(heatmap, (224, 224), interpolation=cv2.INTER_LINEAR)
        
        return heatmap
