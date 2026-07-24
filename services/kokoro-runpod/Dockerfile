# Kokoro-FastAPI Queue handler for RunPod Serverless
FROM ghcr.io/remsky/kokoro-fastapi-gpu:latest

# Install RunPod SDK — base image uses uv with a venv at /app/.venv
RUN /app/.venv/bin/pip install --no-cache-dir runpod requests

COPY handler.py /handler.py

CMD ["/app/.venv/bin/python", "-u", "/handler.py"]
