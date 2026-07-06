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
        model = WaitTimePredictor()
        metrics = model.train(sample_training_data)

        assert model.is_trained
        assert "r2" in metrics
        assert "rmse" in metrics
        assert metrics["n_samples"] == len(sample_training_data)

        # Predecir
        test_features = sample_training_data.drop(columns=["wait_days"]).head(3)
        predictions = model.predict(test_features)

        assert len(predictions) == 3
        assert all(p >= 0 for p in predictions)  # No negativos

    def test_save_and_load(self, sample_training_data):
        model = WaitTimePredictor()
        model.train(sample_training_data)

        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "wait_time.joblib")
            model.save(path)

            loaded = WaitTimePredictor.load(path)
            assert loaded.is_trained
            assert loaded.feature_names == model.feature_names

    def test_feature_importance(self, sample_training_data):
        model = WaitTimePredictor()
        model.train(sample_training_data)

        importance = model.get_feature_importance()
        assert len(importance) > 0

class TestDemandPredictor:
    def test_train_and_predict(self, sample_classification_data):
        model = DemandPredictor()
        metrics = model.train(sample_classification_data)

        assert model.is_trained
        assert "accuracy" in metrics
        assert "f1" in metrics

        test_features = sample_classification_data.drop(columns=["loan_count"]).head(3)
        predictions = model.predict(test_features)

        assert len(predictions) == 3
        assert all(p in [0, 1] for p in predictions)

    def test_predict_proba(self, sample_classification_data):
        model = DemandPredictor()
        model.train(sample_classification_data)

        test_features = sample_classification_data.drop(columns=["loan_count"]).head(3)
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

class TestBasePredictorValidation:
    def test_missing_target_column(self, sample_training_data):
        model = WaitTimePredictor()
        bad_data = sample_training_data.drop(columns=["wait_days"])

        with pytest.raises(ValueError, match="Target column"):
            model.train(bad_data)

    def test_insufficient_samples(self):
        model = WaitTimePredictor()
        small_data = pd.DataFrame(
            {"f1": [1, 2], "f2": [3, 4], "wait_days": [5, 6]}
        )

        with pytest.raises(ValueError, match="Insufficient data"):
            model.train(small_data)