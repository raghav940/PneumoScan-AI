# PneumoScan-AI 🫁🤖

PneumoScan-AI is a full-stack, AI-powered diagnostic web application designed to assist medical professionals in identifying Pneumonia from chest X-ray images. It utilizes a pre-trained Deep Learning model for rapid, high-confidence inference, bundled in a modern, 3D glassmorphism interface.

## 🌟 Features
- **AI-Powered Diagnostics**: Uses a PyTorch deep learning model to accurately classify chest X-rays as "Normal" or "Pneumonia".
- **Visual Attention Heatmaps**: Implements Grad-CAM to generate visual heatmaps, highlighting the exact regions of the lungs that the AI focused on.
- **Secure Authentication**: Built-in user registration and login flow using JWT (JSON Web Tokens) and password hashing (PBKDF2).
- **Patient History Archive**: A secure database that saves historical predictions, severity gradings, and confidence scores for future reference.
- **Premium UI/UX**: A dark-themed, glassmorphic React frontend featuring smooth micro-interactions (Framer Motion) and beautiful iconography (Lucide).

## 🛠️ Tech Stack
**Frontend:**
- React (Vite)
- Tailwind CSS v4 (Glassmorphism & Animated Gradients)
- Framer Motion (Animations)
- Axios & React Router

**Backend:**
- Python (Flask)
- PyTorch & Torchvision (AI Inference Engine)
- Flask-SQLAlchemy (PostgreSQL / SQLite Database ORM)
- Flask-JWT-Extended & Passlib (Authentication)

## 🚀 Installation & Setup

### Prerequisites
- Python 3.9+
- Node.js 18+ & npm

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/PneumoScan-AI.git
cd PneumoScan-AI
```

### 2. Backend Setup (Flask API)
Open a terminal and navigate to the `ml_service` directory:
```bash
cd ml_service

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
# Note: Ensure PyTorch, Flask, Flask-SQLAlchemy, Flask-JWT-Extended, and Passlib are installed.

# Start the Backend Server
python app.py
```
*The backend will run on `http://127.0.0.1:5000`.*

### 3. Frontend Setup (React UI)
Open a **new** terminal and navigate to the `frontend` directory:
```bash
cd frontend

# Install Node dependencies
npm install

# Start the Vite Development Server
npm run dev
```
*The frontend will run on `http://localhost:5173`.*

## 💻 Usage
1. Open your browser and navigate to `http://localhost:5173`.
2. **Register** a new account.
3. **Log in** to access the Dashboard.
4. Drag and drop a chest X-ray image (JPEG/PNG) into the upload zone and click **Run AI Analysis**.
5. View the prediction, confidence score, severity grading, and the visual heatmap.
6. Navigate to the **History** tab to view your past diagnostic reports.

## 📜 License
This project is open-source and available under the [MIT License](LICENSE).
