import pytest
import pandas as pd
import numpy as np
import tempfile
import os
from app.models.wait_time_predictor import WaitTimePredictor
from app.models.demand_predictor import DemandPredictor
from app.models.overdue_predictor import OverduePredictor
from app.models.anomaly_detector import AnomalyDetector

class TestWaitTimePredictor:
    def test_train_and_predict(self, sample_training_data):
        """Entrena el modelo y verifica predicciones básicas."""
        model = WaitTimePredictor()
        metrics = model.train(sample_training_data)

        assert model.is_trained
        assert "rmse" in metrics
        assert "mae" in metrics
        assert "r2" in metrics
        assert "coefficients" in metrics
        assert "intercept" in metrics
        assert metrics["n_samples"] == len(sample_training_data)

        # Predecir con DataFrame
        test_features = sample_training_data.drop(columns=["wait_days"]).head(3)
        predictions = model.predict(test_features)

        assert len(predictions) == 3
        assert all(p >= 0 for p in predictions)

    def test_predict_single(self, sample_training_data):
        """Predicción individual con predict_single()."""
        model = WaitTimePredictor()
        model.train(sample_training_data)

        result = model.predict_single(
            queue_position=2,
            category="Fiction",
            historical_avg=5.0,
            return_rate=0.6,
            active_reservations=3,
            stock_zero_days=7,
        )

        assert isinstance(result, float)
        assert result >= 0

    def test_predict_single_unseen_category(self, sample_training_data):
        """Categoría no vista en entrenamiento usa编码 0."""
        model = WaitTimePredictor()
        model.train(sample_training_data)

        result = model.predict_single(
            queue_position=1,
            category="UnknownCategory",
            historical_avg=3.0,
            return_rate=0.3,
            active_reservations=1,
            stock_zero_days=0,
        )

        assert result >= 0

    def test_save_and_load(self, sample_training_data):
        """Serialización y deserialización del modelo."""
        model = WaitTimePredictor()
        model.train(sample_training_data)

        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "wait_time.joblib")
            model.save(path)

            loaded = WaitTimePredictor.load(path)
            assert loaded.is_trained
            assert loaded.feature_names == model.feature_names
            assert loaded._label_classes == model._label_classes

            # Verificar que las predicciones coinciden
            test_features = sample_training_data.drop(columns=["wait_days"]).head(1)
            orig_pred = model.predict(test_features)
            loaded_pred = loaded.predict(test_features)
            assert abs(float(orig_pred[0]) - float(loaded_pred[0])) < 0.01

    def test_feature_importance(self, sample_training_data):
        """Coeficientes de importancia de features."""
        model = WaitTimePredictor()
        model.train(sample_training_data)

        importance = model.get_feature_importance()
        assert len(importance) == 6
        assert "queue_position" in importance
        assert "historical_avg_wait_days" in importance

    def test_no_negative_predictions(self, sample_training_data):
        """Las predicciones nunca deben ser negativas."""
        model = WaitTimePredictor()
        model.train(sample_training_data)

        # Crear features que podrían producir valores negativos
        extreme_features = pd.DataFrame(
            {
                "queue_position": [0],
                "category_encoded": ["Fiction"],
                "historical_avg_wait_days": [0],
                "book_return_rate_30d": [1.0],
                "total_active_reservations": [0],
                "stock_was_zero_days": [0],
            }
        )
        predictions = model.predict(extreme_features)
        assert all(p >= 0 for p in predictions)

    def test_outlier_filtering_too_few_remaining(self):
        """Si el filtrado de outliers deja < 5 registros, lanza error."""
        model = WaitTimePredictor()
        data = pd.DataFrame(
            {
                "queue_position": [1, 2, 3, 100, 200],
                "category_encoded": ["A", "B", "C", "A", "B"],
                "historical_avg_wait_days": [1, 2, 3, 200, 300],
                "book_return_rate_30d": [0.5, 0.3, 0.7, 0.1, 0.9],
                "total_active_reservations": [1, 2, 3, 10, 20],
                "stock_was_zero_days": [0, 0, 0, 50, 100],
                "wait_days": [1, 2, 3, 150, 200],  # 2 > 90 se filtran, quedan 3
            }
        )
        with pytest.raises(ValueError, match="Insufficient data after filtering"):
            model.train(data)

    def test_outlier_filtering_enough_data(self):
        """Si hay suficientes datos después de filtrar, entrena correctamente."""
        model = WaitTimePredictor()
        # 10 registros válidos (< 90) + 2 outliers (> 90)
        data = pd.DataFrame(
            {
                "queue_position": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100, 200],
                "category_encoded": ["A", "B", "C", "A", "B", "C", "A", "B", "C", "A", "B", "C"],
                "historical_avg_wait_days": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 200, 300],
                "book_return_rate_30d": [0.5, 0.3, 0.7, 0.4, 0.6, 0.8, 0.2, 0.9, 0.1, 0.5, 0.1, 0.9],
                "total_active_reservations": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 20],
                "stock_was_zero_days": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 50, 100],
                "wait_days": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 150, 200],
            }
        )
        metrics = model.train(data)
        assert metrics["n_samples"] == 10  # Los 2 outliers se filtraron

    def test_missing_features_raises_error(self):
        """Faltan columnas requeridas."""
        model = WaitTimePredictor()
        bad_data = pd.DataFrame(
            {
                "wrong_column": [1, 2, 3, 4, 5],
                "wait_days": [1, 2, 3, 4, 5],
            }
        )

        with pytest.raises(ValueError, match="Missing feature columns"):
            model.train(bad_data)

    def test_missing_target_raises_error(self, sample_training_data):
        """Falta la columna target."""
        model = WaitTimePredictor()
        bad_data = sample_training_data.drop(columns=["wait_days"])

        with pytest.raises(ValueError, match="Target column"):
            model.train(bad_data)

    def test_insufficient_data_raises_error(self):
        """Menos de 5 registros lanza error."""
        model = WaitTimePredictor()
        small_data = pd.DataFrame(
            {
                "queue_position": [1, 2],
                "category_encoded": ["A", "B"],
                "historical_avg_wait_days": [1, 2],
                "book_return_rate_30d": [0.5, 0.3],
                "total_active_reservations": [1, 2],
                "stock_was_zero_days": [0, 0],
                "wait_days": [1, 2],
            }
        )

        with pytest.raises(ValueError, match="Insufficient data"):
            model.train(small_data)

    def test_predict_before_train_raises_error(self):
        """Predecir sin entrenar lanza error."""
        model = WaitTimePredictor()

        with pytest.raises(RuntimeError, match="not trained"):
            model.predict_single(
                queue_position=1,
                category="A",
                historical_avg=1,
                return_rate=0.5,
                active_reservations=1,
                stock_zero_days=0,
            )

class TestDemandPredictor:
    def test_train_and_predict(self, sample_classification_data):
        model = DemandPredictor()
        metrics = model.train(sample_classification_data)

        assert model.is_trained
        assert "accuracy" in metrics
        assert "f1" in metrics

        test_features = sample_classification_data.drop(columns=["loan_count_target"]).head(3)
        predictions = model.predict(test_features)

        assert len(predictions) == 3
        assert all(p in [0, 1] for p in predictions)

    def test_predict_proba(self, sample_classification_data):
        model = DemandPredictor()
        model.train(sample_classification_data)

        test_features = sample_classification_data.drop(columns=["loan_count_target"]).head(3)
        proba = model.predict_proba(test_features)

        assert proba.shape == (3, 2)
        assert all(0 <= p <= 1 for row in proba for p in row)

class TestAnomalyDetector:
    def test_train_and_predict(self, sample_anomaly_data):
        model = AnomalyDetector()
        metrics = model.train(sample_anomaly_data)

        assert model.is_trained
        assert "n_anomalies" in metrics
        assert "anomaly_rate" in metrics

        predictions = model.predict(sample_anomaly_data.head(5))
        assert len(predictions) == 5
        assert all(p in [-1, 1] for p in predictions)

    def test_insufficient_data(self):
        model = AnomalyDetector()
        small_data = pd.DataFrame({"a": [1, 2, 3]})

        with pytest.raises(ValueError, match="Insufficient data"):
            model.train(small_data)