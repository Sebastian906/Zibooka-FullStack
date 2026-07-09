from pydantic import BaseModel, Field

class OverdueRequest(BaseModel):
    """Schema para predicción de riesgo de retraso (6 features - compatible con versión anterior)."""
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

class OverdueExtendedRequest(BaseModel):
    """Schema para predicción extendida con 13 features."""
    user_previous_loans_count: int = Field(
        ..., ge=0, description="Total de préstamos del usuario"
    )
    user_overdue_count: int = Field(
        ..., ge=0, description="Veces que devolvió tarde"
    )
    user_overdue_rate: float = Field(
        ..., ge=0, le=1, description="Tasa de retrasos del usuario (0-1)"
    )
    user_avg_late_days: float = Field(
        ..., ge=0, description="Días promedio de retraso"
    )
    user_days_since_last_loan: int = Field(
        ..., ge=0, description="Días desde su último préstamo"
    )
    user_total_loans_completed: int = Field(
        ..., ge=0, description="Préstamos completados exitosamente"
    )
    book_overdue_rate: float = Field(
        ..., ge=0, le=1, description="Tasa histórica de overdue del libro"
    )
    book_total_loans: int = Field(
        ..., ge=0, description="Préstamos totales del libro"
    )
    book_avg_loan_duration: float = Field(
        ..., ge=0, description="Duración promedio del préstamo del libro"
    )
    day_of_week_loan: int = Field(
        ..., ge=0, le=6, description="Día de la semana del préstamo (0=domingo, 6=sábado)"
    )
    category_encoded: int = Field(
        ..., ge=0, description="Categoría del libro (label encoded)"
    )
    is_weekend: int = Field(
        ..., ge=0, le=1, description="1 si el préstamo es en sábado o domingo"
    )
    loan_hour: int = Field(
        ..., ge=0, le=23, description="Hora del día del préstamo"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "user_previous_loans_count": 5,
                "user_overdue_count": 1,
                "user_overdue_rate": 0.2,
                "user_avg_late_days": 3.5,
                "user_days_since_last_loan": 30,
                "user_total_loans_completed": 4,
                "book_overdue_rate": 0.15,
                "book_total_loans": 10,
                "book_avg_loan_duration": 12.5,
                "day_of_week_loan": 3,
                "category_encoded": 2,
                "is_weekend": 0,
                "loan_hour": 14,
            }
        }

class OverdueResponse(BaseModel):
    risk_score: float = Field(
        ..., ge=0, le=1, description="Score de riesgo (0=bajo, 1=alto)"
    )
    is_high_risk: bool = Field(
        ..., description="True si el riesgo supera el umbral"
    )
    top_features: dict[str, float] | None = Field(
        default=None, description="Top features más importantes"
    )

class OverdueTrainRequest(BaseModel):
    data: list[dict] = Field(
        ..., description="Lista de registros con features e is_overdue"
    )

class OverdueTrainResponse(BaseModel):
    message: str
    metrics: dict