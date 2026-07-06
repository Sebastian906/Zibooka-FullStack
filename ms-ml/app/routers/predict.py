from fastapi import APIRouter, HTTPException
from app.models import (
    WaitTimePredictor,
    DemandPredictor,
    OverduePredictor,
    AnomalyDetector,
)
from app.schemas.wait_time import WaitTimeRequest, WaitTimeResponse
from app.schemas.demand import DemandRequest, DemandResponse
from app.schemas.overdue import OverdueRequest, OverdueResponse
from app.schemas.anomaly import AnomalyRequest, AnomalyResponse
from app.config import settings
from app.database import mongodb
from pandas import DataFrame
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Cache de modelos en memoria
_models: dict[str, object] = {}

async def _get_model(model_class, model_name: str):
    """Obtiene modelo del cache o carga desde MongoDB."""
    if model_name in _models:
        return _models[model_name]

    # Intentar cargar desde MongoDB
    if mongodb.is_connected:
        try:
            collection = mongodb.get_collection("ml_models")
            model_doc = await collection.find_one({"model_name": model_name})
            if model_doc:
                import tempfile
                import os

                with tempfile.NamedTemporaryFile(
                    suffix=".joblib", delete=False
                ) as tmp:
                    tmp.write(model_doc["model_data"])
                    tmp_path = tmp.name

                try:
                    loaded = model_class.load(tmp_path)
                    _models[model_name] = loaded
                    return loaded
                finally:
                    os.unlink(tmp_path)
        except Exception as e:
            logger.warning(f"Failed to load model from MongoDB: {e}")

    # Intentar cargar desde disco local
    try:
        loaded = model_class.load(f"{settings.models_dir}/{model_name}.joblib")
        _models[model_name] = loaded
        return loaded
    except FileNotFoundError:
        return None

# WAIT TIME 
@router.post("/wait-time", response_model=WaitTimeResponse)
async def predict_wait_time(request: WaitTimeRequest):
    """Predice el tiempo de espera para un préstamo."""
    model = await _get_model(WaitTimePredictor, "wait_time")
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not available. Train the model first.",
        )

    try:
        features_df = DataFrame([request.model_dump()])
        prediction = model.predict(features_df)
        wait_days = float(prediction[0])

        # Calcular confianza basada en métricas del modelo
        r2 = model.training_metrics.get("r2", 0)
        if r2 > 0.7:
            confidence = "high"
        elif r2 > 0.4:
            confidence = "medium"
        else:
            confidence = "low"

        return WaitTimeResponse(
            predicted_wait_days=round(wait_days, 2),
            confidence=confidence,
        )
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# DEMAND
@router.post("/demand", response_model=DemandResponse)
async def predict_demand(request: DemandRequest):
    """Predice si un libro tendrá alta demanda."""
    model = await _get_model(DemandPredictor, "demand")
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not available. Train the model first.",
        )

    try:
        features_df = DataFrame([request.model_dump()])
        prediction = model.predict(features_df)
        proba = model.predict_proba(features_df)

        return DemandResponse(
            is_high_demand=bool(prediction[0]),
            probability=round(float(proba[0][1]), 4),
        )
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# OVERDUE 
@router.post("/overdue", response_model=OverdueResponse)
async def predict_overdue(request: OverdueRequest):
    """Predice el riesgo de retraso en devolución."""
    model = await _get_model(OverduePredictor, "overdue")
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not available. Train the model first.",
        )

    try:
        features_df = DataFrame([request.model_dump()])
        risk_scores = model.predict_risk(features_df)
        risk_score = float(risk_scores[0])

        return OverdueResponse(
            risk_score=round(risk_score, 4),
            is_high_risk=risk_score >= settings.overdue_risk_threshold,
        )
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ANOMALY
@router.post("/anomaly", response_model=AnomalyResponse)
async def predict_anomaly(request: AnomalyRequest):
    """Detecta comportamientos anómalos."""
    model = await _get_model(AnomalyDetector, "anomaly")
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not available. Train the model first.",
        )

    try:
        features_df = DataFrame([request.model_dump()])
        prediction = model.predict(features_df)
        score = model.predict_score(features_df)

        return AnomalyResponse(
            is_anomaly=bool(prediction[0] == -1),
            anomaly_score=round(float(score[0]), 4),
        )
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))