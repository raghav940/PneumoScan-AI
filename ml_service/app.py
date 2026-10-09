import os
import time
import json
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
from db import get_db_cursor, init_db

app = Flask(__name__)
CORS(app)

app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'super-secret-jwt-key-pneumoscan-ai-secure-token-2026')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400  # 24 hours
jwt = JWTManager(app)

# Initialize PostgreSQL Schema
try:
    init_db()
    print("PostgreSQL tables and indexes verified successfully via psycopg2.")
except Exception as e:
    print(f"Database initialization notice: {e}")

# Limit PyTorch CPU threads to 1 to reduce memory overhead on micro instances
torch.set_num_threads(1)
torch.set_num_interop_threads(1)

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
        "database": "PostgreSQL (psycopg2 direct)",
        "model_loaded": os.path.exists(model_path)
    }), 200

# --- Authentication Routes ---

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    role = data.get('role', 'user').strip()  # default to 'user'

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    password_hash = pbkdf2_sha256.hash(password)

    try:
        with get_db_cursor(commit=True) as cur:
            cur.execute("SELECT id FROM users WHERE username = %s;", (username,))
            if cur.fetchone():
                return jsonify({"error": "Username already exists"}), 400

            cur.execute(
                "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s) RETURNING id, role;",
                (username, password_hash, role)
            )
            row = cur.fetchone()
            return jsonify({"message": "User registered successfully", "id": row[0], "role": row[1]}), 201
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    try:
        with get_db_cursor() as cur:
            cur.execute("SELECT id, username, password_hash, role FROM users WHERE username = %s;", (username,))
            user = cur.fetchone()
            
            if not user or not pbkdf2_sha256.verify(password, user[2]):
                return jsonify({"error": "Invalid username or password"}), 401

            access_token = create_access_token(identity=str(user[0]))
            return jsonify({
                "access_token": access_token,
                "username": user[1],
                "role": user[3]
            }), 200
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

# --- User Management (Admin Only) ---

@app.route('/admin/users', methods=['GET'])
@jwt_required()
def admin_get_users():
    user_id = int(get_jwt_identity())
    with get_db_cursor() as cur:
        cur.execute("SELECT role FROM users WHERE id = %s;", (user_id,))
        caller = cur.fetchone()
        if not caller or caller[0] != 'admin':
            return jsonify({"error": "Unauthorized. Admin privileges required."}), 403

        cur.execute("""
            SELECT u.id, u.username, u.role, u.created_at, COUNT(p.id) as scan_count
            FROM users u
            LEFT JOIN predictions p ON p.user_id = u.id
            GROUP BY u.id, u.username, u.role, u.created_at
            ORDER BY u.created_at DESC;
        """)
        users = []
        for r in cur.fetchall():
            users.append({
                "id": r[0],
                "username": r[1],
                "role": r[2],
                "created_at": r[3].isoformat() + "Z" if r[3] else None,
                "scan_count": r[4]
            })
        return jsonify(users), 200

@app.route('/admin/users/<int:target_user_id>/role', methods=['PATCH'])
@jwt_required()
def admin_update_user_role(target_user_id):
    user_id = int(get_jwt_identity())
    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT role FROM users WHERE id = %s;", (user_id,))
        caller = cur.fetchone()
        if not caller or caller[0] != 'admin':
            return jsonify({"error": "Unauthorized. Admin privileges required."}), 403

        data = request.get_json() or {}
        new_role = data.get('role', 'user').strip()
        if new_role not in ['admin', 'user']:
            return jsonify({"error": "Invalid role. Must be 'admin' or 'user'."}), 400

        cur.execute("UPDATE users SET role = %s WHERE id = %s RETURNING id, username, role;", (new_role, target_user_id))
        updated = cur.fetchone()
        if not updated:
            return jsonify({"error": "User not found"}), 404

        return jsonify({"message": "User role updated successfully", "user": {"id": updated[0], "username": updated[1], "role": updated[2]}}), 200

@app.route('/admin/users/<int:target_user_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_user(target_user_id):
    user_id = int(get_jwt_identity())
    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT role FROM users WHERE id = %s;", (user_id,))
        caller = cur.fetchone()
        if not caller or caller[0] != 'admin':
            return jsonify({"error": "Unauthorized. Admin privileges required."}), 403

        if target_user_id == user_id:
            return jsonify({"error": "Cannot delete your own admin account."}), 400

        cur.execute("DELETE FROM predictions WHERE user_id = %s;", (target_user_id,))
        cur.execute("DELETE FROM users WHERE id = %s RETURNING id;", (target_user_id,))
        deleted = cur.fetchone()
        if not deleted:
            return jsonify({"error": "User not found"}), 404

        return jsonify({"message": f"User #{target_user_id} and all their records deleted successfully."}), 200

@app.route('/admin/analytics', methods=['GET'])
@jwt_required()
def admin_get_analytics():
    user_id = int(get_jwt_identity())
    with get_db_cursor() as cur:
        cur.execute("SELECT role FROM users WHERE id = %s;", (user_id,))
        caller = cur.fetchone()
        if not caller or caller[0] != 'admin':
            return jsonify({"error": "Unauthorized. Admin privileges required."}), 403

        # Aggregate hospital metrics
        cur.execute("SELECT COUNT(*) FROM predictions;")
        total_scans = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM users;")
        total_users = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM predictions WHERE prediction = 'Pneumonia';")
        pneumonia_count = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM predictions WHERE severity IN ('Severe', 'Critical');")
        critical_count = cur.fetchone()[0]

        cur.execute("SELECT AVG(confidence) FROM predictions;")
        avg_confidence = cur.fetchone()[0] or 0.0

        # Distribution by severity
        cur.execute("SELECT severity, COUNT(*) FROM predictions GROUP BY severity;")
        severity_dist = {r[0]: r[1] for r in cur.fetchall()}

        return jsonify({
            "total_scans": total_scans,
            "total_users": total_users,
            "pneumonia_count": pneumonia_count,
            "normal_count": total_scans - pneumonia_count,
            "critical_count": critical_count,
            "avg_confidence": round(float(avg_confidence) * 100, 1),
            "severity_distribution": severity_dist
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
    
    # Pre-upload Clinical Integrity Validation
    is_valid, reason = validate_radiograph(image_bytes)
    if not is_valid:
        return jsonify({"error": f"Invalid radiograph: {reason}"}), 422
        
    try:
        tensor = preprocess_image_bytes(image_bytes)
        
        with torch.no_grad():
            output = model(tensor)
            probs = F.softmax(output, dim=1)
            confidence, predicted = torch.max(probs, 1)
            
            label_idx = predicted.item()
            confidence = float(confidence.item())
            label = "Pneumonia" if label_idx == 1 else "Normal"

        # Layer-4 Grad-CAM Activation Map and Smooth Medical Jet Overlay
        with torch.enable_grad():
            heatmap, overlay_url = grad_cam.generate_overlay(
                tensor.clone(), 
                target_class=label_idx, 
                original_image_bytes=image_bytes
            )

        severity = determine_severity(confidence, float(heatmap.max())) if label == "Pneumonia" else "Normal"
        
        # Generate lightweight compressed thumbnail
        thumbnail_url = generate_compressed_thumbnail(image_bytes)
            
        # Clinical Summary and Suggestion Logic
        if severity == "Normal":
            summary = "No abnormal opacities or consolidations detected in the lung fields. Clear cardiophrenic and costophrenic angles."
            suggestion = "Radiograph is consistent with clear respiratory fields. Routine preventative screening recommended."
        elif severity in ["Mild", "Moderate"]:
            summary = "Patchy opacities detected, primarily indicative of early-stage or mild pneumonic infiltration."
            suggestion = "Recommend clinical correlation and potential outpatient antibiotic therapy. Follow-up imaging in 7-14 days."
        else: # Severe or Critical
            summary = "Extensive dense consolidations obscuring significant portions of the lung fields, indicative of severe bilateral or lobar pneumonia."
            suggestion = "URGENT: Recommend immediate hospitalization and aggressive medical intervention. Oxygen therapy and broad-spectrum IV antibiotics may be required."

        coords_json = json.dumps(heatmap.tolist())

        # Save full report directly using psycopg2
        # Use overlay_url if available so history viewer can render directly without client-side canvas
        stored_image_url = overlay_url or thumbnail_url

        with get_db_cursor(commit=True) as cur:
            cur.execute("""
                INSERT INTO predictions (
                    user_id, image_name, image_url, prediction, confidence, severity, summary, suggestion, grad_cam_data
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at;
            """, (
                user_id, file.filename, stored_image_url, label, confidence, severity, summary, suggestion, coords_json
            ))
            record_id, created_at = cur.fetchone()
        
        ts_str = (created_at or datetime.utcnow()).isoformat() + "Z"

        result = {
            "id": record_id,
            "prediction": label,
            "confidence": confidence,
            "severity": severity,
            "summary": summary,
            "suggestion": suggestion,
            "image_url": thumbnail_url,
            "heatmap_url": overlay_url,
            "grad_cam_coordinates": heatmap.tolist(),
            "timestamp": ts_str,
            "inference_ms": int((time.time() - start_time) * 1000)
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/history', methods=['GET'])
@jwt_required()
def history():
    user_id = int(get_jwt_identity())
    
    with get_db_cursor() as cur:
        # Check caller role
        cur.execute("SELECT role FROM users WHERE id = %s;", (user_id,))
        caller = cur.fetchone()
        is_admin = caller and caller[0] == 'admin'

        if is_admin:
            cur.execute("""
                SELECT p.id, p.image_name, p.image_url, p.prediction, p.confidence, p.severity,
                       p.summary, p.suggestion, p.grad_cam_data, p.created_at, u.username, u.role
                FROM predictions p
                LEFT JOIN users u ON p.user_id = u.id
                ORDER BY p.created_at DESC;
            """)
        else:
            cur.execute("""
                SELECT p.id, p.image_name, p.image_url, p.prediction, p.confidence, p.severity,
                       p.summary, p.suggestion, p.grad_cam_data, p.created_at, u.username, u.role
                FROM predictions p
                LEFT JOIN users u ON p.user_id = u.id
                WHERE p.user_id = %s
                ORDER BY p.created_at DESC;
            """, (user_id,))
        
        rows = cur.fetchall()
        results = []
        for r in rows:
            coords = None
            if r[8]:
                try:
                    coords = json.loads(r[8])
                except Exception:
                    coords = None

            results.append({
                "id": r[0],
                "image_name": r[1] or 'X-Ray Scan',
                "image_url": r[2],
                "prediction": r[3],
                "confidence": r[4],
                "severity": r[5],
                "summary": r[6] or "Radiograph analysis completed.",
                "suggestion": r[7] or "Clinical correlation recommended.",
                "grad_cam_coordinates": coords,
                "timestamp": r[9].isoformat() + "Z" if r[9] else None,
                "uploader": r[10] or "Anonymous",
                "uploader_role": r[11] or "user"
            })
            
        return jsonify(results), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)
