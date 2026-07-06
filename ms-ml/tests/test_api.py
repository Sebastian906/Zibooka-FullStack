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
    response = await client.post(
        "/predict/wait-time",
        json={
            "book_popularity_score": 5.0,
            "active_loans_count": 2,
            "avg_loan_duration": 14.0,
            "day_of_week": 2,
            "user_history_count": 3,
        },
    )
    # Debería fallar si el modelo no está entrenado
    assert response.status_code in [200, 503]

@pytest.mark.asyncio
async def test_predict_demand_without_model(client):
    response = await client.post(
        "/predict/demand",
        json={
            "total_loans": 10,
            "unique_users": 5,
            "avg_rating": 4.0,
            "days_since_added": 100,
            "category_encoded": 2,
            "author_popularity": 6.0,
        },
    )
    assert response.status_code in [200, 503]