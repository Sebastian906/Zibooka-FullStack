from pydantic import BaseModel, Field

class OverdueRequest(BaseModel):
    """Schema para predicción de riesgo de retraso."""
    loan_duration_days: int = Field(
        ..., ge=1, description="Duración del préstamo en días"
    )
    user_total_loans: int = Field(
        ..., ge=0, description="Total de préstamos del usuario"
    )
    user_overdue_rate: float = Field(
        ..., ge=0, le=1, description="Tasa de retrasos del usuario (0-1)"
    )
    book_overdue_rate: float = Field(
        ..., ge=0, le=1, description="Tasa de retrasos del libro (0-1)"
    )
    days_until_due: int = Field(
        ..., description="Días hasta vencimiento (puede ser negativo si venció)"
    )
    is_weekend: bool = Field(..., description="Si el vencimiento es fin de semana")

    class Config:
        json_schema_extra = {
            "example": {
                "loan_duration_days": 14,
                "user_total_loans": 3,
                "user_overdue_rate": 0.2,
                "book_overdue_rate": 0.15,
                "days_until_due": 5,
                "is_weekend": False,
            }
        }

class OverdueResponse(BaseModel):
    risk_score: float = Field(
        ..., ge=0, le=1, description="Score de riesgo (0=bajo, 1=alto)"
    )
    is_high_risk: bool = Field(
        ..., description="True si el riesgo supera el umbral"
    )

class OverdueTrainRequest(BaseModel):
    data: list[dict] = Field(
        ..., description="Lista de registros con features e is_overdue"
    )

class OverdueTrainResponse(BaseModel):
    message: str
    metrics: dict