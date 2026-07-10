from pydantic import BaseModel, Field

class WaitTimeRequest(BaseModel):
    """Schema para predicción de tiempo de espera.
    
    Recibe identificadores mínimos; el endpoint computa las features
    restantes consultando MongoDB.
    """
    # book_popularity_score: float = Field(
    #     ..., ge=0, le=10, description="Score de popularidad del libro (0-10)"
    # )
    # active_loans_count: int = Field(
    #     ..., ge=0, description="Préstamos activos de este libro"
    # )
    # avg_loan_duration: float = Field(
    #     ..., ge=0, description="Duración promedio de préstamos anteriores (días)"
    # )
    # day_of_week: int = Field(
    #     ..., ge=0, le=6, description="Día de la semana (0=Lunes, 6=Domingo)"
    # )
    # user_history_count: int = Field(
    #     ..., ge=0, description="Número de préstamos del usuario"
    # )
    product_id: str = Field(
        ..., description="ID del libro (ObjectId de MongoDB)"
    )
    queue_position: int = Field(
        ..., ge=1, description="Posición en la cola de espera (priority)"
    )

    # class Config:
    #     json_schema_extra = {
    #         "example": {
    #             "book_popularity_score": 7.5,
    #             "active_loans_count": 2,
    #             "avg_loan_duration": 14.0,
    #             "day_of_week": 2,
    #             "user_history_count": 5,
    #         }
    #     }

    class Config:
        json_schema_extra = {
            "example": {
                "product_id": "507f1f77bcf86cd799439011",
                "queue_position": 3,
            }
        }

class WaitTimeResponse(BaseModel):
    """Respuesta de predicción de tiempo de espera."""
    estimated_days: float = Field(
        ..., description="Días de espera estimados"
    )
    confidence_interval: dict = Field(
        ...,
        description="Intervalo de confianza {lower: float, upper: float}",
    )
    confidence: str = Field(
        ..., description="Nivel de confianza: low/medium/high"
    )


class WaitTimeTrainRequest(BaseModel):
    """Schema para datos de entrenamiento de tiempo de espera.
    
    Cada registro debe incluir las 6 features y el target wait_days.
    """
    data: list[dict] = Field(
        ...,
        description=(
            "Lista de registros con keys: queue_position, category_encoded, "
            "historical_avg_wait_days, book_return_rate_30d, "
            "total_active_reservations, stock_was_zero_days, wait_days"
        ),
    )

class WaitTimeTrainResponse(BaseModel):
    message: str
    metrics: dict