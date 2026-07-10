from pydantic import BaseModel, Field
from typing import List, Optional

# Schemas existentes (Loan Anomaly Detection - legacy)
class AnomalyRequest(BaseModel):
    """Schema para detección de anomalías de comportamiento de préstamo."""
    loans_per_month: float = Field(
        ..., ge=0, description="Préstamos promedio por mes"
    )
    avg_loan_duration: float = Field(
        ..., ge=0, description="Duración promedio de préstamos (días)"
    )
    overdue_rate: float = Field(
        ..., ge=0, le=1, description="Tasa de retrasos (0-1)"
    )
    total_spent: float = Field(
        ..., ge=0, description="Total gastado en el sistema"
    )
    unique_categories: int = Field(
        ..., ge=0, description="Categorías distintas de libros pedidos"
    )
    weekend_loans: int = Field(
        ..., ge=0, description="Préstamos realizados en fin de semana"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "loans_per_month": 8.5,
                "avg_loan_duration": 12.0,
                "overdue_rate": 0.1,
                "total_spent": 250.0,
                "unique_categories": 4,
                "weekend_loans": 2,
            }
        }

class AnomalyResponse(BaseModel):
    is_anomaly: bool = Field(..., description="True si se detecta comportamiento anómalo")
    anomaly_score: float = Field(
        ..., description="Score de anomalia (menor = más anómalo)"
    )

class AnomalyTrainRequest(BaseModel):
    data: list[dict] = Field(..., description="Lista de registros de comportamiento")

class AnomalyTrainResponse(BaseModel):
    message: str
    metrics: dict

# Schemas nuevos (Shelf Inventory Anomaly Detection)
class ShelfAnomalyItem(BaseModel):
    """Una anomalía individual detectada en un estante."""
    shelf_id: str = Field(..., description="ID del estante")
    shelf_code: str = Field(..., description="Código del estante")
    expected_load: float = Field(..., description="Carga esperada (%) según el modelo")
    actual_load: float = Field(..., description="Carga real (%) del estante")
    residual: float = Field(..., description="Desviación entre carga real y esperada")
    anomaly_type: str = Field(
        ...,
        description="Tipo de anomalía: UNDERUTILIZED, OVERCONCENTRATED, "
        "MISPLACED_HIGH_DEMAND, OVERWEIGHT_RISK, CATEGORY_IMBALANCE, LOAD_DEVIATION",
    )
    severity: float = Field(
        ..., ge=0, le=1, description="Severidad de la anomalía (0-1)"
    )
    recommendation: str = Field(..., description="Recomendación accionable para el admin")

class ShelfAnomaliesResponse(BaseModel):
    """Respuesta del endpoint de detección de anomalías de estantes."""
    anomalies: List[ShelfAnomalyItem] = Field(
        ..., description="Lista de anomalías detectadas, ordenadas por severidad"
    )
    total_shelves_evaluated: int = Field(
        ..., description="Total de estantes evaluados"
    )
    total_anomalies: int = Field(..., description="Total de anomalías encontradas")
    model_metrics: Optional[dict] = Field(
        None, description="Métricas del modelo entrenado"
    )

class ShelfAnomalyTrainResponse(BaseModel):
    """Respuesta del endpoint de entrenamiento del modelo de anomalías de estantes."""
    message: str
    metrics: dict
    feature_importance: Optional[dict] = None