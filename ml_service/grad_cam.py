import torch
import torch.nn.functional as F
import numpy as np
import cv2
import base64

class MultiScaleGradCAMPlusPlus:
    """
    Multi-Scale Grad-CAM++ for radiological explainability.
    Combines:
    1. Grad-CAM++ weighting with 2nd and 3rd order gradients to capture multiple/bilateral lesions.
    2. Multi-scale feature fusion of layer4 (semantic context, 7x7) and layer3 (fine-grained parenchymal texture, 14x14).
    3. Gaussian spatial regularization and seamless medical Jet alpha blending.
    """
    def __init__(self, model, target_layers=None):
        self.model = model
        # Support passing a single layer or list/tuple of layers
        if target_layers is None:
            self.target_layers = [model.resnet.layer4[-1], model.resnet.layer3[-1]]
        elif isinstance(target_layers, (list, tuple)):
            self.target_layers = list(target_layers)
        else:
            self.target_layers = [target_layers]

        self.layer_data = {}
        self.handles = []

        for idx, layer in enumerate(self.target_layers):
            self.layer_data[idx] = {'activations': None, 'gradients': None}
            f_handle = layer.register_forward_hook(self._make_forward_hook(idx))
            b_handle = layer.register_full_backward_hook(self._make_backward_hook(idx))
            self.handles.extend([f_handle, b_handle])

    def _make_forward_hook(self, idx):
        def hook(module, inputs, output):
            self.layer_data[idx]['activations'] = output
        return hook

    def _make_backward_hook(self, idx):
        def hook(module, grad_input, grad_output):
            self.layer_data[idx]['gradients'] = grad_output[0]
        return hook

    def _compute_cam_pp(self, activations, gradients, target_size=(224, 224)):
        """
        Computes Grad-CAM++ activation map using 2nd and 3rd order gradient weights.
        """
        # gradients: [1, C, H, W], activations: [1, C, H, W]
        grads = gradients
        acts = activations.detach()

        # Compute higher-order derivatives for Grad-CAM++
        # grads_2: [1, C, H, W], grads_3: [1, C, H, W]
        grads_2 = torch.pow(grads, 2)
        grads_3 = torch.pow(grads, 3)

        # Sum of activations over spatial dimensions: [1, C, 1, 1]
        sum_acts = acts.sum(dim=(2, 3), keepdim=True)

        # Alpha weighting denominator: 2 * grads_2 + sum_acts * grads_3 + eps
        denom = 2.0 * grads_2 + sum_acts * grads_3
        eps = 1e-8
        denom = torch.where(denom != 0.0, denom, torch.ones_like(denom) * eps)

        # Alpha weights: [1, C, H, W]
        alphas = grads_2 / denom

        # Normalized weights: positive gradients weighted by alphas
        relu_grads = F.relu(grads)
        weights = (alphas * relu_grads).sum(dim=(2, 3), keepdim=True)

        # Weighted combination of feature maps
        cam = (weights * acts).sum(dim=1, keepdim=True)
        cam = F.relu(cam)

        # Upsample to target size
        cam = F.interpolate(cam, size=target_size, mode='bilinear', align_corners=False)
        return cam.squeeze()

    def generate_heatmap(self, input_tensor, target_class):
        if input_tensor.ndim != 4 or input_tensor.shape[0] != 1:
            raise ValueError("Expected input shape (1, C, H, W)")

        self.model.eval()
        self.model.zero_grad(set_to_none=True)

        # Forward pass
        output = self.model(input_tensor)

        if not (0 <= target_class < output.shape[1]):
            raise ValueError(f"target_class out of range: {target_class}")

        # Backward pass
        loss = output[0, target_class]
        loss.backward()

        H, W = input_tensor.shape[2], input_tensor.shape[3]

        # Multi-scale aggregation: 60% layer4 (decision) + 40% layer3 (bilateral texture)
        weights_per_layer = [0.60, 0.40]
        fused_cam = torch.zeros((H, W), dtype=torch.float32, device=input_tensor.device)

        for idx in range(len(self.target_layers)):
            acts = self.layer_data[idx]['activations']
            grads = self.layer_data[idx]['gradients']

            if acts is not None and grads is not None:
                layer_cam = self._compute_cam_pp(acts, grads, target_size=(H, W))
                layer_max = layer_cam.max()
                if layer_max > 0:
                    layer_cam = layer_cam / (layer_max + 1e-8)
                fused_cam += weights_per_layer[idx] * layer_cam

        # Contrast concentration: square normalization to highlight true focal spots and bilateral clusters
        heatmap = fused_cam.cpu().numpy()
        heatmap_max = heatmap.max()
        if heatmap_max > 0:
            heatmap = heatmap / (heatmap_max + 1e-8)

        # Apply mild power scaling (1.3) to suppress background diffuse noise without clipping
        heatmap = np.power(heatmap, 1.3)

        return heatmap

    def generate(self, input_tensor, target_class):
        return self.generate_heatmap(input_tensor, target_class)

    def generate_overlay(self, input_tensor, target_class, original_image_bytes=None, raw_gray_224=None):
        heatmap = self.generate_heatmap(input_tensor, target_class)

        # Gentle Gaussian smoothing for natural anatomical gradients
        smoothed = cv2.GaussianBlur(heatmap, (11, 11), 0)
        smoothed = np.clip(smoothed / (smoothed.max() + 1e-8), 0, 1)

        # Obtain base grayscale image at 224x224
        if raw_gray_224 is not None:
            gray_img = raw_gray_224
        elif original_image_bytes is not None:
            nparr = np.frombuffer(original_image_bytes, np.uint8)
            decoded = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
            gray_img = cv2.resize(decoded, (224, 224), interpolation=cv2.INTER_LINEAR)
        else:
            gray_img = np.uint8(np.clip(input_tensor.squeeze().cpu().numpy() * 255.0, 0, 255))

        base_bgr = cv2.cvtColor(gray_img, cv2.COLOR_GRAY2BGR)

        # Apply standard medical JET colormap
        heatmap_u8 = np.uint8(255 * smoothed)
        colored_cam = cv2.applyColorMap(heatmap_u8, cv2.COLORMAP_JET)

        # Continuous smooth alpha blending: higher alpha on hot activations, fading seamlessly to 0 on clear areas
        alpha_mask = np.power(smoothed, 1.4) * 0.55
        alpha_3d = np.repeat(alpha_mask[:, :, np.newaxis], 3, axis=2)

        blended = np.uint8(np.clip(colored_cam * alpha_3d + base_bgr * (1.0 - alpha_3d), 0, 255))

        # Encode to JPEG base64 data URL
        success, enc = cv2.imencode('.jpg', blended, [cv2.IMWRITE_JPEG_QUALITY, 92])
        overlay_url = f"data:image/jpeg;base64,{base64.b64encode(enc).decode('utf-8')}" if success else None

        return smoothed, overlay_url

    def remove_hooks(self):
        for h in self.handles:
            h.remove()
        self.handles.clear()

# Backward-compatibility alias
GradCAM = MultiScaleGradCAMPlusPlus
