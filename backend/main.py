from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import database as db
from models import Task 
from models import Task, TaskUpdate # Importe apenas Task

app = FastAPI(
    title="TaskFlow API",
    description="API para o Gerenciador de Tarefas Gamer",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db.init_database()

@app.get("/")
async def root():
    return {"message": "🎮 TaskFlow API - Gerenciador Gamer de Tarefas!"}

@app.get("/tasks", response_model=List[Task])
async def get_tasks():
    """Busca todas as tarefas"""
    return db.get_all_tasks()

@app.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: int):
    """Busca uma tarefa específica"""
    task = db.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    return task

@app.post("/tasks", response_model=Task)
async def create_task(task: Task):  # Use Task diretamente
    """Cria uma nova tarefa"""
    return db.create_task(task)

@app.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: int, task_update: TaskUpdate):  # Use TaskUpdate aqui
    """Atualiza uma tarefa"""
    print(f"🔄 Atualizando tarefa {task_id} com:", task_update.dict())
    updated_task = db.update_task(task_id, task_update)
    if updated_task is None:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    return updated_task
@app.delete("/tasks/{task_id}")
async def delete_task(task_id: int):
    """Deleta uma tarefa"""
    success = db.delete_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    return {"message": "Tarefa deletada com sucesso!"}

@app.delete("/tasks/clear/completed")  # Mude a URL para evitar conflito
async def clear_completed_tasks():
    """Limpa todas as tarefas concluídas"""
    deleted_count = db.clear_completed_tasks()
    return {"message": f"{deleted_count} tarefas concluídas removidas", "deleted_count": deleted_count}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "🚀 API TaskFlow rodando!"}