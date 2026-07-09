from app.models.base import BasePredictor
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

class OverduePredictor(BasePredictor):
    """
    Predictor de riesgo de retraso en devolución.
    Soporta dos modos:
    - Básico (6 features): Compatible con versión anterior
    - Extendido (13 features): Mayor precisión
    """

    # Features para el modo básico (compatibilidad)
    BASIC_FEATURES = [
        'loan_duration_days',
        'user_total_loans',
        'user_overdue_rate',
        'book_overdue_rate',
        'days_until_due',
        'is_weekend',
    ]

    # Features para el modo extendido
    EXTENDED_FEATURES = [
        'user_previous_loans_count',
        'user_overdue_count',
        'user_overdue_rate',
        'user_avg_late_days',
        'user_days_since_last_loan',
        'user_total_loans_completed',
        'book_overdue_rate',
        'book_total_loans',
        'book_avg_loan_duration',
        'day_of_week_loan',
        'category_encoded',
        'is_weekend',
        'loan_hour',
    ]

    def __init__(self, risk_threshold: float = 0.7, mode: str = 'auto'):
        super().__init__()
        self.risk_threshold = risk_threshold
        self.scaler = StandardScaler()
        self.mode = mode
        self.label_encoder: LabelEncoder | None = None
        self.feature_mode: str = 'basic'
        self._single_class: bool = False
        self._single_class_value: int = 0

    def train(self, training_data: pd.DataFrame) -> dict:
        """
        Entrena el modelo detectando automáticamente el modo
        basado en las columnas disponibles.
        """
        # Detectar modo basado en columnas
        columns = set(training_data.columns)
        if columns.issuperset(set(self.EXTENDED_FEATURES)):
            self.feature_mode = 'extended'
            self.feature_names = self.EXTENDED_FEATURES
            logger.info("Training in EXTENDED mode (13 features)")
        else:
            self.feature_mode = 'basic'
            self.feature_names = self.BASIC_FEATURES
            logger.info("Training in BASIC mode (6 features)")

        X, y = self._validate_training_data(training_data, "is_overdue")

        # Asegurar que y es binario
        y = y.astype(int)

        # Verificar si hay una sola clase
        unique_classes = np.unique(y)
        if len(unique_classes) < 2:
            logger.warning(f"Only one class found in data: {unique_classes[0]}. Model will return default predictions.")
            self._single_class = True
            self._single_class_value = int(unique_classes[0])
            self.is_trained = True
            
            # Métricas para modelo sin entrenar
            self.training_metrics = {
                "accuracy": 1.0 if self._single_class_value == 0 else 0.0,
                "f1": 0.0,
                "roc_auc": 0.5,
                "cv_auc": 0.5,
                "n_samples": len(X),
                "n_features": len(self.feature_names),
                "feature_mode": self.feature_mode,
                "risk_threshold": self.risk_threshold,
                "single_class_mode": True,
                "single_class_value": self._single_class_value,
            }
            return self.training_metrics

        self._single_class = False

        # Escalar features
        X_scaled = self.scaler.fit_transform(X)

        # Seleccionar modelo según el modo
        if self.feature_mode == 'extended' and len(X) >= 50:
            self.model = GradientBoostingClassifier(
                n_estimators=150,
                max_depth=5,
                learning_rate=0.1,
                subsample=0.8,
                random_state=42,
            )
        else:
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=5,
                random_state=42,
                class_weight="balanced",
            )

        self.model.fit(X_scaled, y)

        # Validación cruzada
        n_folds = min(5, len(X))
        if n_folds >= 2:
            try:
                scores = cross_val_score(
                    self.model, X_scaled, y, cv=n_folds, scoring="roc_auc"
                )
                cv_auc = float(np.nanmean(scores))
            except Exception as e:
                logger.warning(f"Cross-validation failed: {e}")
                cv_auc = 0.5
        else:
            cv_auc = 0.5

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
            "roc_auc": float(roc_auc_score(y, proba)) if len(np.unique(y)) > 1 else 0.5,
            "cv_auc": cv_auc,
            "n_samples": len(X),
            "n_features": len(self.feature_names),
            "feature_mode": self.feature_mode,
            "risk_threshold": self.risk_threshold,
            "single_class_mode": False,
        }
        self.is_trained = True

        logger.info(
            f"OverduePredictor trained ({self.feature_mode}): "
            f"AUC={self.training_metrics['roc_auc']:.4f}, "
            f"samples={len(X)}"
        )
        return self.training_metrics

    def predict(self, features: pd.DataFrame) -> np.ndarray:
        """Predice riesgo de overdue (0 o 1)."""
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call train() first.")

        # Si hay una sola clase, retornar esa clase
        if self._single_class:
            return np.full(len(features), self._single_class_value)

        features = features[self.feature_names]
        features_scaled = self.scaler.transform(features)
        return self.model.predict(features_scaled)

    def predict_risk(self, features: pd.DataFrame) -> np.ndarray:
        """Retorna probabilidad de riesgo (0.0 a 1.0)."""
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call train() first.")

        # Si hay una sola clase, retornar probabilidad basada en la clase
        if self._single_class:
            # Si la clase es overdue (1), retornar 0.9, si es returned (0), retornar 0.1
            return np.full(len(features), 0.9 if self._single_class_value == 1 else 0.1)

        features = features[self.feature_names]
        features_scaled = self.scaler.transform(features)
        proba = self.model.predict_proba(features_scaled)
        return proba[:, 1]

    def predict_with_features(
        self, features: pd.DataFrame
    ) -> tuple[np.ndarray, dict[str, float]]:
        """
        Predice y retorna las top features más importantes.
        """
        risk_scores = self.predict_risk(features)

        # Obtener importancia de features
        if not self._single_class and hasattr(self, 'model') and hasattr(self.model, 'feature_importances_'):
            importance = dict(zip(self.feature_names, self.model.feature_importances_))
            top_features = dict(
                sorted(importance.items(), key=lambda x: x[1], reverse=True)[:5]
            )
        else:
            top_features = {}

        return risk_scores, top_features
    
    def _get_extra_state(self) -> dict:
        state = {
            "scaler_mean": self.scaler.mean_.tolist() if hasattr(self.scaler, "mean_") and self.scaler.mean_ is not None else [],
            "scaler_scale": self.scaler.scale_.tolist() if hasattr(self.scaler, "scale_") and self.scaler.scale_ is not None else [],
            "feature_mode": self.feature_mode,
            "single_class": self._single_class,
            "single_class_value": self._single_class_value,
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
            self.label_encoder = LabelEncoder()
            self.label_encoder.classes_ = np.array(state["label_encoder_classes"])
        if "feature_mode" in state:
            self.feature_mode = state["feature_mode"]
        if "single_class" in state:
            self._single_class = state["single_class"]
        if "single_class_value" in state:
            self._single_class_value = state["single_class_value"]
