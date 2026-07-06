from pydantic import BaseModel, Field

class AnomalyRequest(BaseModel):
    """Schema para detección de anomalías."""
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