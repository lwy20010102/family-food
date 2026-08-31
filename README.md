# FamilyFood

家庭智能点菜平台的初始骨架。

## 目录

- `frontend/`: Next.js Web 前端
- `backend/`: FastAPI 后端
- `docker-compose.yml`: PostgreSQL

## 启动

1. 可选：如果你要切到 PostgreSQL，先启动数据库

```powershell
docker compose up -d db
```

2. 启动后端

```powershell
cd backend
python -m venv .venv
. .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

如果没有配置 `.env`，后端会默认使用本地 `SQLite`，这样可以直接启动。

3. 启动前端

```powershell
cd frontend
pnpm install
pnpm dev
```

## 验证

- 前端: `http://localhost:3000`
- 后端健康检查: `http://localhost:8000/api/v1/health`
