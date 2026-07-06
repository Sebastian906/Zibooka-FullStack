from app.models.base import BasePredictor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import StandardScaler
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

class WaitTimePredictor(BasePredictor):
    """
    Predictor de tiempo de espera para préstamo.
    Usa Regresión Lineal para predecir días de espera.
    """

    def __init__(self):
        super().__init__()
        self.scaler = StandardScaler()

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
        X, y = self._validate_training_data(training_data, "wait_days")

        # Escalar features
        X_scaled = self.scaler.fit_transform(X)

        # Entrenar modelo
        self.model = LinearRegression()
        self.model.fit(X_scaled, y)

        # Validación cruzada (mínimo 2 folds si hay pocos datos)
        n_folds = min(5, len(X))
        if n_folds >= 2:
            scores = cross_val_score(
                self.model, X_scaled, y, cv=n_folds, scoring="r2"
            )
            cv_r2 = float(np.mean(scores))
        else:
            cv_r2 = 0.0

        # Métricas
        predictions = self.model.predict(X_scaled)
        mse = float(np.mean((y - predictions) ** 2))
        rmse = float(np.sqrt(mse))
        mae = float(np.mean(np.abs(y - predictions)))
        r2 = float(self.model.score(X_scaled, y))

        self.training_metrics = {
            "r2": r2,
            "cv_r2": cv_r2,
            "rmse": rmse,
            "mae": mae,
            "n_samples": len(X),
        }
        self.is_trained = True

        logger.info(f"WaitTimePredictor trained: R2={r2:.4f}, RMSE={rmse:.4f}")
        return self.training_metrics

    def predict(self, features: pd.DataFrame) -> np.ndarray:
        """Predice días de espera."""
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call train() first.")

        # Asegurar orden de features
        features = features[self.feature_names]
        features_scaled = self.scaler.transform(features)
        predictions = self.model.predict(features_scaled)

        # No permitir valores negativos
        return np.maximum(predictions, 0)

    def _get_extra_state(self) -> dict:
        return {"scaler_mean": self.scaler.mean_.tolist(), "scaler_scale": self.scaler.scale_.tolist()}

    def _set_extra_state(self, state: dict) -> None:
        if "scaler_mean" in state and "scaler_scale" in state:
            import numpy as np
            self.scaler.mean_ = np.array(state["scaler_mean"])
            self.scaler.scale_ = np.array(state["scaler_scale"])

    def get_feature_importance(self) -> dict:
        """Coeficientes de regresión lineal como importancia."""
        if self.model is None:
            return {}
        coefficients = self.model.coef_
        return dict(zip(self.feature_names, coefficients.tolist()))