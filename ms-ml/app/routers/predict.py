from fastapi import APIRouter, HTTPException
from app.models import (
    WaitTimePredictor,
    DemandPredictor,
    OverduePredictor,
    AnomalyDetector,
)
from app.schemas.wait_time import WaitTimeRequest, WaitTimeResponse
from app.schemas.demand import DemandListRequest, DemandListResponse, DemandListItem
from app.schemas.overdue import OverdueRequest, OverdueExtendedRequest, OverdueResponse
from app.schemas.anomaly import AnomalyRequest, AnomalyResponse
from app.config import settings
from app.database import mongodb
from pandas import DataFrame
import pandas as pd
import numpy as np
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

async def _build_wait_time_features(product_id: str, queue_position: int) -> dict | None:
    """
    Construye las 6 features del modelo de wait_time desde MongoDB.

    - queue_position: directo del request
    - category_encoded: desde products.category
    - historical_avg_wait_days: promedio de (fulfilledAt - requestDate) para reservas
      cumplidas de este libro
    - book_return_rate_30d: préstamos devueltos / total préstamos últimos 30 días
    - total_active_reservations: reservas pending para este libro
    - stock_was_zero_days: días desde la reserva más antigua pending hasta hoy
    """
    if not mongodb.is_connected:
        return None

    from bson import ObjectId
    from datetime import datetime, timedelta

    try:
        product_oid = ObjectId(product_id)
    except Exception:
        return None

    products_coll = mongodb.get_collection("products")
    reservations_coll = mongodb.get_collection("reservations")
    loans_coll = mongodb.get_collection("loans")

    # 1. Obtener categoría del libro
    product = await products_coll.find_one(
        {"_id": product_oid}, {"category": 1, "inStock": 1}
    )
    if not product:
        return None

    category = product.get("category", "unknown")

    # 2. historical_avg_wait_days: reservas fulfilled para este libro
    pipeline_avg = [
        {"$match": {"bookId": product_oid, "status": "fulfilled"}},
        {
            "$project": {
                "wait_days": {
                    "$divide": [
                        {"$subtract": ["$updatedAt", "$requestDate"]},
                        86400000,  # ms en un día
                    ]
                }
            }
        },
        {"$group": {"_id": None, "avg_wait": {"$avg": "$wait_days"}}},
    ]
    avg_result = await reservations_coll.aggregate(pipeline_avg).to_list(1)
    historical_avg_wait_days = (
        float(avg_result[0]["avg_wait"]) if avg_result else 0.0
    )

    # 3. book_return_rate_30d: tasa de devolución últimos 30 días
    now = datetime.utcnow()
    cutoff_30d = now - timedelta(days=30)
    total_loans_30d = await loans_coll.count_documents(
        {"bookId": product_oid, "loanDate": {"$gte": cutoff_30d}}
    )
    returned_loans_30d = await loans_coll.count_documents(
        {
            "bookId": product_oid,
            "loanDate": {"$gte": cutoff_30d},
            "status": "returned",
        }
    )
    book_return_rate_30d = (
        returned_loans_30d / total_loans_30d if total_loans_30d > 0 else 0.0
    )

    # 4. total_active_reservations
    total_active_reservations = await reservations_coll.count_documents(
        {"bookId": product_oid, "status": "pending"}
    )

    # 5. stock_was_zero_days: si el libro no tiene stock, calcular desde la
    #    reserva más antigua pendiente; si tiene stock, 0
    stock_was_zero_days = 0
    if not product.get("inStock", True):
        oldest_pending = await reservations_coll.find_one(
            {"bookId": product_oid, "status": "pending"},
            sort=[("requestDate", 1)],
        )
        if oldest_pending:
            stock_was_zero_days = max(
                0,
                (now - oldest_pending["requestDate"]).days,
            )

    return {
        "queue_position": queue_position,
        "category_encoded": category,  # será encodeado por el modelo si tiene label_encoder
        "historical_avg_wait_days": round(historical_avg_wait_days, 2),
        "book_return_rate_30d": round(book_return_rate_30d, 4),
        "total_active_reservations": total_active_reservations,
        "stock_was_zero_days": stock_was_zero_days,
    }

# WAIT TIME 
@router.post("/wait-time", response_model=WaitTimeResponse)
async def predict_wait_time(request: WaitTimeRequest):
    """Predice el tiempo de espera para una reserva de libro."""
    model = await _get_model(WaitTimePredictor, "wait_time")
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not available. Train the model first.",
        )

    try:
        # Construir features desde MongoDB
        features = await _build_wait_time_features(
            request.product_id, request.queue_position
        )
        if features is None:
            raise HTTPException(
                status_code=404,
                detail="Product not found or database unavailable",
            )

        # Predecir
        features_df = DataFrame([features])

        # Si el modelo tiene label_encoder y la categoría es texto, usar predict_single
        if hasattr(model, "predict_single") and isinstance(
            features["category_encoded"], str
        ):
            predicted_days = model.predict_single(
                queue_position=features["queue_position"],
                category=features["category_encoded"],
                historical_avg=features["historical_avg_wait_days"],
                return_rate=features["book_return_rate_30d"],
                active_reservations=features["total_active_reservations"],
                stock_zero_days=features["stock_was_zero_days"],
            )
        else:
            prediction = model.predict(features_df)
            predicted_days = float(prediction[0])

        predicted_days = max(0.0, round(predicted_days, 2))

        # Intervalo de confianza basado en RMSE del modelo
        rmse = model.training_metrics.get("rmse", 5.0)
        confidence_lower = max(0.0, round(predicted_days - rmse, 2))
        confidence_upper = round(predicted_days + rmse, 2)

        # Nivel de confianza basado en R²
        r2 = model.training_metrics.get("r2", 0)
        if r2 > 0.7:
            confidence = "high"
        elif r2 > 0.4:
            confidence = "medium"
        else:
            confidence = "low"

        return WaitTimeResponse(
            estimated_days=predicted_days,
            confidence_interval={
                "lower": confidence_lower,
                "upper": confidence_upper,
            },
            confidence=confidence,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Wait time prediction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# DEMAND
@router.post("/demand/list", response_model=DemandListResponse)
async def predict_demand_for_all_books(request: DemandListRequest):
    """
    Predice demanda para todos los libros activos y retorna
    los que tienen mayor probabilidad de alta demanda.
    """
    model = await _get_model(DemandPredictor, "demand")
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Demand model not available. Train the model first via /train/demand/from-database.",
        )

    try:
        # Obtener libros activos de MongoDB
        products_coll = mongodb.get_collection("products")
        cursor = products_coll.find({"inStock": True}, {"_id": 1, "name": 1, "category": 1})
        products = await cursor.to_list(length=None)

        if not products:
            return DemandListResponse(predictions=[], total_books_evaluated=0)

        # Obtener estadísticas de préstamos
        loans_coll = mongodb.get_collection("loans")
        now = pd.Timestamp.now()

        predictions = []
        for product in products:
            book_id = str(product["_id"])

            # Contar préstamos históricos
            total_loans = await loans_coll.count_documents({"bookId": product["_id"]})

            # Préstamos últimos 30 días
            cutoff_30 = now - pd.Timedelta(days=30)
            loans_30d = await loans_coll.count_documents({
                "bookId": product["_id"],
                "loanDate": {"$gte": cutoff_30.to_pydatetime()}
            })

            # Préstamos últimos 90 días
            cutoff_90 = now - pd.Timedelta(days=90)
            loans_90d = await loans_coll.count_documents({
                "bookId": product["_id"],
                "loanDate": {"$gte": cutoff_90.to_pydatetime()}
            })

            # Usuarios únicos
            unique_users_pipeline = [
                {"$match": {"bookId": product["_id"]}},
                {"$group": {"_id": "$userId"}},
                {"$count": "total"}
            ]
            unique_result = await loans_coll.aggregate(unique_users_pipeline).to_list(1)
            unique_users = unique_result[0]["total"] if unique_result else 0

            # Último préstamo
            last_loan_cursor = loans_coll.find(
                {"bookId": product["_id"]}
            ).sort("loanDate", -1).limit(1)
            last_loans = await last_loan_cursor.to_list(1)

            if last_loans:
                last_loan_date = pd.Timestamp(last_loans[0]["loanDate"])
                days_since_last = max((now - last_loan_date).days, 0)
            else:
                days_since_last = 999

            # Construir feature vector
            feature_row = {
                "month": now.month,
                "week_of_year": now.isocalendar()[1],
                "day_of_week": now.dayofweek,
                "is_semester_start": int(now.isocalendar()[1] in range(1, 4) or now.isocalendar()[1] in range(16, 19)),
                "loan_count_prev_30d": loans_30d,
                "loan_count_prev_90d": loans_90d,
                "total_loans_all_time": total_loans,
                "avg_loan_duration_days": 14.0,  # Default, se puede calcular
                "days_since_last_loan": days_since_last,
                "unique_users_loaned": unique_users,
                "stock_available": 1,
            }

            # Agregar category_encoded
            category = product.get("category", "unknown")
            if model.label_encoder is not None:
                try:
                    cat_encoded = int(model.label_encoder.transform([category])[0])
                except ValueError:
                    cat_encoded = 0
            else:
                cat_encoded = 0
            feature_row["category_encoded"] = cat_encoded

            # Predecir
            import pandas as pd
            features_df = pd.DataFrame([feature_row])
            # Asegurar que las columnas coinciden con las del entrenamiento
            for col in model.feature_names:
                if col not in features_df.columns:
                    features_df[col] = 0
            features_df = features_df[model.feature_names]

            proba = model.predict_proba(features_df)
            demand_score = float(proba[0][1])

            if demand_score >= request.min_score:
                predictions.append(DemandListItem(
                    product_id=book_id,
                    title=product.get("name", "Unknown"),
                    category=category,
                    demand_score=round(demand_score, 4),
                    predicted_loans=loans_30d,  # Proxy
                    stock_available=bool(product.get("inStock", True)),
                ))

        # Ordenar por score descendente y limitar
        predictions.sort(key=lambda x: x.demand_score, reverse=True)
        predictions = predictions[: request.limit]

        return DemandListResponse(
            predictions=predictions,
            model_version="1.0",
            model_metrics=model.training_metrics,
            total_books_evaluated=len(products),
            threshold_used=model.threshold,
        )

    except Exception as e:
        logger.error(f"Demand list prediction error: {e}", exc_info=True)
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

# OVERDUE EXTENDED
@router.post("/overdue-extended", response_model=OverdueResponse)
async def predict_overdue_extended(request: OverdueExtendedRequest):
    """Predice el riesgo de retraso con 13 features extendidas."""
    model = await _get_model(OverduePredictor, "overdue")
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not available. Train the model first.",
        )

    try:
        # Verificar el modo del modelo
        feature_mode = getattr(model, 'feature_mode', 'basic')
        
        if feature_mode == 'extended':
            # Modelo entrenado con 13 features extendidas
            features_df = DataFrame([request.model_dump()])
            if hasattr(model, "predict_with_features"):
                risk_scores, top_features = model.predict_with_features(
                    features_df
                )
            else:
                risk_scores = model.predict_risk(features_df)
                top_features = {}
        else:
            # Modelo entrenado con 6 features básicas - mapear desde extendidas
            basic_features = {
                "loan_duration_days": 14,
                "user_total_loans": request.user_previous_loans_count,
                "user_overdue_rate": request.user_overdue_rate,
                "book_overdue_rate": request.book_overdue_rate,
                "days_until_due": 14,
                "is_weekend": bool(request.is_weekend),
            }
            features_df = DataFrame([basic_features])
            risk_scores = model.predict_risk(features_df)
            top_features = {}

        risk_score = float(risk_scores[0])

        return OverdueResponse(
            risk_score=round(risk_score, 4),
            is_high_risk=risk_score >= settings.overdue_risk_threshold,
            top_features=top_features if top_features else None,
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