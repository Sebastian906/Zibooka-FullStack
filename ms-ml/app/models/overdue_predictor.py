from app.models.base import BasePredictor
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import StandardScaler
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

class OverduePredictor(BasePredictor):
    """
    Predictor de riesgo de retraso en devolución.
    Usa Random Forest para predecir la probabilidad de overdue.
    """

    def __init__(self, risk_threshold: float = 0.7):
        super().__init__()
        self.risk_threshold = risk_threshold
        self.scaler = StandardScaler()

    def train(self, training_data: pd.DataFrame) -> dict:
        """
        Entrena el modelo de Random Forest.

        Features esperadas (ejemplo):
        - loan_duration_days: duración del préstamo
        - user_total_loans: total de préstamos del usuario
        - user_overdue_rate: tasa de retrasos del usuario
        - book_overdue_rate: tasa de retrasos del libro
        - days_until_due: días hasta vencimiento
        - is_weekend: si es fin de semana

        Target:
        - is_overdue: 1 si se retrasó, 0 si devolvió a tiempo
        """
        X, y = self._validate_training_data(training_data, "is_overdue")

        # Asegurar que y es binario
        y = y.astype(int)

        # Escalar features
        X_scaled = self.scaler.fit_transform(X)

        # Entrenar modelo
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=5,
            random_state=42,
            class_weight="balanced",  # Manejar desbalanceo de clases
        )
        self.model.fit(X_scaled, y)

        # Validación cruzada
        n_folds = min(5, len(X))
        if n_folds >= 2:
            scores = cross_val_score(
                self.model, X_scaled, y, cv=n_folds, scoring="roc_auc"
            )
            cv_auc = float(np.mean(scores))
        else:
            cv_auc = 0.0

        # Métricas
        predictions = self.model.predict(X_scaled)
        proba = self.model.predict_proba(X_scaled)[:, 1]
        from sklearn.metrics import (
            accuracy_score,
            f1_score,
            roc_auc_score,
        )

        self.training_metrics = {
            "accuracy": float(accuracy_score(y, predictions)),
            "f1": float(f1_score(y, predictions, zero_division=0)),
            "roc_auc": float(roc_auc_score(y, proba)) if len(np.unique(y)) > 1 else 0.0,
            "cv_auc": cv_auc,
            "n_samples": len(X),
            "risk_threshold": self.risk_threshold,
        }
        self.is_trained = True

        logger.info(
            f"OverduePredictor trained: AUC={self.training_metrics['roc_auc']:.4f}"
        )
        return self.training_metrics

    def predict(self, features: pd.DataFrame) -> np.ndarray:
        """Predice riesgo de overdue (0 o 1)."""
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call train() first.")

        features = features[self.feature_names]
        features_scaled = self.scaler.transform(features)
        return self.model.predict(features_scaled)

    def predict_risk(self, features: pd.DataFrame) -> np.ndarray:
        """Retorna probabilidad de riesgo (0.0 a 1.0)."""
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call train() first.")

        features = features[self.feature_names]
        features_scaled = self.scaler.transform(features)
        proba = self.model.predict_proba(features_scaled)
        return proba[:, 1]  # Probabilidad de clase positiva (overdue)
    
    def _get_extra_state(self) -> dict:
        return {"scaler_mean": self.scaler.mean_.tolist(), "scaler_scale": self.scaler.scale_.tolist()}

    def _set_extra_state(self, state: dict) -> None:
        if "scaler_mean" in state and "scaler_scale" in state:
            import numpy as np
            self.scaler.mean_ = np.array(state["scaler_mean"])
            self.scaler.scale_ = np.array(state["scaler_scale"])