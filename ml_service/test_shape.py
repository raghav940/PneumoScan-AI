import torch
state_dict = torch.load('pneumoscan.pt', map_location='cpu')
print("model.fc.1.weight:", state_dict.get('model.fc.1.weight').shape)
if 'model.fc.0.weight' in state_dict:
    print("model.fc.0.weight:", state_dict['model.fc.0.weight'].shape)
