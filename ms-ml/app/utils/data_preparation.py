"""
Preparación de datos para entrenamiento.
Transforma datos crudos de MongoDB en DataFrames listos para ML.
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Any


def prepare_training_data(
    loans: list[dict],
    products: list[dict],
    users: list[dict],
) -> dict[str, pd.DataFrame]:
    """
    Transforma datos crudos de MongoDB en datasets de entrenamiento.

    Returns:
        Dict con DataFrames para cada modelo:
        - wait_time: para predecir días de espera
        - demand: para predecir demanda de libros
        - overdue: para predecir retrasos
        - anomaly: para detectar anomalías
    """
    if not loans:
        return {}

    # Convertir a DataFrames
    df_loans = pd.DataFrame(loans)
    df_products = pd.DataFrame(products) if products else pd.DataFrame()
    df_users = pd.DataFrame(users) if users else pd.DataFrame()

    # Convertir ObjectId a string para merge
    for col in ["userId", "bookId", "_id"]:
        if col in df_loans.columns:
            df_loans[col] = df_loans[col].astype(str)

    results = {}

    # WAIT TIME
    wait_time_data = _prepare_wait_time_data(df_loans, df_products)
    if wait_time_data is not None and len(wait_time_data) >= 5:
        results["wait_time"] = wait_time_data

    # DEMAND
    demand_data = _prepare_demand_data(df_loans, df_products)
    if demand_data is not None and len(demand_data) >= 5:
        results["demand"] = demand_data

    # OVERDUE
    overdue_data = _prepare_overdue_data(df_loans, df_users)
    if overdue_data is not None and len(overdue_data) >= 5:
        results["overdue"] = overdue_data

    # ANOMALY
    anomaly_data = _prepare_anomaly_data(df_loans, df_users)
    if anomaly_data is not None and len(anomaly_data) >= 10:
        results["anomaly"] = anomaly_data

    return results

def _prepare_wait_time_data(
    df_loans: pd.DataFrame, df_products: pd.DataFrame
) -> pd.DataFrame | None:
    """Prepara datos para el modelo de tiempo de espera."""
    if df_loans.empty:
        return None

    # Calcular features por libro
    loan_counts = df_loans.groupby("bookId").size().reset_index(name="active_loans_count")
    
    # Popularidad score (normalizado)
    max_loans = loan_counts["active_loans_count"].max() if len(loan_counts) > 0 else 1
    loan_counts["book_popularity_score"] = (
        loan_counts["active_loans_count"] / max(max_loans, 1)
    ) * 10

    # Duración promedio de préstamos
    if "loanDate" in df_loans.columns and "dueDate" in df_loans.columns:
        df_loans["loanDate"] = pd.to_datetime(df_loans["loanDate"], errors="coerce")
        df_loans["dueDate"] = pd.to_datetime(df_loans["dueDate"], errors="coerce")
        df_loans["duration"] = (df_loans["dueDate"] - df_loans["loanDate"]).dt.days
        avg_duration = df_loans.groupby("bookId")["duration"].mean().reset_index()
        avg_duration.columns = ["bookId", "avg_loan_duration"]
    else:
        avg_duration = pd.DataFrame(
            {"bookId": loan_counts["bookId"], "avg_loan_duration": 14}
        )

    # Merge
    result = loan_counts.merge(avg_duration, on="bookId", how="left")

    # Agregar día de la semana y historial
    result["day_of_week"] = datetime.now().weekday()
    result["user_history_count"] = 1  # Default

    # Target: tiempo de espera simulado (en producción serían datos reales)
    np.random.seed(42)
    result["wait_days"] = np.random.exponential(scale=7, size=len(result))

    return result[
        [
            "book_popularity_score",
            "active_loans_count",
            "avg_loan_duration",
            "day_of_week",
            "user_history_count",
            "wait_days",
        ]
    ].dropna()

def _prepare_demand_data(
    df_loans: pd.DataFrame, df_products: pd.DataFrame
) -> pd.DataFrame | None:
    """Prepara datos para el modelo de demanda."""
    if df_loans.empty:
        return None

    # Contar préstamos por libro
    loan_stats = df_loans.groupby("bookId").agg(
        total_loans=("bookId", "size"),
        unique_users=("userId", "nunique"),
    ).reset_index()

    # Features base
    result = loan_stats.copy()
    result["avg_rating"] = 3.5  # Default
    result["days_since_added"] = 180  # Default
    result["category_encoded"] = 0  # Default
    result["author_popularity"] = 5.0  # Default

    # Target (DemandPredictor espera "loan_count_target")
    result["loan_count_target"] = result["total_loans"]

    return result[
        [
            "total_loans",
            "unique_users",
            "avg_rating",
            "days_since_added",
            "category_encoded",
            "author_popularity",
            "loan_count_target",
        ]
    ]

def _prepare_overdue_data(
    df_loans: pd.DataFrame, df_users: pd.DataFrame
) -> pd.DataFrame | None:
    """Prepara datos para el modelo de retrasos."""
    if df_loans.empty:
        return None

    result = pd.DataFrame()

    # Features del préstamo
    result["loan_duration_days"] = 14  # Default

    # Historial del usuario
    user_loan_counts = df_loans.groupby("userId").size().reset_index(name="user_total_loans")
    result["user_total_loans"] = 1

    # Tasa de retrasos del usuario
    if "status" in df_loans.columns:
        user_overdue = df_loans.groupby("userId")["status"].apply(
            lambda x: (x == "overdue").mean()
        ).reset_index(name="user_overdue_rate")
    else:
        user_overdue = pd.DataFrame(
            {"userId": df_loans["userId"].unique(), "user_overdue_rate": 0.1}
        )

    result["user_overdue_rate"] = 0.1
    result["book_overdue_rate"] = 0.1
    result["days_until_due"] = 7
    result["is_weekend"] = False

    # Target
    if "status" in df_loans.columns:
        result["is_overdue"] = (df_loans["status"] == "overdue").astype(int).values
    else:
        result["is_overdue"] = 0

    return result[
        [
            "loan_duration_days",
            "user_total_loans",
            "user_overdue_rate",
            "book_overdue_rate",
            "days_until_due",
            "is_weekend",
            "is_overdue",
        ]
    ]

def _prepare_anomaly_data(
    df_loans: pd.DataFrame, df_users: pd.DataFrame
) -> pd.DataFrame | None:
    """Prepara datos para detección de anomalías."""
    if df_loans.empty or len(df_loans) < 10:
        return None

    # Agregar por usuario
    user_stats = df_loans.groupby("userId").agg(
        loans_per_month=("userId", "size"),
        unique_categories=("bookId", "nunique"),
    ).reset_index()

    result = pd.DataFrame()
    result["loans_per_month"] = user_stats["loans_per_month"]
    result["avg_loan_duration"] = 14.0
    result["overdue_rate"] = 0.1
    result["total_spent"] = 100.0
    result["unique_categories"] = user_stats["unique_categories"]
    result["weekend_loans"] = 1

    return result