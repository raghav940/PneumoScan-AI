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

    def generate_overlay(self, input_tensor, target_class, original_image_bytes=None, raw_gray_224=None):
        """
        Renders a medical Grad-CAM Jet overlay blended onto the radiograph.
        Applies continuous Gaussian smoothing to eliminate coarse 7x7 blocky/notched artifacts,
        colorizes with cv2.COLORMAP_JET, and alpha-blends smoothly without hard threshold cutoffs.
        Returns base64 JPEG data URL and the smoothed 224x224 heatmap coordinates.
        """
        import cv2
        import numpy as np
        import base64

        heatmap = self.generate_heatmap(input_tensor, target_class)

        # Smooth coarse 7x7 grid boundaries to produce natural anatomical gradients
        smoothed_heatmap = cv2.GaussianBlur(heatmap, (15, 15), 0)
        smoothed_heatmap = np.clip(smoothed_heatmap / (smoothed_heatmap.max() + 1e-8), 0, 1)

        # Get base grayscale image at 224x224
        if raw_gray_224 is not None:
            gray_img = raw_gray_224
        elif original_image_bytes is not None:
            nparr = np.frombuffer(original_image_bytes, np.uint8)
            decoded = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
            gray_img = cv2.resize(decoded, (224, 224), interpolation=cv2.INTER_LINEAR)
        else:
            # Reconstruct from input tensor [1, 1, 224, 224]
            gray_img = np.uint8(np.clip(input_tensor.squeeze().cpu().numpy() * 255.0, 0, 255))

        base_bgr = cv2.cvtColor(gray_img, cv2.COLOR_GRAY2BGR)

        # Apply standard medical JET colormap
        heatmap_u8 = np.uint8(255 * smoothed_heatmap)
        colored_cam = cv2.applyColorMap(heatmap_u8, cv2.COLORMAP_JET)

        # Continuous smooth alpha blending: higher alpha on hot activations, fading seamlessly to 0 on non-activated areas
        # (Weight: alpha = smoothstep curve between 0.0 and 0.55 max opacity)
        alpha_mask = np.power(smoothed_heatmap, 1.5) * 0.55
        alpha_3d = np.repeat(alpha_mask[:, :, np.newaxis], 3, axis=2)

        blended = np.uint8(np.clip(colored_cam * alpha_3d + base_bgr * (1.0 - alpha_3d), 0, 255))

        # Encode to JPEG base64 data URL
        success, enc = cv2.imencode('.jpg', blended, [cv2.IMWRITE_JPEG_QUALITY, 92])
        if success:
            b64_str = base64.b64encode(enc).decode('utf-8')
            overlay_url = f"data:image/jpeg;base64,{b64_str}"
        else:
            overlay_url = None

        return smoothed_heatmap, overlay_url

    def remove_hooks(self):
        if self.forward_handle is not None:
            self.forward_handle.remove()
            self.forward_handle = None
        if self.backward_handle is not None:
            self.backward_handle.remove()
            self.backward_handle = None
