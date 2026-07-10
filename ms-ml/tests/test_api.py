import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "database" in data
    assert "available_models" in data

@pytest.mark.asyncio
async def test_readiness_check(client):
    response = await client.get("/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert "ready" in data

@pytest.mark.asyncio
async def test_predict_wait_time_without_model(client):
    """Predicción sin modelo entrenado retorna 503."""
    response = await client.post(
        "/predict/wait-time",
        json={
            "product_id": "507f1f77bcf86cd799439011",
            "queue_position": 3,
        },
    )
    # Sin modelo entrenado → 503, o 404 si el producto no existe
    assert response.status_code in [404, 503]

@pytest.mark.asyncio
async def test_predict_wait_time_invalid_product(client):
    """Predicción con product_id inválido."""
    response = await client.post(
        "/predict/wait-time",
        json={
            "product_id": "invalid_id",
            "queue_position": 1,
        },
    )
    assert response.status_code in [400, 404, 503]

@pytest.mark.asyncio
async def test_train_wait_time_without_data(client):
    """Entrenamiento sin datos suficientes retorna error."""
    response = await client.post("/train/wait-time/from-database")
    # Puede fallar por: MongoDB no conectado, o datos insuficientes
    assert response.status_code in [400, 500, 503]

@pytest.mark.asyncio
async def test_predict_demand_without_model(client):
    response = await client.post(
        "/predict/demand/list",
        json={
            "days_ahead": 30,
            "limit": 5,
            "min_score": 0.3,
        },
    )
    # Sin DB: 500 (collection unavailable). Sin modelo: 503. Con ambos: 200
    assert response.status_code in [200, 500, 503]