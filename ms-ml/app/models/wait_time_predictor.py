from app.models.base import BasePredictor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder
import pandas as pd
import numpy as np
import logging
import joblib

logger = logging.getLogger(__name__)

class WaitTimePredictor(BasePredictor):
    """
    Predictor de tiempo de espera para reservas de libros.
    Usa Regresión Lineal Múltiple para predecir días de espera.

    Features:
        - queue_position: posición en la cola de reserva (priority)
        - category_encoded: categoría del libro (label encoded)
        - historical_avg_wait_days: promedio histórico de días de espera del libro
        - book_return_rate_30d: tasa de devolución del libro últimos 30 días
        - total_active_reservations: reservas activas totales para el libro
        - stock_was_zero_days: días acumulados sin stock

    Target:
        - wait_days: días entre creación y fulfillment de la reserva
    """

    FEATURE_COLUMNS = [
        "queue_position",
        "category_encoded",
        "historical_avg_wait_days",
        "book_return_rate_30d",
        "total_active_reservations",
        "stock_was_zero_days",
    ]

    def __init__(self):
        super().__init__()
        self.model = LinearRegression()
        self.feature_names = list(self.FEATURE_COLUMNS)
        self.label_encoder: LabelEncoder | None = None
        self._label_classes: list[str] = []

    def train(self, training_data: pd.DataFrame) -> dict:
        """
        Entrena el modelo de regresión lineal.

        Features esperadas (ejemplo):
        - book_popularity_score: que tan popular es el libro
        - active_loans_count: préstamos activos de ese libro
        - avg_loan_duration: duración promedio de préstamos anteriores
        - day_of_week: día de la semana
        - user_history_count: historial de préstamos del usuario

        Target:
        - wait_days: días de espera reales
        """
        # Validar columnas requeridas
        missing = [c for c in self.FEATURE_COLUMNS if c not in training_data.columns]
        if missing:
            raise ValueError(f"Missing feature columns: {missing}")

        if "wait_days" not in training_data.columns:
            raise ValueError("Target column 'wait_days' not found")

        df = training_data.copy()

        # Filtrar outliers (wait_days > 90 probablemente errores)
        df = df[df["wait_days"] <= 90]

        if len(df) < 5:
            raise ValueError(f"Insufficient data after filtering: {len(df)} rows")

        # Label encode de categorías si la columna no es numérica
        if "category_encoded" in df.columns and not pd.api.types.is_numeric_dtype(df["category_encoded"]):
            self.label_encoder = LabelEncoder()
            df["category_encoded"] = self.label_encoder.fit_transform(
                df["category_encoded"].astype(str)
            )
            self._label_classes = self.label_encoder.classes_.tolist()

        X = df[self.FEATURE_COLUMNS].fillna(0)
        y = df["wait_days"]

        # Train/test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        # Entrenar
        self.model.fit(X_train, y_train)

        # Predicciones
        y_pred_train = self.model.predict(X_train)
        y_pred_test = self.model.predict(X_test)

        # Métricas
        train_rmse = float(np.sqrt(np.mean((y_train - y_pred_train) ** 2)))
        test_rmse = float(np.sqrt(np.mean((y_test - y_pred_test) ** 2)))
        test_mae = float(np.mean(np.abs(y_test - y_pred_test)))
        test_r2 = float(self.model.score(X_test, y_test))

        if np.isnan(test_r2):
            test_r2 = 0.0

        # Cross-validation
        n_folds = min(5, len(X))
        cv_r2 = 0.0
        if n_folds >= 2:
            try:
                scores = cross_val_score(
                    self.model, X, y, cv=n_folds, scoring="r2"
                )
                cv_r2 = float(np.nanmean(scores))
                if np.isnan(cv_r2):
                    cv_r2 = 0.0
            except Exception as e:
                logger.warning(f"Cross-validation failed: {e}")

        # Coeficientes
        coefficients = dict(zip(self.FEATURE_COLUMNS, self.model.coef_.tolist()))

        self.training_metrics = {
            "rmse": test_rmse,
            "train_rmse": train_rmse,
            "mae": test_mae,
            "r2": test_r2,
            "cv_r2": cv_r2,
            "coefficients": coefficients,
            "intercept": float(self.model.intercept_),
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "n_samples": len(X),
        }
        self.is_trained = True

        logger.info(
            f"WaitTimePredictor trained: R2={test_r2:.4f}, RMSE={test_rmse:.4f}, "
            f"MAE={test_mae:.4f}, samples={len(X)}"
        )
        return self.training_metrics

    def predict(self, features: pd.DataFrame) -> np.ndarray:
        """Predice días de espera para un DataFrame de features."""
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call train() first.")

        features = features[self.FEATURE_COLUMNS].copy()

        # Encodear category_encoded si sigue como string
        if "category_encoded" in features.columns and not pd.api.types.is_numeric_dtype(features["category_encoded"]):
            if self.label_encoder is not None:
                features["category_encoded"] = features["category_encoded"].astype(str).map(
                    lambda x: int(self.label_encoder.transform([x])[0])
                    if x in self.label_encoder.classes_
                    else 0
                )
            else:
                features["category_encoded"] = 0

        features = features.fillna(0)
        predictions = self.model.predict(features)

        # No permitir valores negativos
        return np.maximum(predictions, 0)
    
    def predict_single(
        self,
        queue_position: int,
        category: str,
        historical_avg: float,
        return_rate: float,
        active_reservations: int,
        stock_zero_days: int,
    ) -> float:
        """Predice tiempo de espera para una reserva individual.

        Returns:
            Días estimados de espera (>= 0, redondeado a 1 decimal)
        """
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call train() first.")

        # Encodear categoría
        cat_encoded = 0
        if self.label_encoder is not None:
            try:
                cat_encoded = int(self.label_encoder.transform([str(category)])[0])
            except ValueError:
                # Categoría no vista en entrenamiento
                cat_encoded = 0

        feature_vector = np.array([[
            queue_position,
            cat_encoded,
            historical_avg,
            return_rate,
            active_reservations,
            stock_zero_days,
        ]])

        predicted_days = self.model.predict(feature_vector)[0]
        return max(0.0, round(float(predicted_days), 1))

    def get_feature_importance(self) -> dict:
        """Coeficientes de regresión lineal como medida de importancia."""
        if self.model is None or not self.is_trained:
            return {}
        return dict(zip(self.FEATURE_COLUMNS, self.model.coef_.tolist()))

    def _get_extra_state(self) -> dict:
        return {
            "label_classes": self._label_classes,
        }

    def _set_extra_state(self, state: dict) -> None:
        if "label_classes" in state and state["label_classes"]:
            self._label_classes = state["label_classes"]
            self.label_encoder = LabelEncoder()
            self.label_encoder.classes_ = np.array(state["label_classes"])

    def save(self, path: str) -> None:
        """Serializa modelo + label encoder."""
        extra = self._get_extra_state()
        joblib.dump(
            {
                "model": self.model,
                "feature_names": self.feature_names,
                "metrics": self.training_metrics,
                "extra": extra,
            },
            path,
        )
        logger.info(f"WaitTimePredictor saved to {path}")

    @classmethod
    def load(cls, path: str) -> "WaitTimePredictor":
        """Carga modelo serializado desde disco."""
        import os
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model file not found: {path}")

        data = joblib.load(path)
        instance = cls()
        instance.model = data["model"]
        instance.feature_names = data["feature_names"]
        instance.training_metrics = data.get("metrics", {})
        instance._set_extra_state(data.get("extra", {}))
        instance.is_trained = True
        logger.info(f"WaitTimePredictor loaded from {path}")
        return instance