from pydantic import BaseModel, Field
from typing import Optional

class DemandRequest(BaseModel):
    """Schema para predicción de demanda de UN libro individual.
    Mantenido para compatibilidad con el cliente NestJS existente.
    """
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

class DemandListRequest(BaseModel):
    """Request para predicción de demanda para TODOS los libros activos."""
    days_ahead: int = Field(default=30, ge=1, le=90, description="Días a predecir")
    limit: int = Field(default=20, ge=1, le=100, description="Máximo de libros a retornar")
    min_score: float = Field(default=0.3, ge=0, le=1, description="Score mínimo de demanda")

class DemandListItem(BaseModel):
    """Un libro con su score de demanda predicho."""
    product_id: str = Field(..., description="ID del libro en MongoDB")
    title: str = Field(..., description="Nombre del libro")
    category: str = Field(..., description="Categoría del libro")
    demand_score: float = Field(..., ge=0, le=1, description="Probabilidad de alta demanda")
    predicted_loans: int = Field(..., ge=0, description="Préstamos estimados en el período")
    stock_available: bool = Field(..., description="Si hay stock disponible")

class DemandListResponse(BaseModel):
    """Response con lista de libros predichos como alta demanda."""
    predictions: list[DemandListItem] = Field(default_factory=list)
    model_version: str = Field(default="1.0")
    model_metrics: dict = Field(default_factory=dict)
    total_books_evaluated: int = Field(default=0)
    threshold_used: int = Field(default=3, description="Umbral de demanda alta")

class DemandTrainRequest(BaseModel):
    data: list[dict] = Field(
        ..., description="Lista de registros con features y loan_count_30d"
    )

class DemandTrainResponse(BaseModel):
    message: str
    metrics: dict