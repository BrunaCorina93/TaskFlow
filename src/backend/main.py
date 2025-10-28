from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
from datetime import datetime

app = FastAPI(title="TaskFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelo compatível com Pydantic 1.x
class Task(BaseModel):
    id: Optional[int] = None
    text: str
    completed: bool = False
    created_at: Optional[datetime] = None

# Database
def init_database():
    conn = sqlite3.connect('taskflow.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            completed BOOLEAN NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_database()

def get_all_tasks() -> List[Task]:
    conn = sqlite3.connect('taskflow.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tasks ORDER BY created_at DESC')
    rows = cursor.fetchall()
    conn.close()
    
    tasks = []
    for row in rows:
        tasks.append(Task(
            id=row[0],
            text=row[1],
            completed=bool(row[2]),
            created_at=datetime.fromisoformat(row[3]) if row[3] else None
        ))
    return tasks

@app.get("/")
async def root():
    return {"message": "🎮 TaskFlow API"}

@app.get("/tasks")
async def get_tasks():
    return get_all_tasks()

@app.post("/tasks")
async def create_task(task: Task):
    conn = sqlite3.connect('taskflow.db')
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO tasks (text, completed) VALUES (?, ?)',
        (task.text, task.completed)
    )
    task_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Return created task
    conn = sqlite3.connect('taskflow.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
    row = cursor.fetchone()
    conn.close()
    
    return Task(
        id=row[0],
        text=row[1],
        completed=bool(row[2]),
        created_at=datetime.fromisoformat(row[3]) if row[3] else None
    )

@app.put("/tasks/{task_id}")
async def update_task(task_id: int, task: Task):
    conn = sqlite3.connect('taskflow.db')
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE tasks SET text = ?, completed = ? WHERE id = ?',
        (task.text, task.completed, task_id)
    )
    conn.commit()
    conn.close()
    
    # Return updated task
    conn = sqlite3.connect('taskflow.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return Task(
        id=row[0],
        text=row[1],
        completed=bool(row[2]),
        created_at=datetime.fromisoformat(row[3]) if row[3] else None
    )

@app.delete("/tasks/{task_id}")
async def delete_task(task_id: int):
    conn = sqlite3.connect('taskflow.db')
    cursor = conn.cursor()
    cursor.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}