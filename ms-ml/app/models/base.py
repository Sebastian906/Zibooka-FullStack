from abc import ABC, abstractmethod
from typing import Any
import pandas as pd
import numpy as np
import joblib
import os
import logging

logger = logging.getLogger(__name__)

class BasePredictor(ABC):
    """Clase base abstracta para todos los predictores del sistema."""

    def __init__(self):
        self.model = None
        self.is_trained = False
        self.feature_names: list[str] = []
        self.training_metrics: dict[str, Any] = {}

    @abstractmethod
    def train(self, training_data: pd.DataFrame) -> dict:
        """
        Entrena el modelo con datos históricos.

        Args:
            training_data: DataFrame con features y target

        Returns:
            Dict con métricas del entrenamiento
        """
        pass

    @abstractmethod
    def predict(self, features: pd.DataFrame) -> np.ndarray:
        """
        Realiza predicciones sobre nuevos datos.

        Args:
            features: DataFrame de features de entrada

        Returns:
            Array con predicciones
        """
        pass

    def save(self, path: str) -> None:
        """Serializa y guarda el modelo en disco."""
        os.makedirs(os.path.dirname(path) if os.path.dirname(path) else ".", exist_ok=True)
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
        logger.info(f"Model saved to {path}")

    @classmethod
    def load(cls, path: str) -> "BasePredictor":
        """Carga un modelo serializado desde disco."""
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model file not found: {path}")

        data = joblib.load(path)
        instance = cls()
        instance.model = data["model"]
        instance.feature_names = data["feature_names"]
        instance.training_metrics = data["metrics"]
        instance._set_extra_state(data.get("extra", {}))
        instance.is_trained = True
        logger.info(f"Model loaded from {path}")
        return instance

    def get_feature_importance(self) -> dict:
        """
        Retorna importancia de features si el modelo lo soporta.
        Override en modelos que lo implementen.
        """
        if hasattr(self.model, "feature_importances_") and self.feature_names:
            return dict(zip(self.feature_names, self.model.feature_importances_))
        return {}

    def _get_extra_state(self) -> dict:
        """Retorna estado adicional del modelo para serializar. Override si es necesario."""
        return {}

    def _set_extra_state(self, state: dict) -> None:
        """Restaura estado adicional del modelo. Override si es necesario."""
        pass

    def _validate_training_data(self, df: pd.DataFrame, target_col: str) -> tuple:
        """Valida y separa features del target."""
        if target_col not in df.columns:
            raise ValueError(f"Target column '{target_col}' not found in data")

        if len(df) < 5:
            raise ValueError(f"Insufficient data: {len(df)} rows. Minimum 5 required.")

        X = df.drop(columns=[target_col])
        y = df[target_col]
        self.feature_names = list(X.columns)
        return X, y