# Kokoro-FastAPI Queue handler for RunPod Serverless
FROM ghcr.io/remsky/kokoro-fastapi-gpu:latest

# Install RunPod SDK — base image manages deps with uv
RUN uv pip install --system runpod requests

COPY handler.py /handler.py

CMD ["python", "-u", "/handler.py"]
