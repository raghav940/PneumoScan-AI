# PneumoScan-AI: Model Training Documentation

## 1. Overview & Objective
This document outlines the complete training lifecycle for the **PneumoScan-AI** chest X-ray classification engine. The goal was to build an authentic, production-grade deep learning model that accurately classifies frontal chest radiographs into **NORMAL** and **PNEUMONIA** categories while generating genuine **Grad-CAM (Gradient-Weighted Class Activation Mapping)** heatmaps to pinpoint pulmonary opacities.

---

## 2. Dataset Selection & Clinical Context
- **Dataset**: [Chest X-Ray Images (Pneumonia)](https://www.kaggle.com/datasets/paultimothymooney/chest-xray-pneumonia) by Paul Mooney / Kermany et al.
- **Source**: Guangzhou Women and Children’s Medical Center.
- **Total Images**: ~5,856 frontal chest radiographs.
- **Classes**:
  - `0: NORMAL` (~1,341 training images)
  - `1: PNEUMONIA` (~3,875 training images, comprising bacterial and viral etiologies)
- **Class Imbalance**: Approximately 1:2.89 ratio (Normal vs. Pneumonia).
- **Validation Strategy**:
  - Rather than relying solely on the dataset's small default 16-image `val` folder, an **85% / 15% random split** (with fixed seed `42`) was extracted from the full training set.
  - The independent **624-image test set** (`dataset/test`) was reserved exclusively for final generalization evaluation.

---

## 3. Preprocessing & Radiographic Pipeline
Medical radiographs are physical density maps. To prevent color-cast bias, hospital display tint variations, and screen capture artifacts, the following preprocessing transformations were applied:

1. **Single-Channel Grayscale Conversion**:
   - Every image is explicitly converted to 1-channel grayscale (`L` mode), enforcing strict invariance to web JPEG color artifacts.
2. **Spatial Normalization**:
   - Resized to $224 \times 224$ pixels using bilinear interpolation to match the deep convolutional receptive fields.
3. **Data Augmentation (Train only)**:
   - Random horizontal flips ($p = 0.5$).
   - Random rotation ($\pm 10^\circ$) to simulate slight patient tilt during clinical exposure.
   - Minor brightness and contrast jitter ($\pm 10\%$) to account for differing radiological tube voltage ($kVp$) settings.
4. **Tensor Standardization**:
   - Converted to PyTorch `float32` tensors in range $[0.0, 1.0]$.

---

## 4. Model Architecture: Adapted ResNet-18
- **Base Architecture**: ResNet-18 (Deep Residual Learning with 18 parametric layers).
- **Transfer Learning**: Pre-trained ImageNet weights (`IMAGENET1K_V1`) utilized as initialization for low-level edge and texture detection.
- **Grayscale Layer 1 Adaptation (`conv1`)**:
  - Standard ResNet accepts 3 RGB channels.
  - Replaced `conv1` with `nn.Conv2d(1, 64, kernel_size=7, stride=2, padding=3, bias=False)`.
  - Initialized weights by averaging the three RGB ImageNet channels across channel dimension 1:
    $$\mathbf{W}_{\text{conv1}} = \frac{1}{3}\sum_{c=1}^{3} \mathbf{W}_{\text{RGB}, c}$$
- **Classification Head**:
  - Global average pooling followed by:
    - `nn.Dropout(p=0.5)` for regularization against overfitting.
    - `nn.Linear(512, 2)` outputting unnormalized logits for the two classes.

---

## 5. Loss Function & Optimization Strategy
- **Weighted Cross-Entropy Loss**:
  To counter the ~1:3 class imbalance, loss weights were dynamically computed:
  $$w_c = \frac{N_{\text{total}}}{2 \times N_c}$$
  $$\text{Weight}_{\text{Normal}} \approx 1.96, \quad \text{Weight}_{\text{Pneumonia}} \approx 0.67$$
- **Optimizer**: AdamW with learning rate $\eta = 1 \times 10^{-4}$ and weight decay $\lambda = 1 \times 10^{-2}$.
- **Learning Rate Scheduler**: Cosine Annealing scheduler (`T_max = 8`).
- **Batch Size**: 32 samples per mini-batch.
- **Epochs**: 8 epochs on NVIDIA T4 Cloud GPU.

---

## 6. Training Execution via Kaggle API
The training was orchestrated directly through the Kaggle CLI and Cloud GPU infrastructure:
1. **Kaggle Notebook**: `anujkondawar/raghav-pneumonia`
2. **GPU Accelerator**: NVIDIA Tesla T4 (`enable_gpu: true`).
3. **Execution Command**:
   ```bash
   kaggle kernels push -p kaggle_kernel
   ```
4. **Execution Monitoring**:
   - Tracked kernel status until `KernelWorkerStatus.COMPLETE`.
5. **Output Retrieval**:
   - Downloaded `pneumoscan.pt` (~44.8 MB) containing the trained model `state_dict`.

---

## 7. Model Verification & Grad-CAM Integration
The downloaded checkpoint was tested locally on CPU:
- **Weights Integrity**: All 122 parameter tensors verified with zero NaN/null values.
- **Direct PyTorch Inference**:
  - Model outputs raw logits directly through `torch.softmax(dim=1)` without any artificial biases or temperature distortion.
- **Grad-CAM Verification**:
  - Forward and backward hooks attached to `model.layer4[-1]`.
  - Gradient pooling and ReLU thresholding produced genuine $224 \times 224$ normalized activation matrices highlighting pathological consolidation areas in the lung fields.

---

## 8. Artifact Locations
- **Trained Model Weights**: `ml_service/pneumoscan.pt`
- **Kaggle Kernel Source**: `kaggle_kernel/raghav-pneumonia.ipynb`
- **Local Training Script**: `ml_service/train_kaggle.py`
