from fastapi import APIRouter, HTTPException
from app.models import (
    WaitTimePredictor,
    DemandPredictor,
    OverduePredictor,
    AnomalyDetector,
)
from app.schemas.wait_time import WaitTimeTrainRequest, WaitTimeTrainResponse
from app.schemas.demand import DemandTrainRequest, DemandTrainResponse
from app.schemas.overdue import OverdueTrainRequest, OverdueTrainResponse
from app.schemas.anomaly import AnomalyTrainRequest, AnomalyTrainResponse
from app.config import settings
from app.database import mongodb
from pandas import DataFrame
import pandas as pd
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

async def _save_model_to_mongodb(model_name: str, model_obj) -> None:
    """Guarda modelo serializado en MongoDB para persistencia."""
    if not mongodb.is_connected:
        logger.warning("MongoDB not connected, skipping save to DB")
        return

    try:
        import tempfile

        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".joblib", delete=False) as tmp:
                tmp_path = tmp.name
            model_obj.save(tmp_path)
            with open(tmp_path, "rb") as f:
                model_data = f.read()
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)

        collection = mongodb.get_collection("ml_models")
        await collection.update_one(
            {"model_name": model_name},
            {
                "$set": {
                    "model_name": model_name,
                    "model_data": model_data,
                    "metrics": model_obj.training_metrics,
                }
            },
            upsert=True,
        )
        logger.info(f"Model {model_name} saved to MongoDB")
    except Exception as e:
        logger.error(f"Failed to save model to MongoDB: {e}")

async def _save_model_to_disk(model_name: str, model_obj) -> None:
    """Guarda modelo en disco local como fallback."""
    os.makedirs(settings.models_dir, exist_ok=True)
    path = f"{settings.models_dir}/{model_name}.joblib"
    model_obj.save(path)

# TRAIN DATA FROM MONGODB
@router.post("/from-database")
async def train_from_database(model_type: str = "all"):
    """
    Entrena modelos usando datos directamente de MongoDB.
    """
    if not mongodb.is_connected:
        raise HTTPException(status_code=503, detail="Database not connected")

    try:
        # Extraer datos de MongoDB
        loans_cursor = mongodb.get_collection("loans").find({})
        products_cursor = mongodb.get_collection("products").find({})
        users_cursor = mongodb.get_collection("users").find({})

        loans_data = await loans_cursor.to_list(length=None)
        products_data = await products_cursor.to_list(length=None)
        users_data = await users_cursor.to_list(length=None)

        if not loans_data:
            raise HTTPException(status_code=400, detail="No loan records found")

        # Preparar datos
        from app.utils.data_preparation import prepare_training_data

        training_datasets = prepare_training_data(
            loans_data, products_data, users_data
        )

        results = {}

        if model_type in ("all", "wait_time") and "wait_time" in training_datasets:
            model = WaitTimePredictor()
            metrics = model.train(training_datasets["wait_time"])
            await _save_model_to_mongodb("wait_time", model)
            await _save_model_to_disk("wait_time", model)
            results["wait_time"] = metrics

        if model_type in ("all", "demand") and "demand" in training_datasets:
            model = DemandPredictor(threshold=settings.demand_threshold)
            metrics = model.train(training_datasets["demand"])
            await _save_model_to_mongodb("demand", model)
            await _save_model_to_disk("demand", model)
            results["demand"] = metrics

        if model_type in ("all", "overdue") and "overdue" in training_datasets:
            model = OverduePredictor(risk_threshold=settings.overdue_risk_threshold)
            metrics = model.train(training_datasets["overdue"])
            await _save_model_to_mongodb("overdue", model)
            await _save_model_to_disk("overdue", model)
            results["overdue"] = metrics

        if model_type in ("all", "anomaly") and "anomaly" in training_datasets:
            model = AnomalyDetector()
            metrics = model.train(training_datasets["anomaly"])
            await _save_model_to_mongodb("anomaly", model)
            await _save_model_to_disk("anomaly", model)
            results["anomaly"] = metrics

        return {
            "message": "Models trained successfully",
            "models_trained": list(results.keys()),
            "metrics": results,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# TRAIN WITH CUSTOM DATA
@router.post("/wait-time", response_model=WaitTimeTrainResponse)
async def train_wait_time(request: WaitTimeTrainRequest):
    """Entrena el modelo de tiempo de espera con datos personalizados."""
    try:
        df = DataFrame(request.data)
        model = WaitTimePredictor()
        metrics = model.train(df)

        await _save_model_to_mongodb("wait_time", model)
        await _save_model_to_disk("wait_time", model)

        return WaitTimeTrainResponse(
            message="Wait time model trained successfully",
            metrics=metrics,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/demand", response_model=DemandTrainResponse)
async def train_demand(request: DemandTrainRequest):
    """Entrena el modelo de demanda con datos personalizados."""
    try:
        df = DataFrame(request.data)
        model = DemandPredictor(threshold=settings.demand_threshold)
        metrics = model.train(df)

        await _save_model_to_mongodb("demand", model)
        await _save_model_to_disk("demand", model)

        return DemandTrainResponse(
            message="Demand model trained successfully",
            metrics=metrics,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/demand/from-database")
async def train_demand_from_database():
    """
    Entrena el modelo de demanda usando datos directamente de MongoDB.
    Construye features temporales y de ventanas (30d, 90d).
    """
    if not mongodb.is_connected:
        raise HTTPException(status_code=503, detail="Database not connected")

    try:
        predictor = DemandPredictor(threshold=settings.demand_threshold)
        data = await predictor.build_training_data_from_db(mongodb)

        if data.empty or len(data) < 5:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient data: {len(data)} records. Minimum 5 required."
            )

        metrics = predictor.train(data)

        # Validar umbral mínimo de calidad
        if metrics.get("f1", 0) < 0.5:
            logger.warning(
                f"Low F1 score: {metrics['f1']:.4f}. "
                "Model may not be reliable."
            )

        # Guardar en MongoDB y disco
        await _save_model_to_mongodb("demand", predictor)
        await _save_model_to_disk("demand", predictor)

        # Log histórico de métricas 
        if mongodb.is_connected:
            logs_coll = mongodb.get_collection("training_logs")
            await logs_coll.insert_one({
                "model_name": "demand",
                "metrics": metrics,
                "feature_importance": predictor.get_feature_importance(),
                "n_samples": len(data),
                "trained_at": pd.Timestamp.now().isoformat(),
            })

        return {
            "message": "Demand model trained from database successfully",
            "metrics": metrics,
            "feature_importance": predictor.get_feature_importance(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Demand training error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/overdue", response_model=OverdueTrainResponse)
async def train_overdue(request: OverdueTrainRequest):
    """Entrena el modelo de retrasos con datos personalizados."""
    try:
        df = DataFrame(request.data)
        model = OverduePredictor(risk_threshold=settings.overdue_risk_threshold)
        metrics = model.train(df)

        await _save_model_to_mongodb("overdue", model)
        await _save_model_to_disk("overdue", model)

        return OverdueTrainResponse(
            message="Overdue model trained successfully",
            metrics=metrics,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/anomaly", response_model=AnomalyTrainResponse)
async def train_anomaly(request: AnomalyTrainRequest):
    """Entrena el modelo de anomalías con datos personalizados."""
    try:
        df = DataFrame(request.data)
        model = AnomalyDetector()
        metrics = model.train(df)

        await _save_model_to_mongodb("anomaly", model)
        await _save_model_to_disk("anomaly", model)

        return AnomalyTrainResponse(
            message="Anomaly model trained successfully",
            metrics=metrics,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))