from sqlalchemy import Boolean, Column, Date, Integer, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Todo(Base):
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, index=True)
    due_date = Column(Date, nullable=False)
    title = Column(String(200), nullable=False)
    assignee = Column(String(100), nullable=False)
    completed = Column(Boolean, nullable=False, default=False, server_default="0")
