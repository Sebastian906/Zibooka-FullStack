from app.models.base import BasePredictor
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

class AnomalyDetector(BasePredictor):
    """
    Detector de anomalías en patrones de préstamo.
    Usa Isolation Forest para detectar comportamientos inusuales.
    """

    def __init__(self, contamination: float = 0.1):
        super().__init__()
        self.contamination = contamination
        self.scaler = StandardScaler()

    def train(self, training_data: pd.DataFrame) -> dict:
        """
        Entrena el modelo de Isolation Forest.

        Features esperadas (ejemplo):
        - loans_per_month: préstamos por mes
        - avg_loan_duration: duración promedio
        - overdue_rate: tasa de retrasos
        - total_spent: total gastado
        - unique_categories: categorías distintas
        - weekend_loans: préstamos en fin de semana

        No requiere target (unsupervised).
        """
        if len(training_data) < 10:
            raise ValueError(
                f"Insufficient data for anomaly detection: {len(training_data)} rows. "
                "Minimum 10 required."
            )

        X = training_data.copy()
        self.feature_names = list(X.columns)

        # Escalar features
        X_scaled = self.scaler.fit_transform(X)

        # Entrenar modelo
        self.model = IsolationForest(
            n_estimators=100,
            contamination=self.contamination,
            random_state=42,
        )
        self.model.fit(X_scaled)

        # Métricas
        predictions = self.model.predict(X_scaled)  # 1 normal, -1 anomalía
        n_anomalies = int(np.sum(predictions == -1))
        anomaly_rate = n_anomalies / len(predictions)

        self.training_metrics = {
            "n_samples": len(X),
            "n_anomalies": n_anomalies,
            "anomaly_rate": float(anomaly_rate),
            "contamination": self.contamination,
        }
        self.is_trained = True

        logger.info(
            f"AnomalyDetector trained: {n_anomalies} anomalies detected "
            f"({anomaly_rate:.2%})"
        )
        return self.training_metrics

    def predict(self, features: pd.DataFrame) -> np.ndarray:
        """
        Detecta anomalías.
        Retorna 1 para normal, -1 para anomalía.
        """
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call train() first.")

        features = features[self.feature_names]
        features_scaled = self.scaler.transform(features)
        return self.model.predict(features_scaled)

    def predict_score(self, features: pd.DataFrame) -> np.ndarray:
        """
        Retorna score de anomalia (menor = más anómalo).
        """
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call train() first.")

        features = features[self.feature_names]
        features_scaled = self.scaler.transform(features)
        return self.model.decision_function(features_scaled)

    def _get_extra_state(self) -> dict:
        return {"scaler_mean": self.scaler.mean_.tolist(), "scaler_scale": self.scaler.scale_.tolist()}

    def _set_extra_state(self, state: dict) -> None:
        if "scaler_mean" in state and "scaler_scale" in state:
            import numpy as np
            self.scaler.mean_ = np.array(state["scaler_mean"])
            self.scaler.scale_ = np.array(state["scaler_scale"])