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
import numpy as np
import os
import logging
from sklearn.preprocessing import LabelEncoder

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
            # Usar entrenamiento extendido con features de MongoDB
            try:
                extended_data = await _build_overdue_training_data_from_db()
                if not extended_data.empty and len(extended_data) >= 5:
                    model = OverduePredictor(
                        risk_threshold=settings.overdue_risk_threshold,
                        mode='extended'
                    )
                    metrics = model.train(extended_data)
                else:
                    # Fallback al modo básico
                    model = OverduePredictor(risk_threshold=settings.overdue_risk_threshold)
                    metrics = model.train(training_datasets["overdue"])
            except Exception as e:
                logger.warning(f"Extended overdue training failed, using basic: {e}")
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

@router.post("/overdue/from-database")
async def train_overdue_from_database():
    """
    Entrena el modelo de overdue usando datos directamente de MongoDB.
    Construye features extendidas (13 features) cuando es posible.
    """
    if not mongodb.is_connected:
        raise HTTPException(status_code=503, detail="Database not connected")

    try:
        predictor = OverduePredictor(
            risk_threshold=settings.overdue_risk_threshold,
            mode='extended'
        )

        # Construir dataset con features extendidas
        data = await _build_overdue_training_data_from_db()

        if data.empty or len(data) < 5:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient data: {len(data)} records. Minimum 5 required."
            )

        metrics = predictor.train(data)

        # Validar umbral mínimo de calidad
        if metrics.get("roc_auc", 0) < 0.6:
            logger.warning(
                f"Low AUC-ROC: {metrics['roc_auc']:.4f}. "
                "Model may not be reliable."
            )

        # Guardar en MongoDB y disco
        await _save_model_to_mongodb("overdue", predictor)
        await _save_model_to_disk("overdue", predictor)

        # Log histórico de métricas
        if mongodb.is_connected:
            logs_coll = mongodb.get_collection("training_logs")
            await logs_coll.insert_one({
                "model_name": "overdue",
                "metrics": metrics,
                "feature_importance": predictor.get_feature_importance(),
                "n_samples": len(data),
                "feature_mode": predictor.feature_mode,
                "trained_at": pd.Timestamp.now().isoformat(),
            })

        return {
            "message": "Overdue model trained from database successfully",
            "metrics": metrics,
            "feature_importance": predictor.get_feature_importance(),
            "feature_mode": predictor.feature_mode,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Overdue training error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


async def _build_overdue_training_data_from_db() -> pd.DataFrame:
    """
    Construye dataset de entrenamiento con features extendidas desde MongoDB.
    """
    loans_coll = mongodb.get_collection("loans")
    products_coll = mongodb.get_collection("products")

    # Obtener préstamos con resolución conocida
    pipeline = [
        {
            "$lookup": {
                "from": "products",
                "localField": "bookId",
                "foreignField": "_id",
                "as": "product",
            }
        },
        {"$unwind": "$product"},
        {"$match": {"status": {"$in": ["returned", "overdue"]}}},
        {
            "$project": {
                "userId": 1,
                "bookId": 1,
                "status": 1,
                "loanDate": 1,
                "dueDate": 1,
                "returnDate": 1,
                "category": "$product.category",
            }
        },
    ]

    cursor = loans_coll.aggregate(pipeline)
    loans = await cursor.to_list(length=None)

    if not loans:
        return pd.DataFrame()

    df = pd.DataFrame(loans)

    # Convertir ObjectId a string
    for col in ["userId", "bookId", "_id"]:
        if col in df.columns:
            df[col] = df[col].astype(str)

    # Convertir fechas
    df["loanDate"] = pd.to_datetime(df["loanDate"], errors="coerce")
    df["dueDate"] = pd.to_datetime(df["dueDate"], errors="coerce")
    df["returnDate"] = pd.to_datetime(df.get("returnDate"), errors="coerce")

    df = df.dropna(subset=["loanDate", "dueDate"])

    if len(df) < 5:
        return pd.DataFrame()

    # Construir features por usuario
    user_features = _build_user_features(df)

    # Construir features por libro
    book_features = _build_book_features(df)

    # Merge
    result = df.merge(user_features, on="userId", how="left")
    result = result.merge(book_features, on="bookId", how="left")

    # Features temporales
    result["day_of_week_loan"] = result["loanDate"].dt.dayofweek
    result["is_weekend"] = result["day_of_week_loan"].isin([5, 6]).astype(int)
    result["loan_hour"] = result["loanDate"].dt.hour

    # Category encoded
    le = LabelEncoder()
    result["category_encoded"] = le.fit_transform(
        result["category"].fillna("unknown").astype(str)
    )

    # Target
    result["is_overdue"] = (result["status"] == "overdue").astype(int)

    # Seleccionar columnas finales
    feature_columns = [
        "user_previous_loans_count",
        "user_overdue_count",
        "user_overdue_rate",
        "user_avg_late_days",
        "user_days_since_last_loan",
        "user_total_loans_completed",
        "book_overdue_rate",
        "book_total_loans",
        "book_avg_loan_duration",
        "day_of_week_loan",
        "category_encoded",
        "is_weekend",
        "loan_hour",
        "is_overdue",
    ]

    # Asegurar que todas las columnas existen
    for col in feature_columns:
        if col not in result.columns:
            result[col] = 0

    return result[feature_columns].dropna()


def _build_user_features(df: pd.DataFrame) -> pd.DataFrame:
    """Construye features de usuario."""
    user_stats = []

    for user_id, group in df.groupby("userId"):
        group_sorted = group.sort_values("loanDate")

        previous_loans = len(group_sorted)
        overdue_count = len(group_sorted[group_sorted["status"] == "overdue"])
        overdue_rate = overdue_count / previous_loans if previous_loans > 0 else 0

        # Calcular días promedio de retraso
        late_days = []
        for _, row in group_sorted.iterrows():
            if row["status"] == "overdue" and pd.notna(row["returnDate"]) and pd.notna(row["dueDate"]):
                late = max(0, (row["returnDate"] - row["dueDate"]).days)
                late_days.append(late)

        avg_late_days = np.mean(late_days) if late_days else 0

        # Días desde último préstamo
        last_loan_date = group_sorted["loanDate"].iloc[-1]
        days_since_last = (pd.Timestamp.now() - last_loan_date).days

        # Préstamos completados
        completed = len(group_sorted[group_sorted["status"] == "returned"])

        user_stats.append({
            "userId": user_id,
            "user_previous_loans_count": previous_loans,
            "user_overdue_count": overdue_count,
            "user_overdue_rate": overdue_rate,
            "user_avg_late_days": avg_late_days,
            "user_days_since_last_loan": max(0, days_since_last),
            "user_total_loans_completed": completed,
        })

    return pd.DataFrame(user_stats)


def _build_book_features(df: pd.DataFrame) -> pd.DataFrame:
    """Construye features de libro."""
    book_stats = []

    for book_id, group in df.groupby("bookId"):
        total_loans = len(group)
        overdue_count = len(group[group["status"] == "overdue"])
        overdue_rate = overdue_count / total_loans if total_loans > 0 else 0

        # Duración promedio
        durations = []
        for _, row in group.iterrows():
            if pd.notna(row["returnDate"]) and pd.notna(row["loanDate"]):
                duration = (row["returnDate"] - row["loanDate"]).days
                durations.append(duration)

        avg_duration = np.mean(durations) if durations else 14

        book_stats.append({
            "bookId": book_id,
            "book_total_loans": total_loans,
            "book_overdue_rate": overdue_rate,
            "book_avg_loan_duration": avg_duration,
        })

    return pd.DataFrame(book_stats)