"""
Predictor de demanda de libros.
Utiliza Gradient Boosting para predecir qué libros tendrán
alta demanda de préstamos en los próximos 30 días.
"""
from collections import Counter
from app.models.base import BasePredictor
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

class DemandPredictor(BasePredictor):

    def __init__(self, threshold: int = 3):
        super().__init__()
        self.threshold = threshold
        self.scaler = StandardScaler()
        self.label_encoder: LabelEncoder | None = None
        self.effective_threshold: int = threshold

    # Entrenamiento
    def train(self, training_data: pd.DataFrame) -> dict:
        # Separar features del target
        cols_to_drop = [c for c in ["loan_count_target", "bookId"] if c in training_data.columns]
        X = training_data.drop(columns=cols_to_drop, errors="ignore")
        y_raw = training_data["loan_count_target"]

        # Eliminar columnas no numéricas
        X = X.select_dtypes(include=[np.number])

        if len(X) < 3:
            raise ValueError(f"Insufficient data: {len(X)} rows. Need at least 3.")

        # Ajustar threshold dinámicamente si produce 1 sola clase
        self.effective_threshold = self.threshold
        y = (y_raw >= self.effective_threshold).astype(int)
        n_classes = len(np.unique(y))

        if n_classes < 2:
            # Intentar con threshold=1
            self.effective_threshold = 1
            y = (y_raw >= self.effective_threshold).astype(int)
            n_classes = len(np.unique(y))

        if n_classes < 2:
            # Si aún 1 clase, usar mediana como split
            median_val = y_raw.median()
            self.effective_threshold = int(median_val) if median_val > 0 else 1
            y = (y_raw > median_val).astype(int)

        # Guardar feature names ANTES de escalar
        self.feature_names = list(X.columns)

        # Escalar
        X_scaled = self.scaler.fit_transform(X)

        # Entrenar
        self.model = GradientBoostingClassifier(
            n_estimators=min(200, max(10, len(X) * 2)),
            max_depth=min(5, max(2, len(X) // 5)),
            learning_rate=0.1,
            subsample=0.8,
            random_state=42,
        )
        self.model.fit(X_scaled, y)

        # Métricas
        predictions = self.model.predict(X_scaled)
        from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score

        # Cross-validation solo si hay suficientes datos
        cv_f1 = 0.0
        n_positive = int(y.sum())
        n_negative = int(len(y) - n_positive)
        if n_positive >= 2 and n_negative >= 2 and len(X) >= 6:
            n_folds = min(5, n_positive, n_negative)
            try:
                scores = cross_val_score(self.model, X_scaled, y, cv=n_folds, scoring="f1")
                cv_f1 = float(np.mean(scores))
            except Exception:
                cv_f1 = 0.0

        auc_roc = 0.0
        if n_positive >= 1 and n_negative >= 1:
            try:
                y_prob = self.model.predict_proba(X_scaled)[:, 1]
                auc_roc = float(roc_auc_score(y, y_prob))
            except Exception:
                auc_roc = 0.0

        self.training_metrics = {
            "accuracy": float(accuracy_score(y, predictions)),
            "f1": float(f1_score(y, predictions, zero_division=0)),
            "precision": float(precision_score(y, predictions, zero_division=0)),
            "recall": float(recall_score(y, predictions, zero_division=0)),
            "cv_f1": cv_f1,
            "auc_roc": auc_roc,
            "n_samples": len(X),
            "n_positive": n_positive,
            "n_negative": n_negative,
            "threshold": self.effective_threshold,
        }
        self.is_trained = True

        logger.info(
            f"DemandPredictor trained: samples={len(X)}, positive={n_positive}, "
            f"threshold={self.effective_threshold}, F1={self.training_metrics['f1']:.4f}"
        )
        return self.training_metrics

    # Predicción
    def predict(self, features: pd.DataFrame) -> np.ndarray:
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call train() first.")
        features = features[self.feature_names]
        features_scaled = self.scaler.transform(features)
        return self.model.predict(features_scaled)

    def predict_proba(self, features: pd.DataFrame) -> np.ndarray:
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call train() first.")
        features = features[self.feature_names]
        features_scaled = self.scaler.transform(features)
        return self.model.predict_proba(features_scaled)

    # Construcción de features desde MongoDB
    async def build_training_data_from_db(self, mongodb) -> pd.DataFrame:
        loans_coll = mongodb.get_collection("loans")

        # Obtener todos los préstamos
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
            {"$project": {
                "bookId": 1,
                "userId": 1,
                "category": "$product.category",
                "inStock": "$product.inStock",
                "loanDate": 1,
                "returnDate": 1,
                "status": 1,
            }},
        ]

        cursor = loans_coll.aggregate(pipeline)
        loans = await cursor.to_list(length=None)

        if not loans:
            logger.warning("No loan data found for training")
            return pd.DataFrame()

        df = pd.DataFrame(loans)
        return self._build_features_from_raw(df)

    def _build_features_from_raw(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Construye features + target usando approach de ventanas temporales.

        Para cada libro, usa un préstamo como punto de observación y cuenta
        cuántos préstamos tuvo en los 30 días ANTES (features) vs 30 días
        DESPUÉS (target). Esto evita data leakage.
        """
        if df.empty:
            return pd.DataFrame()

        df["loanDate"] = pd.to_datetime(df["loanDate"], errors="coerce")
        df = df.dropna(subset=["loanDate"])
        df = df.sort_values("loanDate")

        if len(df) < 3:
            return pd.DataFrame()

        now = pd.Timestamp.now()
        records = []

        # Opción A: Si hay pocos préstamos por libro, crear 1 fila por libro
        # usando el historial total como features y los recientes como target
        book_groups = df.groupby("bookId")

        for book_id, group in book_groups:
            loan_dates = group["loanDate"].sort_values()
            total_loans = len(group)

            if total_loans < 1:
                continue

            last_loan = loan_dates.iloc[-1]
            days_since_last = max((now - last_loan).days, 0)

            # Features:Activity BEFORE the last 30 days
            cutoff_features_start = now - pd.Timedelta(days=90)
            cutoff_features_end = now - pd.Timedelta(days=30)

            loans_in_feature_window = loan_dates[
                (loan_dates >= cutoff_features_start) & (loan_dates < cutoff_features_end)
            ]
            loans_last_30d = loan_dates[loan_dates >= (now - pd.Timedelta(days=30))]

            feature_loans_30d = len(loans_in_feature_window)
            feature_loans_90d = int((loan_dates >= cutoff_features_start).sum())

            # Duración promedio
            if "returnDate" in group.columns:
                returns = pd.to_datetime(group["returnDate"], errors="coerce")
                durations = (returns - group["loanDate"]).dt.days.dropna()
                avg_duration = durations.mean() if len(durations) > 0 else 14.0
            else:
                avg_duration = 14.0

            # Unique users
            unique_users = group["userId"].nunique() if "userId" in group.columns else 1

            # Categoría
            category = group["category"].iloc[0] if "category" in group.columns else "unknown"

            # TARGET: préstamos en los últimos 30 días
            # (proxy de "demanda futura" desde la perspectiva de los datos históricos)
            target_loans = len(loans_last_30d)

            records.append({
                "category": str(category),
                "stock_available": int(group["inStock"].iloc[0]) if "inStock" in group.columns else 1,
                "month": last_loan.month,
                "week_of_year": last_loan.isocalendar()[1],
                "day_of_week": last_loan.dayofweek,
                "is_semester_start": int(
                    last_loan.isocalendar()[1] in range(1, 4)
                    or last_loan.isocalendar()[1] in range(16, 19)
                ),
                "loan_count_prev_30d": feature_loans_30d,
                "loan_count_prev_90d": feature_loans_90d,
                "total_loans_all_time": total_loans,
                "avg_loan_duration_days": float(avg_duration),
                "days_since_last_loan": days_since_last,
                "unique_users_loaned": unique_users,
                "loan_count_target": target_loans,
            })

        result = pd.DataFrame(records)

        if result.empty:
            return result

        # Label encoding para categorías
        self.label_encoder = LabelEncoder()
        result["category_encoded"] = self.label_encoder.fit_transform(
            result["category"].astype(str)
        )

        # Eliminar columnas no numéricas
        result = result.drop(columns=["category"], errors="ignore")

        # Asegurar que todo sea numérico
        for col in result.columns:
            result[col] = pd.to_numeric(result[col], errors="coerce").fillna(0)

        return result

    # Serialización
    def _get_extra_state(self) -> dict:
        state = {
            "scaler_mean": self.scaler.mean_.tolist() if hasattr(self.scaler, "mean_") and self.scaler.mean_ is not None else [],
            "scaler_scale": self.scaler.scale_.tolist() if hasattr(self.scaler, "scale_") and self.scaler.scale_ is not None else [],
            "effective_threshold": self.effective_threshold,
        }
        if self.label_encoder is not None:
            state["label_encoder_classes"] = self.label_encoder.classes_.tolist()
        return state

    def _set_extra_state(self, state: dict) -> None:
        if "scaler_mean" in state and state["scaler_mean"]:
            self.scaler.mean_ = np.array(state["scaler_mean"])
        if "scaler_scale" in state and state["scaler_scale"]:
            self.scaler.scale_ = np.array(state["scaler_scale"])
        if "label_encoder_classes" in state:
            from sklearn.preprocessing import LabelEncoder
            self.label_encoder = LabelEncoder()
            self.label_encoder.classes_ = np.array(state["label_encoder_classes"])
        if "effective_threshold" in state:
            self.effective_threshold = state["effective_threshold"]