run_frontend:
	cd frontend && npm run build

run_backend:
	cd backend
	source venv/bin/activate
	uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# cd backend && uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload