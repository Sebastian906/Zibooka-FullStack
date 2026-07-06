from pydantic import BaseModel, Field

class WaitTimeRequest(BaseModel):
    """Schema para predicción de tiempo de espera."""
    book_popularity_score: float = Field(
        ..., ge=0, le=10, description="Score de popularidad del libro (0-10)"
    )
    active_loans_count: int = Field(
        ..., ge=0, description="Préstamos activos de este libro"
    )
    avg_loan_duration: float = Field(
        ..., ge=0, description="Duración promedio de préstamos anteriores (días)"
    )
    day_of_week: int = Field(
        ..., ge=0, le=6, description="Día de la semana (0=Lunes, 6=Domingo)"
    )
    user_history_count: int = Field(
        ..., ge=0, description="Número de préstamos del usuario"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "book_popularity_score": 7.5,
                "active_loans_count": 2,
                "avg_loan_duration": 14.0,
                "day_of_week": 2,
                "user_history_count": 5,
            }
        }

class WaitTimeResponse(BaseModel):
    predicted_wait_days: float = Field(..., description="Días de espera estimados")
    confidence: str = Field(..., description="Nivel de confianza: low/medium/high")

class WaitTimeTrainRequest(BaseModel):
    """Schema para datos de entrenamiento de tiempo de espera."""
    data: list[dict] = Field(
        ..., description="Lista de registros con features y wait_days"
    )

class WaitTimeTrainResponse(BaseModel):
    message: str
    metrics: dict