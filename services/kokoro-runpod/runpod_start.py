"""Startup wrapper — injects /ping route then launches Kokoro-FastAPI."""
import uvicorn
from api.src.main import app

# RunPod load balancer health check
@app.get("/ping")
async def ping():
    return {"status": "healthy"}

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8880))
    uvicorn.run(app, host="0.0.0.0", port=port)
