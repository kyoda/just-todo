# シンプルタスク管理

チーム向けのシンプルなタスク管理アプリ（React + FastAPI + SQLite3）。

## Features
- Todo一覧表示 / 追加 / 更新 / 削除
- ソート（id / due_date / title / assignee）
- 担当者名でのフィルタ
- 完了/完了取消（完了済みは一覧の最後に表示）
- スクロールで自動表示（簡易インフィニットスクロール）
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
- 依存関係やDockerfileを変更した場合は `docker compose build` を実行してください。
- 初回起動時、DBが空ならダミーデータ100件が自動で投入されます。

## License
- 未設定
