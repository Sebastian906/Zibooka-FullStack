from fastapi import APIRouter
from app.database import mongodb
from app.config import settings
import os

router = APIRouter()

@router.get("/health")
async def health_check():
    """Health check del microservicio."""
    db_status = "disconnected"
    try:
        if mongodb.is_connected:
            await mongodb.db.command("ping")
            db_status = "connected"
        else:
            db_status = "not_initialized"
    except Exception as e:
        db_status = f"error: {str(e)}"

    # Verificar modelos disponibles
    models_dir = settings.models_dir
    available_models = []
    if os.path.exists(models_dir):
        available_models = [
            f.replace(".joblib", "")
            for f in os.listdir(models_dir)
            if f.endswith(".joblib")
        ]

    return {
        "status": "healthy",
        "version": "0.1.0",
        "database": db_status,
        "models_dir": models_dir,
        "available_models": available_models,
    }

@router.get("/health/ready")
async def readiness_check():
    """Verifica si el servicio está listo para recibir tráfico."""
    if not mongodb.is_connected:
        return {"ready": False, "reason": "Database not connected"}
    return {"ready": True}