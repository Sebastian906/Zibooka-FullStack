import pytest
import pandas as pd
import numpy as np

@pytest.fixture
def sample_training_data():
    """Datos de entrenamiento de ejemplo con las 6 features del issue."""
    np.random.seed(42)
    n_samples = 50

    return pd.DataFrame(
        {
            "queue_position": np.random.randint(1, 10, size=n_samples),
            "category_encoded": np.random.choice(
                ["Fiction", "Science", "History", "Art"], size=n_samples
            ),
            "historical_avg_wait_days": np.random.uniform(1, 14, size=n_samples),
            "book_return_rate_30d": np.random.uniform(0, 1, size=n_samples),
            "total_active_reservations": np.random.randint(0, 15, size=n_samples),
            "stock_was_zero_days": np.random.randint(0, 30, size=n_samples),
            "wait_days": np.random.exponential(scale=7, size=n_samples),
        }
    )

@pytest.fixture
def sample_classification_data():
    """Datos de clasificación de ejemplo (target: loan_count_target)."""
    np.random.seed(42)
    n_samples = 50

    return pd.DataFrame(
        {
            "feature_1": np.random.randn(n_samples),
            "feature_2": np.random.randn(n_samples),
            "feature_3": np.random.randn(n_samples),
            "loan_count_target": np.random.randint(0, 10, size=n_samples),
        }
    )

@pytest.fixture
def sample_anomaly_data():
    """Datos de anomalías de ejemplo."""
    np.random.seed(42)
    n_samples = 20

    return pd.DataFrame(
        {
            "loans_per_month": np.random.exponential(scale=5, size=n_samples),
            "avg_loan_duration": np.random.normal(14, 3, size=n_samples),
            "overdue_rate": np.random.uniform(0, 0.5, size=n_samples),
            "total_spent": np.random.exponential(100, size=n_samples),
            "unique_categories": np.random.randint(1, 10, size=n_samples),
            "weekend_loans": np.random.randint(0, 5, size=n_samples),
        }
    )