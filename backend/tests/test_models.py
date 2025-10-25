def test_models_list_shape(client):
    resp = client.get("/api/models")
    assert resp.status_code == 200
    payload = resp.json()
    assert isinstance(payload, dict)
    assert isinstance(payload.get("data"), list)
    if payload["data"]:
        m = payload["data"][0]
        assert isinstance(m, dict)
        assert ("id" in m) or ("name" in m)


