# KisanLink prototype API

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

The API stores the connected SIH demo state in `kisanlink.db`. The frontend uses it through Vite's `/api` proxy on port `8001` and automatically falls back to deterministic localStorage state if the API is unavailable.
