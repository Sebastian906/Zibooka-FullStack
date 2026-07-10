from app.models.base import BasePredictor
from sklearn.ensemble import IsolationForest, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
import pandas as pd
import numpy as np
import joblib
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class AnomalyDetector(BasePredictor):
    """
    Detector de anomalías en patrones de préstamo (legacy).
    Usa Isolation Forest para detectar comportamientos inusuales de usuarios.
    """

    def __init__(self, contamination: float = 0.1):
        super().__init__()
        self.contamination = contamination
        self.scaler = StandardScaler()

    def train(self, training_data: pd.DataFrame) -> dict:
        """
        Entrena el modelo de Isolation Forest.

        Features esperadas:
        - loans_per_month, avg_loan_duration, overdue_rate,
          total_spent, unique_categories, weekend_loans

        No requiere target (unsupervised).
        """
        if len(training_data) < 5:
            raise ValueError(
                f"Insufficient data for anomaly detection: {len(training_data)} rows. "
                "Minimum 5 required."
            )

        X = training_data.copy()
        self.feature_names = list(X.columns)

        X_scaled = self.scaler.fit_transform(X)

        self.model = IsolationForest(
            n_estimators=100,
            contamination=self.contamination,
            random_state=42,
        )
        self.model.fit(X_scaled)

        predictions = self.model.predict(X_scaled)
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
        """Detecta anomalías. Retorna 1 para normal, -1 para anomalía."""
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call train() first.")
        features = features[self.feature_names]
        features_scaled = self.scaler.transform(features)
        return self.model.predict(features_scaled)

    def predict_score(self, features: pd.DataFrame) -> np.ndarray:
        """Retorna score de anomalia (menor = más anómalo)."""
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call train() first.")
        features = features[self.feature_names]
        features_scaled = self.scaler.transform(features)
        return self.model.decision_function(features_scaled)

    def _get_extra_state(self) -> dict:
        return {
            "scaler_mean": self.scaler.mean_.tolist(),
            "scaler_scale": self.scaler.scale_.tolist(),
        }

    def _set_extra_state(self, state: dict) -> None:
        if "scaler_mean" in state and "scaler_scale" in state:
            self.scaler.mean_ = np.array(state["scaler_mean"])
            self.scaler.scale_ = np.array(state["scaler_scale"])

class ShelfAnomalyDetector(BasePredictor):
    """
    Detector de anomalías en la distribución de estantes.
    Usa Random Forest Regressor para modelar la carga esperada de estantes
    y detecta desviaciones significativas como anomalías.

    Tipos de anomalías:
    - UNDERUTILIZED: Estante con mucha capacidad libre + libros de alta demanda
    - OVERCONCENTRATED: >60% de una categoría con baja rotación
    - MISPLACED_HIGH_DEMAND: Libro de alta demanda en estante de bajo acceso
    - OVERWEIGHT_RISK: Estante >85% capacidad con libros de baja rotación
    - CATEGORY_IMBALANCE: Categoría concentrada en un solo estante
    """

    def __init__(self):
        super().__init__()
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_leaf=4,
            random_state=42,
            n_jobs=-1,
        )
        self.feature_columns = [
            "shelf_capacity_remaining",
            "shelf_book_count",
            "category_concentration_pct",
            "category_loan_rate_30d",
            "shelf_category_diversity",
            "avg_book_value_on_shelf",
            "total_shelf_value",
            "shelf_access_score",
            "book_loan_rate_30d_max",
            "days_since_last_assignment",
        ]
        self.target_column = "shelf_load_pct"
        self.anomaly_threshold_std = 2.0

    def train(self, training_data: pd.DataFrame) -> dict:
        """
        Entrena el Random Forest para predecir la carga esperada del estante.

        El modelo aprende qué carga debería tener un estante dado su contexto
        (categorías, demanda, valores, accesibilidad). Las desviaciones entre
        la carga real y la predicha indican anomalías.

        Returns:
            Dict con métricas: rmse, r2_score, residual_std, anomaly_threshold
        """
        if self.target_column not in training_data.columns:
            raise ValueError(
                f"Target column '{self.target_column}' not found in training data"
            )

        missing = [
            c for c in self.feature_columns if c not in training_data.columns
        ]
        if missing:
            raise ValueError(f"Missing feature columns: {missing}")

        valid_data = training_data[self.feature_columns + [self.target_column]].dropna()
        if len(valid_data) < 5:
            raise ValueError(
                f"Insufficient data: {len(valid_data)} valid rows. Minimum 5 required."
            )

        X = valid_data[self.feature_columns]
        y = valid_data[self.target_column]

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        self.model.fit(X_train, y_train)
        self.feature_names = self.feature_columns

        y_pred = self.model.predict(X_test)

        residuals = y_test - y_pred
        std_residuals = float(np.std(residuals))
        self.residual_std = std_residuals

        rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
        r2 = float(r2_score(y_test, y_pred))
        threshold = float(self.anomaly_threshold_std * std_residuals)

        self.training_metrics = {
            "rmse": rmse,
            "r2_score": r2,
            "residual_std": std_residuals,
            "anomaly_threshold": threshold,
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "n_features": len(self.feature_columns),
        }
        self.is_trained = True

        logger.info(
            f"ShelfAnomalyDetector trained: RMSE={rmse:.4f}, R²={r2:.4f}, "
            f"threshold={threshold:.4f}"
        )
        return self.training_metrics

    def detect_anomalies(self, shelves_data: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Detecta anomalías en los estantes proporcionados.

        Returns:
            Lista de anomalías ordenadas por severidad (mayor primero).
            Cada anomalía incluye: shelf_id, shelf_code, expected_load,
            actual_load, residual, anomaly_type, severity, recommendation.
        """
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call train() first.")

        required = self.feature_columns + [
            self.target_column,
            "shelf_id",
            "shelf_code",
        ]
        missing = [c for c in required if c not in shelves_data.columns]
        if missing:
            raise ValueError(f"Missing required columns: {missing}")

        features = shelves_data[self.feature_columns].fillna(0)
        predictions = self.model.predict(features)

        # Calcular residual std global para threshold adaptativo
        all_residuals = shelves_data[self.target_column].values - predictions
        global_std = float(np.std(all_residuals)) if len(all_residuals) > 1 else self.residual_std
        if global_std == 0:
            global_std = self.residual_std if self.residual_std > 0 else 1.0

        anomalies = []
        for idx, row in shelves_data.iterrows():
            actual = float(row[self.target_column])
            expected = float(predictions[idx])
            residual = abs(actual - expected)

            is_anomaly = residual > self.anomaly_threshold_std * global_std

            if is_anomaly:
                classification = self._classify_anomaly(row, expected)
                anomalies.append(
                    {
                        "shelf_id": str(row["shelf_id"]),
                        "shelf_code": row["shelf_code"],
                        "expected_load": round(expected, 2),
                        "actual_load": round(actual, 2),
                        "residual": round(residual, 2),
                        "anomaly_type": classification["type"],
                        "severity": classification["severity"],
                        "recommendation": classification["recommendation"],
                    }
                )

        return sorted(anomalies, key=lambda a: a["severity"], reverse=True)

    def _classify_anomaly(self, row: pd.Series, expected_load: float) -> Dict:
        """
        Clasifica el tipo de anomalía basándose en las features del estante
        y genera una recomendación accionable.
        """
        actual = float(row[self.target_column])
        loan_max = float(row.get("book_loan_rate_30d_max", 0))
        conc = float(row.get("category_concentration_pct", 0))
        diversity = int(row.get("shelf_category_diversity", 0))
        access = int(row.get("shelf_access_score", 3))
        remaining = float(row.get("shelf_capacity_remaining", 0))
        book_count = int(row.get("shelf_book_count", 0))

        # UNDERUTILIZED: mucha capacidad libre + libros de alta demanda
        if actual < expected_load - 20 and loan_max > 3:
            return {
                "type": "UNDERUTILIZED",
                "severity": 0.6,
                "recommendation": (
                    f"Estante con {book_count} libros de alta demanda pero baja carga "
                    f"({actual:.0f}%). Considere reasignar libros de otras estanterías "
                    f"para aprovechar el espacio disponible."
                ),
            }

        # OVERCONCENTRATED: >60% de una categoría con baja rotación
        if conc > 60 and loan_max < 1:
            return {
                "type": "OVERCONCENTRATED",
                "severity": 0.85,
                "recommendation": (
                    f"Estante con {conc:.0f}% de una categoría de baja rotación. "
                    f"Reubique libros para mejorar la diversidad y el acceso."
                ),
            }

        # MISPLACED_HIGH_DEMAND: alta demanda + bajo acceso
        if loan_max > 3 and access <= 2:
            return {
                "type": "MISPLACED_HIGH_DEMAND",
                "severity": 0.85,
                "recommendation": (
                    f"Libros de alta demanda (tasa {loan_max:.1f}) en estante de "
                    f"bajo acceso (nivel {access}/5). Mueva los libros a un estante "
                    f"más accesible para mejorar la rotación."
                ),
            }

        # OVERWEIGHT_RISK: >85% capacidad + baja rotación
        if actual > 85 and loan_max < 1:
            return {
                "type": "OVERWEIGHT_RISK",
                "severity": 0.6,
                "recommendation": (
                    f"Estante al {actual:.0f}% de capacidad con libros de baja "
                    f"demanda. Considere mover libros de bajo valor a ubicaciones "
                    f"menos prioritarias."
                ),
            }

        # CATEGORY_IMBALANCE: categoría concentrada en un solo estante
        if conc > 80 and diversity <= 1:
            return {
                "type": "CATEGORY_IMBALANCE",
                "severity": 0.3,
                "recommendation": (
                    f"Categoría concentrada en un solo estante ({conc:.0f}%). "
                    f"Distribuya entre múltiples estantes para mejorar la organización."
                ),
            }

        # Default: anomalía genérica por desviación de carga
        return {
            "type": "LOAD_DEVIATION",
            "severity": 0.5,
            "recommendation": (
                f"Carga del estante ({actual:.0f}%) difiere significativamente "
                f"de lo esperado ({expected_load:.0f}%). Revise la distribución."
            ),
        }

    def predict(self, features: pd.DataFrame) -> np.ndarray:
        """Predice la carga esperada para cada estante."""
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call train() first.")
        features = features[self.feature_columns].fillna(0)
        return self.model.predict(features)

    def get_feature_importance(self) -> dict:
        """Retorna la importancia de cada feature en el modelo."""
        if not self.is_trained:
            return {}
        importance = self.model.feature_importances_
        return dict(zip(self.feature_columns, importance.tolist()))

    def _get_extra_state(self) -> dict:
        return {
            "residual_std": getattr(self, "residual_std", None),
        }

    def _set_extra_state(self, state: dict) -> None:
        if "residual_std" in state:
            self.residual_std = state["residual_std"]
