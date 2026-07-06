import joblib
import os
import logging
from typing import Any

logger = logging.getLogger(__name__)

def save_model(model: Any, path: str) -> None:
    """Guarda modelo serializado en disco."""
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else ".", exist_ok=True)
    joblib.dump(model, path)
    logger.info(f"Model saved to {path}")

def load_model(path: str) -> Any:
    """Carga modelo serializado desde disco."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model file not found: {path}")
    model = joblib.load(path)
    logger.info(f"Model loaded from {path}")
    return model

def model_to_bytes(model: Any) -> bytes:
    """Convierte modelo a bytes para almacenamiento en DB."""
    import io

    buffer = io.BytesIO()
    joblib.dump(model, buffer)
    return buffer.getvalue()

def bytes_to_model(data: bytes) -> Any:
    """Convierte bytes a modelo."""
    import io

    buffer = io.BytesIO(data)
    return joblib.load(buffer)