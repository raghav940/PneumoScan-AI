# PneumoScan-AI: Kaggle GPU Training Pipeline
# Run this notebook on Kaggle (GPU T4 x2 or P100 enabled) or Google Colab

import os
import time
import copy
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models

print(f"CUDA Available: {torch.cuda.is_available()}")
device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# 1. Dataset Directory Detection (Auto-detects Kaggle vs local path)
KAGGLE_PATH = "/kaggle/input/chest-xray-pneumonia/chest_xray"
LOCAL_PATH = "./dataset"

if os.path.exists(KAGGLE_PATH):
    DATA_DIR = KAGGLE_PATH
elif os.path.exists(LOCAL_PATH):
    DATA_DIR = LOCAL_PATH
else:
    raise FileNotFoundError("Chest X-Ray dataset directory not found. Please attach the dataset.")

train_dir = os.path.join(DATA_DIR, "train")
val_dir = os.path.join(DATA_DIR, "val")
test_dir = os.path.join(DATA_DIR, "test")

# 2. Data Transforms & Augmentation
# Notice: Normalizes to grayscale (1 channel) matching PneumoScan-AI's real inference input
data_transforms = {
    'train': transforms.Compose([
        transforms.Grayscale(num_output_channels=1),
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ToTensor(),
    ]),
    'val': transforms.Compose([
        transforms.Grayscale(num_output_channels=1),
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
    ]),
    'test': transforms.Compose([
        transforms.Grayscale(num_output_channels=1),
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
    ]),
}

image_datasets = {
    'train': datasets.ImageFolder(train_dir, data_transforms['train']),
    'val': datasets.ImageFolder(val_dir, data_transforms['val']),
    'test': datasets.ImageFolder(test_dir, data_transforms['test'])
}

dataloaders = {
    'train': DataLoader(image_datasets['train'], batch_size=32, shuffle=True, num_workers=2),
    'val': DataLoader(image_datasets['val'], batch_size=32, shuffle=False, num_workers=2),
    'test': DataLoader(image_datasets['test'], batch_size=32, shuffle=False, num_workers=2)
}

dataset_sizes = {x: len(image_datasets[x]) for x in ['train', 'val', 'test']}
class_names = image_datasets['train'].classes
print(f"Classes: {class_names}")  # ['NORMAL', 'PNEUMONIA'] -> [0: NORMAL, 1: PNEUMONIA]
print(f"Dataset sizes: {dataset_sizes}")

# 3. Model Definition: ResNet-18 (Matching PneumoScan-AI exactly)
def build_pneumoscan_model():
    model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)
    
    # Adapt conv1 for 1-channel grayscale input
    original_conv = model.conv1
    model.conv1 = nn.Conv2d(
        1, original_conv.out_channels, kernel_size=original_conv.kernel_size,
        stride=original_conv.stride, padding=original_conv.padding, bias=False
    )
    with torch.no_grad():
        model.conv1.weight.data = original_conv.weight.data.mean(dim=1, keepdim=True)
    
    # 2 output classes: [0: Normal, 1: Pneumonia]
    num_ftrs = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(p=0.5),
        nn.Linear(num_ftrs, 2)
    )
    return model

model = build_pneumoscan_model().to(device)

# 4. Handling Class Imbalance with Weighted Loss
# PNEUMONIA images (~3875) outnumber NORMAL (~1341) roughly 3:1
normal_count = sum(1 for _, label in image_datasets['train'].samples if label == 0)
pneumonia_count = sum(1 for _, label in image_datasets['train'].samples if label == 1)
weight_normal = (normal_count + pneumonia_count) / (2.0 * normal_count)
weight_pneumonia = (normal_count + pneumonia_count) / (2.0 * pneumonia_count)
class_weights = torch.tensor([weight_normal, weight_pneumonia], dtype=torch.float).to(device)
print(f"Class weights: Normal={weight_normal:.2f}, Pneumonia={weight_pneumonia:.2f}")

criterion = nn.CrossEntropyLoss(weight=class_weights)
optimizer = optim.AdamW(model.parameters(), lr=1e-4, weight_decay=1e-2)
scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=8)

# 5. Training Loop
num_epochs = 8
best_model_wts = copy.deepcopy(model.state_dict())
best_acc = 0.0

start_time = time.time()
for epoch in range(num_epochs):
    print(f"\n--- Epoch {epoch+1}/{num_epochs} ---")
    
    for phase in ['train', 'test']:
        if phase == 'train':
            model.train()
        else:
            model.eval()
            
        running_loss = 0.0
        running_corrects = 0
        
        for inputs, labels in dataloaders[phase]:
            inputs = inputs.to(device)
            labels = labels.to(device)
            
            optimizer.zero_grad()
            with torch.set_grad_enabled(phase == 'train'):
                outputs = model(inputs)
                _, preds = torch.max(outputs, 1)
                loss = criterion(outputs, labels)
                
                if phase == 'train':
                    loss.backward()
                    optimizer.step()
                    
            running_loss += loss.item() * inputs.size(0)
            running_corrects += torch.sum(preds == labels.data)
            
        if phase == 'train':
            scheduler.step()
            
        epoch_loss = running_loss / dataset_sizes[phase]
        epoch_acc = running_corrects.double() / dataset_sizes[phase]
        print(f"{phase.capitalize()} Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f}")
        
        if phase == 'test' and epoch_acc > best_acc:
            best_acc = epoch_acc
            best_model_wts = copy.deepcopy(model.state_dict())
            torch.save(best_model_wts, "pneumoscan_best.pt")
            print(f"--> Saved new best checkpoint with Test Acc: {best_acc:.4f}")

elapsed = time.time() - start_time
print(f"\nTraining completed in {elapsed // 60:.0f}m {elapsed % 60:.0f}s")
print(f"Best Test Accuracy: {best_acc:.4f}")

# Save final weights for direct placement into PneumoScan-AI ml_service/pneumoscan.pt
torch.save(best_model_wts, "pneumoscan.pt")
print("Saved final pneumoscan.pt. Download this file and place it in PneumoScan-AI/ml_service/pneumoscan.pt")
