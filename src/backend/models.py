from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Task(BaseModel):
    id: Optional[int] = None
    text: str
    completed: bool = False
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True 
        
class TaskUpdate(BaseModel):
    text: Optional[str] = None
    completed: Optional[bool] = None