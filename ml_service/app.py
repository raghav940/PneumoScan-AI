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
from preprocess import preprocess_image, preprocess_image_bytes, validate_radiograph, generate_compressed_thumbnail
from grad_cam import GradCAM
from db_models import db, User, PredictionRecord

app = Flask(__name__)
CORS(app)

# --- Configuration ---
# Use Supabase / PostgreSQL URI if set (supports DATABASE_URL or POSTGRES_URI), fallback to SQLite
database_url = os.environ.get('DATABASE_URL') or os.environ.get('POSTGRES_URI') or 'sqlite:///pneumoscan.db'
# Render / Supabase sometimes provides 'postgres://', SQLAlchemy requires 'postgresql://'
if database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'super-secret-jwt-key-pneumoscan-ai-secure-token-2026')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400  # 24 hours

# Initialize Extensions
db.init_app(app)
jwt = JWTManager(app)

# Ensure tables are created safely across workers
with app.app_context():
    try:
        db.create_all()
    except Exception:
        pass

# --- ML Model Initialization ---
model_path = 'pneumoscan.pt'
model = CNNModel()
if os.path.exists(model_path):
    model.load_weights(model_path, map_location='cpu')
    print("Trained ResNet-18 model weights loaded successfully.")
else:
    print("WARNING: Model weights not found. Using untrained model for inference testing.")

model.eval()

# Grad-CAM on layer4 of ResNet-18
grad_cam = GradCAM(model, model.resnet.layer4[-1])

def determine_severity(confidence, heatmap_max):
    if confidence < 0.60:
        return "Mild"
    elif confidence < 0.80:
        return "Moderate"
    elif confidence < 0.95:
        return "Severe"
    else:
        return "Critical"

# --- Health & Diagnostic Routes ---
@app.route('/health', methods=['GET'])
@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "PneumoScan AI Diagnostics API",
        "model_loaded": os.path.exists(model_path)
    }), 200

# --- Authentication Routes ---

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    role = data.get('role', 'user').strip()  # default to 'user', allow 'admin'

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 400

    password_hash = pbkdf2_sha256.hash(password)
    new_user = User(username=username, password_hash=password_hash, role=role)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully", "role": new_user.role}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    user = User.query.filter_by(username=username).first()
    if not user or not pbkdf2_sha256.verify(password, user.password_hash):
        return jsonify({"error": "Invalid username or password"}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        "access_token": access_token,
        "username": user.username,
        "role": getattr(user, 'role', 'user')
    }), 200

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
        
    image_bytes = file.read()
    
    # Validation Gate: Reject corrupted, non-radiographic, or blank uploads
    is_valid, validation_error = validate_radiograph(image_bytes)
    if not is_valid:
        return jsonify({"error": validation_error}), 400
    
    try:
        # In-memory preprocessing without saving to local server disk
        input_tensor = preprocess_image_bytes(image_bytes)
        
        # Genuine Inference
        with torch.set_grad_enabled(True):
            output = model(input_tensor)
            probabilities = F.softmax(output, dim=1)[0]
            
            predicted_class = torch.argmax(probabilities).item()
            confidence = probabilities[predicted_class].item()
            
            label = "Pneumonia" if predicted_class == 1 else "Normal"
            
            heatmap = grad_cam.generate_heatmap(input_tensor, predicted_class)
            severity = determine_severity(confidence, heatmap.max()) if predicted_class == 1 else "Normal"
            
            # Generate lightweight compressed thumbnail (~3-5 KB) for permanent database preview
            thumbnail_url = generate_compressed_thumbnail(image_bytes)
            
            # Save metadata to Database
            record = PredictionRecord(
                user_id=user_id,
                image_name=file.filename,
                image_url=thumbnail_url,
                prediction=label,
                confidence=confidence,
                severity=severity
            )
            db.session.add(record)
            db.session.commit()
            
            # Clinical Summary and Suggestion Logic
            if severity == "Normal":
                summary = "No abnormal opacities or consolidations detected in the lung fields. Clear cardiophrenic and costophrenic angles."
                suggestion = "Routine monitoring. No immediate medical intervention required based on this scan."
            elif severity in ["Mild", "Moderate"]:
                summary = "Patchy opacities detected, primarily indicative of early-stage or mild pneumonic infiltration."
                suggestion = "Recommend clinical correlation and potential outpatient antibiotic therapy. Follow-up imaging in 7-14 days."
            else: # Severe or Critical
                summary = "Extensive dense consolidations obscuring significant portions of the lung fields, indicative of severe bilateral or lobar pneumonia."
                suggestion = "URGENT: Recommend immediate hospitalization and aggressive medical intervention. Oxygen therapy and broad-spectrum IV antibiotics may be required."
            
            result = {
                "id": record.id,
                "prediction": label,
                "confidence": confidence,
                "severity": severity,
                "summary": summary,
                "suggestion": suggestion,
                "image_url": thumbnail_url,
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
    current_user = User.query.get(user_id)
    
    # Admin facility: if admin, allow viewing all records or filtered records
    if current_user and getattr(current_user, 'role', 'user') == 'admin':
        records = PredictionRecord.query.order_by(PredictionRecord.created_at.desc()).all()
    else:
        records = PredictionRecord.query.filter_by(user_id=user_id).order_by(PredictionRecord.created_at.desc()).all()
    
    results = []
    for r in records:
        uploader = User.query.get(r.user_id) if r.user_id else None
        results.append({
            "id": r.id,
            "image_name": getattr(r, 'image_name', None) or 'X-Ray Scan',
            "image_url": getattr(r, 'image_url', None),
            "uploader": uploader.username if uploader else "Anonymous",
            "prediction": r.prediction,
            "confidence": r.confidence,
            "severity": r.severity,
            "timestamp": r.created_at.isoformat() + "Z"
        })
        
    return jsonify(results), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)
