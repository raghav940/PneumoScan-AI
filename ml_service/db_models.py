from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='user', nullable=False)  # 'user' or 'admin'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    predictions = db.relationship('PredictionRecord', backref='user', lazy=True)

class PredictionRecord(db.Model):
    __tablename__ = 'predictions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    image_name = db.Column(db.String(255), nullable=True)
    image_url = db.Column(db.Text, nullable=True)  # Supabase public CDN URL or compressed Base64 data URL
    prediction = db.Column(db.String(50), nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    severity = db.Column(db.String(50), nullable=False)
    summary = db.Column(db.Text, nullable=True)
    suggestion = db.Column(db.Text, nullable=True)
    grad_cam_data = db.Column(db.Text, nullable=True) # Compressed JSON coordinates
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

