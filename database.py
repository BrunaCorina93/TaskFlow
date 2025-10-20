import sqlite3
from typing import List, Optional
from models import Task  # Importe apenas Task
from datetime import datetime
from models import Task, TaskUpdate

# Configuração do banco de dados
DATABASE_URL = "taskflow.db"

def get_connection():
    return sqlite3.connect(DATABASE_URL)

def init_database():
    """Inicializa o banco de dados com a tabela de tarefas"""
    conn = get_connection()
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
    print("✅ Banco de dados inicializado!")

def get_all_tasks() -> List[Task]:
    """Busca todas as tarefas"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM tasks ORDER BY created_at DESC')
    rows = cursor.fetchall()
    
    tasks = []
    for row in rows:
        task = Task(
            id=row[0],
            text=row[1],
            completed=bool(row[2]),
            created_at=datetime.fromisoformat(row[3])
        )
        tasks.append(task)
    
    conn.close()
    return tasks

def get_task(task_id: int) -> Optional[Task]:
    """Busca uma tarefa específica"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
    row = cursor.fetchone()
    
    conn.close()
    
    if row:
        return Task(
            id=row[0],
            text=row[1],
            completed=bool(row[2]),
            created_at=datetime.fromisoformat(row[3])
        )
    return None

def create_task(task: Task) -> Task:  # Use Task diretamente
    """Cria uma nova tarefa"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        'INSERT INTO tasks (text, completed) VALUES (?, ?)',
        (task.text, task.completed)
    )
    
    task_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Retorna a tarefa criada com ID
    return get_task(task_id)

def update_task(task_id: int, task_update: TaskUpdate) -> Optional[Task]:
    """Atualiza uma tarefa - versão com campos opcionais"""
    conn = get_connection()
    cursor = conn.cursor()
    
    print(f"🗃️ Atualizando tarefa {task_id} com:", task_update.dict())
    
    # Busca a tarefa atual primeiro
    current_task = get_task(task_id)
    if not current_task:
        return None
    
    # Aplica apenas os campos que foram fornecidos
    new_text = task_update.text if task_update.text is not None else current_task.text
    new_completed = task_update.completed if task_update.completed is not None else current_task.completed
    
    print(f"   Texto atual: {current_task.text} -> Novo: {new_text}")
    print(f"   Completed atual: {current_task.completed} -> Novo: {new_completed}")
    
    cursor.execute(
        'UPDATE tasks SET text = ?, completed = ? WHERE id = ?',
        (new_text, new_completed, task_id)
    )
    
    conn.commit()
    conn.close()
    
    print(f"✅ Tarefa {task_id} atualizada com sucesso")
    return get_task(task_id)

def delete_task(task_id: int) -> bool:
    """Deleta uma tarefa"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    
    return deleted

def clear_completed_tasks() -> int:
    """Remove todas as tarefas concluídas"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM tasks WHERE completed = 1')
    deleted_count = cursor.rowcount
    conn.commit()
    conn.close()
    
    return deleted_count