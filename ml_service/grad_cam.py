import torch
import torch.nn.functional as F

class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        self.forward_handle = target_layer.register_forward_hook(
            self.save_activation
        )
        self.backward_handle = target_layer.register_full_backward_hook(
            self.save_gradient
        )

    def save_activation(self, module, inputs, output):
        self.activations = output

    def save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0]

    def generate(self, input_tensor, target_class):
        return self.generate_heatmap(input_tensor, target_class)

    def generate_heatmap(self, input_tensor, target_class):
        if input_tensor.ndim != 4 or input_tensor.shape[0] != 1:
            raise ValueError(
                "GradCAM currently expects input shape (1, C, H, W)"
            )
        self.model.eval()
        self.model.zero_grad(set_to_none=True)

        # Forward pass (activations captured via hook)
        output = self.model(input_tensor)

        if not (0 <= target_class < output.shape[1]):
            raise ValueError(
                f"target_class must be between 0 and {output.shape[1] - 1}, got {target_class}"
            )

        # Backward pass targeting specific class logit
        loss = output[0, target_class]
        loss.backward()

        if self.gradients is None or self.activations is None:
            raise RuntimeError(
                "Failed to capture gradients or activations during GradCAM pass"
            )

        # Vectorized global average pooling of gradients: shape (1, C, 1, 1)
        weights = self.gradients.mean(dim=(2, 3), keepdim=True)

        # Channel-weighted sum of activations without in-place mutation: shape (1, 1, H_feat, W_feat)
        cam = (weights * self.activations.detach()).sum(dim=1, keepdim=True)

        # ReLU to isolate positive contributions to the target class
        cam = F.relu(cam)

        # Interpolate directly in PyTorch to input spatial dimensions (H, W)
        cam = F.interpolate(
            cam,
            size=(input_tensor.shape[2], input_tensor.shape[3]),
            mode='bilinear',
            align_corners=False
        )

        heatmap = cam.squeeze().cpu().numpy()

        # Max normalization preserving the zero floor
        max_val = heatmap.max()
        if max_val > 0:
            heatmap = heatmap / (max_val + 1e-8)

        return heatmap

    def remove_hooks(self):
        if self.forward_handle is not None:
            self.forward_handle.remove()
            self.forward_handle = None
        if self.backward_handle is not None:
            self.backward_handle.remove()
            self.backward_handle = None
