# Todo App

チーム向けのシンプルなTodoアプリ（React + FastAPI + SQLite3）。

## Features
- Todo一覧表示 / 追加 / 更新 / 削除
- ソート（id / due_date / title / assignee）
- シングルページ構成（画面遷移なし）

## Tech Stack
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Backend: Python + FastAPI + SQLAlchemy
- DB: SQLite3（ファイル永続化）
- Container: Docker / Docker Compose

## Directory Structure
```
.
├ frontend/
├ backend/
└ docker-compose.yml
```

## Requirements
- Docker Desktop もしくは Docker Engine

## Setup
```
docker compose up -d
```

## Usage
- Frontend: http://localhost:5173
- API (Swagger): http://localhost:8000/docs

## Environment Variables
- Frontend
  - `VITE_API_URL`: APIのベースURL（デフォルト: `http://localhost:8000`）

## Data Persistence
- SQLiteデータベースは `backend/data/todos.db` に保存されます。

## API
- GET    `/todos` (query: `sort`, `order`)
- POST   `/todos`
- PUT    `/todos/{id}`
- DELETE `/todos/{id}`

## Development Notes
- 初回起動時はイメージが自動的にビルドされます。
- 依存関係を更新した場合は `docker compose up -d --build` を実行してください。

## License
- 未設定
