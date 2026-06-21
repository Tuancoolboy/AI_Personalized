# Backend — FastAPI + LangGraph

Python backend chạy **native** toàn bộ API surface (không còn proxy sang Next.js). Chạy từ thư mục này với `PYTHONPATH=..` (package `backend` nằm trong `src/`).

```bash
cd src/backend
pip install -r requirements.txt
# Copy env từ repo root hoặc .env.local — cần OPENAI_API_KEY, SUPABASE_* khi chạy dev/prod
PYTHONPATH=.. uvicorn backend.main:app --reload --port 8000
pytest tests/ -v
```

Cấu trúc:

```
src/backend/
├── agents/       # LangGraph (graph.py, nodes/, tools/)
├── api/          # FastAPI routes theo domain (user, learning, chat, org, manager, agent, public)
├── models/       # Pydantic schemas
├── services/     # Business logic + Supabase gateway
├── tests/
├── main.py
└── config.py
```

## Ops endpoints

- `GET /health` — liveness (`status`, `env`)
- `GET /api/v1/status` — readiness (`status`, `env`)

Source tham chiếu TypeScript cũ (clone từ Next.js API) nằm ở `src/backend/next_clone/` — chỉ để đối chiếu khi port logic, không dùng runtime.
