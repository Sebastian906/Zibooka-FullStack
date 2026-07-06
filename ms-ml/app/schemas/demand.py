from pydantic import BaseModel, Field

class DemandRequest(BaseModel):
    """Schema para predicción de demanda."""
    total_loans: int = Field(
        ..., ge=0, description="Total de préstamos históricos"
    )
    unique_users: int = Field(
        ..., ge=0, description="Usuarios distintos que pidieron el libro"
    )
    avg_rating: float = Field(
        ..., ge=0, le=5, description="Calificación promedio (0-5)"
    )
    days_since_added: int = Field(
        ..., ge=0, description="Días desde que se agregó al catálogo"
    )
    category_encoded: int = Field(
        ..., ge=0, description="Categoría codificada numéricamente"
    )
    author_popularity: float = Field(
        ..., ge=0, le=10, description="Popularidad del autor (0-10)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "total_loans": 15,
                "unique_users": 8,
                "avg_rating": 4.2,
                "days_since_added": 120,
                "category_encoded": 3,
                "author_popularity": 6.5,
            }
        }

class DemandResponse(BaseModel):
    is_high_demand: bool = Field(..., description="True si se predice alta demanda")
    probability: float = Field(
        ..., ge=0, le=1, description="Probabilidad de alta demanda"
    )

class DemandTrainRequest(BaseModel):
    data: list[dict] = Field(
        ..., description="Lista de registros con features y loan_count"
    )

class DemandTrainResponse(BaseModel):
    message: str
    metrics: dict