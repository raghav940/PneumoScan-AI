import os
import time
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from passlib.hash import pbkdf2_sha256
import torch
import torch.nn.functional as F

from model import CNNModel
from preprocess import preprocess_image
from grad_cam import GradCAM
from db_models import db, User, PredictionRecord

app = Flask(__name__)
CORS(app)

# --- Configuration ---
# Use SQLite for quick local demo if POSTGRES_URI is not set
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('POSTGRES_URI', 'sqlite:///pneumoscan.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'super-secret-jwt-key'  # Change in production!
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 3600  # 1 hour

# Initialize Extensions
db.init_app(app)
jwt = JWTManager(app)

# Ensure tables are created
with app.app_context():
    db.create_all()

# --- ML Model Initialization ---
model_path = 'pneumoscan.pt'
model = CNNModel()
if os.path.exists(model_path):
    model.load_state_dict(torch.load(model_path, map_location='cpu'))
    print("Model weights loaded successfully.")
else:
    print("WARNING: Model weights not found. Using untrained model for inference testing.")

model.eval()

# Grad-CAM on the last conv layer of ResNet18
grad_cam = GradCAM(model, model.model.layer4[-1])

def determine_severity(confidence, heatmap_max):
    if confidence < 0.5:
        return "Normal"
    elif confidence < 0.7:
        return "Mild"
    elif confidence < 0.9:
        return "Moderate"
    elif confidence < 0.98:
        return "Severe"
    else:
        return "Critical"

# --- Authentication Routes ---

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 400

    password_hash = pbkdf2_sha256.hash(password)
    new_user = User(username=username, password_hash=password_hash)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()
    if not user or not pbkdf2_sha256.verify(password, user.password_hash):
        return jsonify({"error": "Invalid username or password"}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": access_token, "username": user.username}), 200

# --- Prediction Routes ---

@app.route('/predict', methods=['POST'])
@jwt_required()
def predict():
    user_id = int(get_jwt_identity())
    start_time = time.time()
    
    if 'image' not in request.files:
        return jsonify({"error": "No image part in the request"}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    # Ensure uploads directory exists
    uploads_dir = 'uploads'
    os.makedirs(uploads_dir, exist_ok=True)
    
    # Save file with timestamp to prevent overwriting
    filename = f"{user_id}_{int(time.time())}_{file.filename}"
    file_path = os.path.join(uploads_dir, filename)
    file.save(file_path)
    
    try:
        # Preprocess
        input_tensor = preprocess_image(file_path)
        
        # Inference
        with torch.set_grad_enabled(True):
            output = model(input_tensor)
            probabilities = F.softmax(output, dim=1)[0]
            
            predicted_class = torch.argmax(probabilities).item()
            confidence = probabilities[predicted_class].item()
            
            label = "Pneumonia" if predicted_class == 1 else "Normal"
            
            heatmap = grad_cam.generate_heatmap(input_tensor, predicted_class)
            severity = determine_severity(confidence, heatmap.max()) if predicted_class == 1 else "Normal"
            
            # Save to Database
            record = PredictionRecord(
                user_id=user_id,
                image_path=file_path,
                prediction=label,
                confidence=confidence,
                severity=severity
            )
            db.session.add(record)
            db.session.commit()
            
            result = {
                "id": record.id,
                "prediction": label,
                "confidence": confidence,
                "severity": severity,
                "grad_cam_coordinates": heatmap.tolist(),
                "timestamp": record.created_at.isoformat() + "Z",
                "inference_ms": int((time.time() - start_time) * 1000)
            }
            
            return jsonify(result), 200
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/history', methods=['GET'])
@jwt_required()
def history():
    user_id = int(get_jwt_identity())
    records = PredictionRecord.query.filter_by(user_id=user_id).order_by(PredictionRecord.created_at.desc()).all()
    
    results = []
    for r in records:
        results.append({
            "id": r.id,
            "prediction": r.prediction,
            "confidence": r.confidence,
            "severity": r.severity,
            "timestamp": r.created_at.isoformat() + "Z"
        })
        
    return jsonify(results), 200

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)
