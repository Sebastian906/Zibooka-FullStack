from fastapi import APIRouter, HTTPException
from app.models import (
    WaitTimePredictor,
    DemandPredictor,
    OverduePredictor,
    AnomalyDetector,
    ShelfAnomalyDetector,
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

@router.post("/wait-time/from-database")
async def train_wait_time_from_database():
    """
    Entrena el modelo de tiempo de espera usando datos reales de reservas.
    
    Construye las 6 features del modelo desde MongoDB:
    - Reservaciones cumplidas → wait_days, queue_position
    - Productos → category
    - Préstamos → book_return_rate_30d
    """
    if not mongodb.is_connected:
        raise HTTPException(status_code=503, detail="Database not connected")

    try:
        data = await _build_wait_time_training_data_from_db()

        if data.empty or len(data) < 5:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient reservation data: {len(data)} records. "
                       "Minimum 5 fulfilled reservations required.",
            )

        predictor = WaitTimePredictor()
        metrics = predictor.train(data)

        # Validar calidad mínima
        if metrics.get("rmse", 999) > 30:
            logger.warning(
                f"High RMSE: {metrics['rmse']:.2f}. Model may not be reliable."
            )

        await _save_model_to_mongodb("wait_time", predictor)
        await _save_model_to_disk("wait_time", predictor)

        # Log de entrenamiento
        if mongodb.is_connected:
            logs_coll = mongodb.get_collection("training_logs")
            await logs_coll.insert_one({
                "model_name": "wait_time",
                "metrics": metrics,
                "feature_importance": predictor.get_feature_importance(),
                "n_samples": len(data),
                "trained_at": pd.Timestamp.now().isoformat(),
            })

        return {
            "message": "Wait time model trained from database successfully",
            "metrics": metrics,
            "feature_importance": predictor.get_feature_importance(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Wait time training error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

async def _build_wait_time_training_data_from_db() -> pd.DataFrame:
    """
    Construye dataset de entrenamiento para WaitTimePredictor.
    
    Target: wait_days = días entre createdAt y fulfilledAt de reservas
    cumplidas.
    
    Features por cada reserva fulfilled:
    - queue_position: priority original de la reserva
    - category_encoded: categoría del libro
    - historical_avg_wait_days: promedio histórico de espera del libro
    - book_return_rate_30d: tasa de devolución del libro últimos 30 días
    - total_active_reservations: reservas pending al momento de la reserva
    - stock_was_zero_days: días sin stock al momento de la reserva
    """
    reservations_coll = mongodb.get_collection("reservations")
    products_coll = mongodb.get_collection("products")
    loans_coll = mongodb.get_collection("loans")

    # Obtener todas las reservas cumplidas con datos del producto
    pipeline = [
        {"$match": {"status": "fulfilled"}},
        {
            "$lookup": {
                "from": "products",
                "localField": "bookId",
                "foreignField": "_id",
                "as": "product",
            }
        },
        {"$unwind": "$product"},
        {
            "$project": {
                "bookId": 1,
                "priority": 1,
                "requestDate": 1,
                "updatedAt": 1,
                "category": "$product.category",
                "inStock": "$product.inStock",
            }
        },
    ]

    cursor = reservations_coll.aggregate(pipeline)
    reservations = await cursor.to_list(length=None)

    if not reservations:
        return pd.DataFrame()

    df = pd.DataFrame(reservations)

    # Convertir ObjectId a string
    if "bookId" in df.columns:
        df["bookId"] = df["bookId"].astype(str)

    # Convertir fechas
    df["requestDate"] = pd.to_datetime(df["requestDate"], errors="coerce")
    df["updatedAt"] = pd.to_datetime(df["updatedAt"], errors="coerce")
    df = df.dropna(subset=["requestDate", "updatedAt"])

    # Target
    df["wait_days"] = (df["updatedAt"] - df["requestDate"]).dt.days

    # Filtrar outliers
    df = df[df["wait_days"] <= 90]
    df = df[df["wait_days"] >= 0]

    if len(df) < 5:
        return pd.DataFrame()

    # Para cada reserva, calcular features contextuales
    rows = []
    now = pd.Timestamp.utcnow()
    cutoff_30d = now - pd.Timedelta(days=30)

    for _, row in df.iterrows():
        book_id = row["bookId"]

        # historical_avg_wait_days: promedio de reservas fulfilled ANTES de esta
        hist_pipeline = [
            {
                "$match": {
                    "bookId": row["bookId"]
                    if isinstance(row["bookId"], str)
                    else row["bookId"],
                    "status": "fulfilled",
                    "updatedAt": {"$lt": row["requestDate"]},
                }
            },
            {
                "$project": {
                    "wait_days": {
                        "$divide": [
                            {"$subtract": ["$updatedAt", "$requestDate"]},
                            86400000,
                        ]
                    }
                }
            },
            {"$group": {"_id": None, "avg_wait": {"$avg": "$wait_days"}}},
        ]
        try:
            hist_result = await reservations_coll.aggregate(
                hist_pipeline
            ).to_list(1)
            hist_avg = (
                float(hist_result[0]["avg_wait"]) if hist_result else 0.0
            )
        except Exception:
            hist_avg = 0.0

        # book_return_rate_30d
        try:
            book_oid = row["bookId"]
            total_30d = await loans_coll.count_documents(
                {
                    "bookId": book_oid
                    if not isinstance(book_oid, str)
                    else {"$oid": book_oid}
                    if len(book_oid) == 24
                    else book_oid,
                    "loanDate": {"$gte": cutoff_30d.to_pydatetime()},
                }
            )
            returned_30d = await loans_coll.count_documents(
                {
                    "bookId": book_oid
                    if not isinstance(book_oid, str)
                    else {"$oid": book_oid}
                    if len(book_oid) == 24
                    else book_oid,
                    "loanDate": {"$gte": cutoff_30d.to_pydatetime()},
                    "status": "returned",
                }
            )
            return_rate = returned_30d / total_30d if total_30d > 0 else 0.0
        except Exception:
            return_rate = 0.0

        # total_active_reservations en el momento de la reserva
        try:
            active = await reservations_coll.count_documents(
                {
                    "bookId": row["bookId"]
                    if isinstance(row["bookId"], str)
                    else row["bookId"],
                    "status": "pending",
                    "requestDate": {"$lte": row["requestDate"]},
                }
            )
        except Exception:
            active = 0

        # stock_was_zero_days: días sin stock hasta la reserva
        stock_zero_days = 0
        if not row.get("inStock", True):
            try:
                oldest_pending = await reservations_coll.find_one(
                    {
                        "bookId": row["bookId"]
                        if isinstance(row["bookId"], str)
                        else row["bookId"],
                        "status": "pending",
                        "requestDate": {"$lte": row["requestDate"]},
                    },
                    sort=[("requestDate", 1)],
                )
                if oldest_pending:
                    stock_zero_days = max(
                        0,
                        (row["requestDate"] - oldest_pending["requestDate"]).days,
                    )
            except Exception:
                stock_zero_days = 0

        rows.append(
            {
                "queue_position": int(row["priority"]),
                "category_encoded": row.get("category", "unknown"),
                "historical_avg_wait_days": round(hist_avg, 2),
                "book_return_rate_30d": round(return_rate, 4),
                "total_active_reservations": active,
                "stock_was_zero_days": stock_zero_days,
                "wait_days": int(row["wait_days"]),
            }
        )

    return pd.DataFrame(rows)

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
    """Entrena el modelo de anomalías de comportamiento de préstamo (legacy)."""
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

@router.post("/anomaly/from-database")
async def train_shelf_anomaly_from_database():
    """
    Entrena el modelo de anomalías de estantes (ShelfAnomalyDetector)
    usando datos directamente de MongoDB.

    Construye features por estante:
    - shelf_load_pct, shelf_capacity_remaining, shelf_book_count
    - category_concentration_pct, category_loan_rate_30d
    - shelf_category_diversity, avg_book_value_on_shelf, total_shelf_value
    - shelf_access_score, book_loan_rate_30d_max, days_since_last_assignment
    """
    if not mongodb.is_connected:
        raise HTTPException(status_code=503, detail="Database not connected")

    try:
        data = await _build_shelf_anomaly_training_data_from_db()

        if data.empty or len(data) < 5:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Insufficient shelf data: {len(data)} records. "
                    "Minimum 5 shelves with books required."
                ),
            )

        predictor = ShelfAnomalyDetector()
        metrics = predictor.train(data)

        # Validar calidad mínima
        if metrics.get("rmse", 999) > 50:
            logger.warning(
                f"High RMSE for shelf anomaly model: {metrics['rmse']:.2f}. "
                "Model may not be reliable."
            )

        await _save_model_to_mongodb("shelf_anomaly", predictor)
        await _save_model_to_disk("shelf_anomaly", predictor)

        # Log de entrenamiento
        if mongodb.is_connected:
            logs_coll = mongodb.get_collection("training_logs")
            await logs_coll.insert_one({
                "model_name": "shelf_anomaly",
                "metrics": metrics,
                "feature_importance": predictor.get_feature_importance(),
                "n_samples": metrics.get("training_samples", 0),
                "trained_at": pd.Timestamp.now().isoformat(),
            })

        return {
            "message": "Shelf anomaly model trained from database successfully",
            "metrics": metrics,
            "feature_importance": predictor.get_feature_importance(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Shelf anomaly training error: {e}", exc_info=True)
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

# Shelf Anomaly Detection: Construcción de datos de entrenamiento
# Mapping de ubicaciones a scores de accesibilidad (1=baja, 5=alta)
LOCATION_ACCESS_MAP = {
    "Fiction Section": 4,
    "Non-Fiction Section": 3,
    "Academic Section": 2,
    "Children Section": 5,
    "History Section": 2,
    "Science Section": 3,
    "Adventure Section": 4,
    "Business Section": 3,
    "Health Section": 3,
    "Horror Section": 2,
}

async def _build_shelf_anomaly_training_data_from_db() -> pd.DataFrame:
    """
    Construye dataset de entrenamiento para ShelfAnomalyDetector.

    Cada fila es un estante con sus features contextuales:
    - shelf_load_pct (target): currentWeight / maxWeight * 100
    - shelf_capacity_remaining: maxWeight - currentWeight
    - shelf_book_count: número de libros
    - category_concentration_pct: % de la categoría más representada
    - category_loan_rate_30d: préstamos de la categoría / total en 30d
    - shelf_category_diversity: categorías distintas
    - avg_book_value_on_shelf: valor promedio de libros
    - total_shelf_value: valor total del estante
    - shelf_access_score: puntaje de accesibilidad (1-5)
    - book_loan_rate_30d_max: máxima tasa de préstamo entre libros
    - days_since_last_assignment: días desde última modificación del estante
    """
    shelves_coll = mongodb.get_collection("shelves")
    products_coll = mongodb.get_collection("products")
    loans_coll = mongodb.get_collection("loans")

    # Obtener todos los estantes con sus libros poblados
    pipeline = [
        {
            "$lookup": {
                "from": "products",
                "localField": "books",
                "foreignField": "_id",
                "as": "books_detail",
            }
        },
    ]

    cursor = shelves_coll.aggregate(pipeline)
    shelves = await cursor.to_list(length=None)

    if not shelves:
        return pd.DataFrame()

    now = pd.Timestamp.now(tz=None)
    cutoff_30d = now - pd.Timedelta(days=30)

    # Obtener conteo total de préstamos en últimos 30 días (para category_loan_rate)
    total_loans_30d = await loans_coll.count_documents(
        {"loanDate": {"$gte": cutoff_30d.to_pydatetime()}}
    )

    # Obtener todos los préstamos de los últimos 30 días
    loans_cursor = loans_coll.find(
        {"loanDate": {"$gte": cutoff_30d.to_pydatetime()}},
        {"bookId": 1, "loanDate": 1},
    )
    recent_loans = await loans_cursor.to_list(length=None)

    # Construir mapa de conteo de préstamos por libro (últimos 30d)
    book_loan_counts_30d = {}
    for loan in recent_loans:
        bid = str(loan.get("bookId", ""))
        book_loan_counts_30d[bid] = book_loan_counts_30d.get(bid, 0) + 1

    # Construir mapa de préstamos por categoría (últimos 30d)
    category_loan_counts = {}
    # Necesitamos saber la categoría de cada libro prestado
    loaned_book_ids = list({loan["bookId"] for loan in recent_loans if loan.get("bookId")})
    if loaned_book_ids:
        products = await products_coll.find(
            {"_id": {"$in": loaned_book_ids}}, {"category": 1}
        ).to_list(length=None)
        cat_by_id = {p["_id"]: p.get("category", "unknown") for p in products}
        for loan in recent_loans:
            bid = loan.get("bookId")
            if bid and bid in cat_by_id:
                cat = cat_by_id[bid]
                category_loan_counts[cat] = category_loan_counts.get(cat, 0) + 1

    rows = []
    for shelf in shelves:
        shelf_id = shelf["_id"]
        code = shelf.get("code", "UNKNOWN")
        max_weight = shelf.get("maxWeight", 8)
        current_weight = shelf.get("currentWeight", 0)
        books_detail = shelf.get("books_detail", [])
        updated_at = shelf.get("updatedAt", shelf.get("createdAt", now))

        if max_weight <= 0:
            continue

        # ── Feature: shelf_load_pct (target) ──
        shelf_load_pct = (current_weight / max_weight) * 100

        # ── Feature: shelf_capacity_remaining ──
        shelf_capacity_remaining = max_weight - current_weight

        # ── Feature: shelf_book_count ──
        shelf_book_count = len(books_detail)

        if shelf_book_count == 0:
            # Estantes vacíos no son útiles para entrenamiento
            continue

        # ── Feature: category_concentration_pct ──
        categories = [
            b.get("category", "unknown") for b in books_detail if b.get("category")
        ]
        if categories:
            most_common = max(set(categories), key=categories.count)
            category_concentration_pct = (
                categories.count(most_common) / len(categories) * 100
            )
        else:
            category_concentration_pct = 0

        # ── Feature: category_loan_rate_30d ──
        if categories:
            # Usar la categoría más representada
            primary_category = most_common
            cat_loans = category_loan_counts.get(primary_category, 0)
            category_loan_rate_30d = (
                cat_loans / total_loans_30d if total_loans_30d > 0 else 0
            )
        else:
            category_loan_rate_30d = 0

        # ── Feature: shelf_category_diversity ──
        shelf_category_diversity = len(set(categories)) if categories else 0

        # ── Features: avg_book_value_on_shelf, total_shelf_value ──
        prices = [b.get("offerPrice", b.get("price", 0)) for b in books_detail]
        prices = [p for p in prices if p and p > 0]
        avg_book_value_on_shelf = float(np.mean(prices)) if prices else 0
        total_shelf_value = float(sum(prices)) if prices else 0

        # ── Feature: shelf_access_score ──
        shelf_access_score = LOCATION_ACCESS_MAP.get(
            shelf.get("location", ""), 3
        )

        # ── Feature: book_loan_rate_30d_max ──
        book_loan_rates = []
        for book in books_detail:
            bid = str(book.get("_id", ""))
            count = book_loan_counts_30d.get(bid, 0)
            book_loan_rates.append(count)
        book_loan_rate_30d_max = max(book_loan_rates) if book_loan_rates else 0

        # ── Feature: days_since_last_assignment ──
        if isinstance(updated_at, str):
            try:
                updated_at = pd.Timestamp(updated_at)
            except Exception:
                updated_at = now
        days_since_last_assignment = max(0, (now - pd.Timestamp(updated_at)).days)

        rows.append(
            {
                "shelf_id": str(shelf_id),
                "shelf_code": code,
                "shelf_load_pct": round(shelf_load_pct, 2),
                "shelf_capacity_remaining": round(shelf_capacity_remaining, 4),
                "shelf_book_count": shelf_book_count,
                "category_concentration_pct": round(category_concentration_pct, 2),
                "category_loan_rate_30d": round(category_loan_rate_30d, 4),
                "shelf_category_diversity": shelf_category_diversity,
                "avg_book_value_on_shelf": round(avg_book_value_on_shelf, 2),
                "total_shelf_value": round(total_shelf_value, 2),
                "shelf_access_score": shelf_access_score,
                "book_loan_rate_30d_max": book_loan_rate_30d_max,
                "days_since_last_assignment": days_since_last_assignment,
            }
        )

    return pd.DataFrame(rows)