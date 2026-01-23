# just-todo

本プロジェクトはVibe Codingのスタイルで作成しました。

## 概要
A minimal team Todo app with just the essentials.

## 特長
- Todo一覧表示 / 追加 / 更新 / 削除
- ソート（due_date / title / assignee）+ 並び順保存
- 担当者名でのフィルタ（入力・選択）
- 完了/完了取消（完了済みは一覧の最後に表示、表示切替あり）
- スクロールで自動表示（簡易インフィニットスクロール）
- カレンダーで期日選択（日曜/祝日=赤、土曜=青）
- ダブルクリックでインライン編集（blurで保存）
- お気に入りのTODO名（担当者ごとに管理、★で登録/解除、追加/編集時に選択可）
- シングルページ構成（画面遷移なし）

## 技術構成
- Frontend: React + Vite + TypeScript + Tailwind CSS + React Day Picker
- Backend: Python + FastAPI + SQLAlchemy
- DB: SQLite3（ファイル永続化）
- Container: Docker / Docker Compose

## ディレクトリ構成
```
.
├ frontend/
├ backend/
└ docker-compose.yml
```

## 必要要件
- Docker Desktop もしくは Docker Engine

## セットアップ
```
docker compose up -d
```

## 使い方
- Frontend: http://localhost:5173
- API (Swagger): http://localhost:8000/docs

## 環境変数
- Frontend
  - `VITE_API_URL`: APIのベースURL（デフォルト: `http://localhost:8000`）

## データ保存
- SQLiteデータベースは `backend/data/todos.db` に保存されます。
- DBに保存されるデータ: Todo（id / due_date / title / assignee / completed / favorite）

## ローカルストレージ
- ブラウザ側に保存されるデータ: フィルタ条件 / 並び順 / 完了表示

## 祝日データ
- 日本の祝日データは `holidays-jp` 公開APIを参照します。

## API
- GET    `/todos` (query: `sort`, `order`, `assignee`)
- POST   `/todos`
- PUT    `/todos/{id}`
- DELETE `/todos/{id}`

## 開発メモ
- 初回起動時はイメージが自動的にビルドされます。
- 依存関係やDockerfileを変更した場合は `docker compose build` を実行してください。
- 初回起動時、DBが空ならダミーデータ100件が自動で投入されます。

## ライセンス
MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
