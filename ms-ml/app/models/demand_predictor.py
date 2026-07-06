from app.models.base import BasePredictor
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import StandardScaler
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

class DemandPredictor(BasePredictor):
    """
    Predictor de demanda de libros.
    Usa Gradient Boosting para clasificar si un libro tendrá alta demanda.
    """

    def __init__(self, threshold: int = 3):
        super().__init__()
        self.threshold = threshold
        self.scaler = StandardScaler()

    def train(self, training_data: pd.DataFrame) -> dict:
        """
        Entrena el modelo de Gradient Boosting.

        Features esperadas (ejemplo):
        - total_loans: total de préstamos históricos
        - unique_users: usuarios distintos que lo pidieron
        - avg_rating: calificación promedio
        - days_since_added: días desde que se agregó
        - category_encoded: categoría codificada
        - author_popularity: popularidad del autor

        Target:
        - loan_count: número de préstamos (se convierte a binario)
        """
        X, y_raw = self._validate_training_data(training_data, "loan_count")

        # Convertir a clasificación binaria
        y = (y_raw >= self.threshold).astype(int)

        # Escalar features
        X_scaled = self.scaler.fit_transform(X)

        # Entrenar modelo
        self.model = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=3,
            learning_rate=0.1,
            random_state=42,
        )
        self.model.fit(X_scaled, y)

        # Validación cruzada
        n_folds = min(5, len(X))
        if n_folds >= 2:
            scores = cross_val_score(
                self.model, X_scaled, y, cv=n_folds, scoring="f1"
            )
            cv_f1 = float(np.mean(scores))
        else:
            cv_f1 = 0.0

        # Métricas
        predictions = self.model.predict(X_scaled)
        from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

        self.training_metrics = {
            "accuracy": float(accuracy_score(y, predictions)),
            "f1": float(f1_score(y, predictions, zero_division=0)),
            "precision": float(precision_score(y, predictions, zero_division=0)),
            "recall": float(recall_score(y, predictions, zero_division=0)),
            "cv_f1": cv_f1,
            "n_samples": len(X),
            "threshold": self.threshold,
        }
        self.is_trained = True

        logger.info(
            f"DemandPredictor trained: Accuracy={self.training_metrics['accuracy']:.4f}, "
            f"F1={self.training_metrics['f1']:.4f}"
        )
        return self.training_metrics

    def predict(self, features: pd.DataFrame) -> np.ndarray:
        """
        Predice si un libro tendrá alta demanda.
        Retorna 1 (alta demanda) o 0 (baja demanda).
        """
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call train() first.")

        features = features[self.feature_names]
        features_scaled = self.scaler.transform(features)
        return self.model.predict(features_scaled)

    def predict_proba(self, features: pd.DataFrame) -> np.ndarray:
        """Retorna probabilidades de predicción."""
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call train() first.")

        features = features[self.feature_names]
        features_scaled = self.scaler.transform(features)
        return self.model.predict_proba(features_scaled)

    def _get_extra_state(self) -> dict:
        return {"scaler_mean": self.scaler.mean_.tolist(), "scaler_scale": self.scaler.scale_.tolist()}

    def _set_extra_state(self, state: dict) -> None:
        if "scaler_mean" in state and "scaler_scale" in state:
            import numpy as np
            self.scaler.mean_ = np.array(state["scaler_mean"])
            self.scaler.scale_ = np.array(state["scaler_scale"])