from datetime import date
from pydantic import BaseModel, Field


class TodoBase(BaseModel):
    due_date: date = Field(..., description="YYYY-MM-DD")
    title: str
    assignee: str
    completed: bool = False
    favorite: bool = False


class TodoCreate(TodoBase):
    pass


class TodoUpdate(TodoBase):
    pass


class TodoOut(TodoBase):
    id: int

    class Config:
        from_attributes = True
