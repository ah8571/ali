# Thin wrapper for Kokoro-FastAPI — adds /ping health check for RunPod load balancers
FROM ghcr.io/remsky/kokoro-fastapi-gpu:latest

COPY runpod_start.py /app/runpod_start.py

# Override entrypoint — RunPod sets PORT, we add /ping route then start the real server
CMD ["python", "/app/runpod_start.py"]
