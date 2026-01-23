from datetime import date, timedelta
from random import randint, seed

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import asc, desc, inspect, select, text
from sqlalchemy.orm import Session

from .database import SessionLocal, engine
from .models import Base, Todo
from .schemas import TodoCreate, TodoOut, TodoUpdate

Base.metadata.create_all(bind=engine)


def ensure_completed_column():
    inspector = inspect(engine)
    columns = {col["name"] for col in inspector.get_columns("todos")}
    if "completed" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE todos ADD COLUMN completed BOOLEAN DEFAULT 0"))


ensure_completed_column()


def ensure_favorite_column():
    inspector = inspect(engine)
    columns = {col["name"] for col in inspector.get_columns("todos")}
    if "favorite" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE todos ADD COLUMN favorite BOOLEAN DEFAULT 0"))


ensure_favorite_column()


def seed_todos():
    seed(42)
    with SessionLocal() as db:
        existing = db.scalar(select(Todo).limit(1))
        if existing:
            return
        assignees = ["Tanaka", "Sato", "Suzuki", "Yamada", "Kato"]
        titles = [
            "仕様書レビュー",
            "UI調整",
            "API実装",
            "バグ修正",
            "テスト追加",
            "ドキュメント更新",
        ]
        base = date.today()
        todos = []
        for i in range(100):
            todos.append(
                Todo(
                    due_date=base + timedelta(days=randint(-10, 30)),
                    title=f"{titles[i % len(titles)]} #{i + 1}",
                    assignee=assignees[i % len(assignees)],
                    completed=False,
                    favorite=False,
                )
            )
        db.add_all(todos)
        db.commit()


seed_todos()

app = FastAPI(title="Todo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def build_order_clause(sort: str, order: str):
    column_map = {
        "id": Todo.id,
        "due_date": Todo.due_date,
        "title": Todo.title,
        "assignee": Todo.assignee,
    }
    if sort not in column_map:
        raise HTTPException(status_code=400, detail="Invalid sort field")
    if order == "asc":
        return asc(column_map[sort])
    if order == "desc":
        return desc(column_map[sort])
    raise HTTPException(status_code=400, detail="Invalid order")


@app.get("/todos", response_model=list[TodoOut])
def list_todos(
    sort: str = Query("due_date"),
    order: str = Query("asc"),
    assignee: str | None = Query(None),
    db: Session = Depends(get_db),
):
    order_clause = build_order_clause(sort, order)
    stmt = select(Todo).order_by(asc(Todo.completed), order_clause)
    if assignee:
        stmt = stmt.where(Todo.assignee.contains(assignee))
    return db.scalars(stmt).all()


@app.post("/todos", response_model=TodoOut)
def create_todo(payload: TodoCreate, db: Session = Depends(get_db)):
    todo = Todo(**payload.model_dump())
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


@app.put("/todos/{todo_id}", response_model=TodoOut)
def update_todo(todo_id: int, payload: TodoUpdate, db: Session = Depends(get_db)):
    todo = db.get(Todo, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    for key, value in payload.model_dump().items():
        setattr(todo, key, value)
    db.commit()
    db.refresh(todo)
    return todo


@app.delete("/todos/{todo_id}")
def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    todo = db.get(Todo, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    db.delete(todo)
    db.commit()
    return {"ok": True}
