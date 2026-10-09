FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies required for OpenCV headless in one layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies in a single cached pass
COPY requirements.txt .
RUN pip install --no-cache-dir --timeout 60 \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.txt

# Copy only production application code and weights
COPY app.py model.py preprocess.py grad_cam.py db_models.py pneumoscan.pt ./

# Default port 7860, Render automatically sets $PORT (usually 10000)
ENV PORT=7860
EXPOSE 7860

# Run 1 worker with 2 lightweight threads to comfortably stay below 512MB RAM
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-7860} --workers 1 --threads 2 --timeout 120 app:app"]
