import numpy as np
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    mean_squared_error,
    mean_absolute_error,
    r2_score,
    roc_auc_score,
)
from typing import Any

def calculate_classification_metrics(
    y_true: np.ndarray, y_pred: np.ndarray
) -> dict[str, Any]:
    """Calcula métricas de clasificación."""
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
    }

def calculate_regression_metrics(
    y_true: np.ndarray, y_pred: np.ndarray
) -> dict[str, Any]:
    """Calcula métricas de regresión."""
    return {
        "mse": float(mean_squared_error(y_true, y_pred)),
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "r2": float(r2_score(y_true, y_pred)),
    }

def calculate_auc(y_true: np.ndarray, y_proba: np.ndarray) -> float:
    """Calcula AUC-ROC para clasificación binaria."""
    if len(np.unique(y_true)) < 2:
        return 0.0
    return float(roc_auc_score(y_true, y_proba))