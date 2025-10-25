def test_health_reports_status_and_db_flag(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "healthy"
    assert isinstance(data.get("db"), bool)


