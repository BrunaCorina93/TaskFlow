const API_BASE_URL = (function() {
    // Se estiver no GitHub Pages (produção)
    if (window.location.hostname.includes('github.io')) {
        return ''; // Front-end só, sem back-end por enquanto
    }
    // Se estiver em localhost (desenvolvimento)
    return 'http://localhost:8000';
})();

// Função para verificar se estamos online
async function checkBackendStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            timeout: 5000
        });
        return response.ok;
    } catch (error) {
        console.log('🔴 Backend offline - usando modo local');
        return false;
    }
}

// Sistema de fallback para quando o back-end não estiver disponível
let localTasks = JSON.parse(localStorage.getItem('tasks')) || [];
let useLocalStorage = false;
           async function fetchTasks() {
    // Tenta o back-end primeiro
    if (API_BASE_URL && !useLocalStorage) {
        try {
            const response = await fetch(`${API_BASE_URL}/tasks`);
            if (response.ok) {
                tasks = await response.json();
                // Sincroniza com localStorage como backup
                localStorage.setItem('tasks', JSON.stringify(tasks));
                renderTasks();
                updateStats();
                return;
            }
        } catch (error) {
            console.log('🔄 Caiu para localStorage');
            useLocalStorage = true;
        }
    }
    
    // Fallback para localStorage
    tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    renderTasks();
    updateStats();
}
async function toggleTask(id) {
    try {
        console.log('🔘 Toggle task:', id);
        
        // Encontra a tarefa atual
        const task = tasks.find(task => task.id === id);
        if (!task) {
            console.error('❌ Tarefa não encontrada:', id);
            return;
        }
        
        const newCompletedStatus = !task.completed;
        console.log(`🔄 Alterando tarefa ${id} de ${task.completed} para ${newCompletedStatus}`);
        
        // Envia para a API
        const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                completed: newCompletedStatus
            })
        });

        console.log('📥 Resposta do toggle:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro ao atualizar tarefa:', errorText);
            throw new Error(`Erro ${response.status}`);
        }
        
        const updatedTask = await response.json();
        console.log('✅ Tarefa atualizada:', updatedTask);
        
        // Atualiza a lista local
        await fetchTasks();
        showNotification('✅ Tarefa atualizada!', 'success');
        
    } catch (error) {
        console.error('💥 Erro completo no toggle:', error);
        showNotification('❌ Erro ao atualizar tarefa', 'error');
    }
}

async function deleteTask(id) {
    const taskElement = document.querySelector(`.delete-btn[onclick="deleteTask(${id})"]`)?.parentElement;
    
    if (taskElement) {
        taskElement.style.animation = 'shake 0.5s ease-in-out';
    }
    
    setTimeout(async () => {
        if (confirm('Tem certeza que quer deletar esta tarefa?')) {
            try {
                if (taskElement) {
                    taskElement.style.transition = 'all 0.3s ease';
                    taskElement.style.opacity = '0';
                    taskElement.style.transform = 'translateX(-100%)';
                }
                
                const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) throw new Error('Erro ao deletar tarefa');
                
                await fetchTasks(); // Recarrega as tarefas
                showNotification('🗑️ Tarefa deletada!', 'success');
                
            } catch (error) {
                console.error('Erro:', error);
                showNotification('❌ Erro ao deletar tarefa', 'error');
            }
        }
    }, 500);
}

async function clearCompleted() {
    const completedTasks = tasks.filter(task => task.completed);
    
    if (completedTasks.length === 0) {
        showNotification('🎉 Não há tarefas concluídas para limpar!', 'info');
        return;
    }
    
    if (confirm(`🗑️ Tem certeza que quer remover ${completedTasks.length} tarefa(s) concluída(s)?`)) {
        try {
            // Efeito visual nas tarefas concluídas
            const completedElements = document.querySelectorAll('.task-item.completed');
            completedElements.forEach(element => {
                element.style.transition = 'all 0.4s ease';
                element.style.opacity = '0';
                element.style.transform = 'translateX(100%) rotate(10deg)';
            });
            
            setTimeout(async () => {
                console.log('🗑️ Enviando requisição para limpar tarefas concluídas...');
                
                // CORREÇÃO: Use a nova URL
                const response = await fetch(`${API_BASE_URL}/tasks/clear/completed`, {
                    method: 'DELETE'
                });

                console.log('📥 Resposta do clear:', response.status);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Erro ao limpar tarefas:', errorText);
                    throw new Error(`Erro ${response.status}`);
                }
                
                const result = await response.json();
                console.log('✅ Tarefas limpas com sucesso:', result);
                
                await fetchTasks(); // Recarrega as tarefas
                showNotification(`🗑️ ${result.message}`, 'success');
                
            }, 400);
            
        } catch (error) {
            console.error('💥 Erro completo ao limpar tarefas:', error);
            showNotification('❌ Erro ao limpar tarefas concluídas', 'error');
        }
    }
}
// Funções de renderização (mantemos as mesmas)
function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    const filteredTasks = filterTasksByStatus(currentFilter);

    // Limpa a lista de forma mais suave
    tasksList.style.opacity = '0.7';
    tasksList.style.transition = 'opacity 0.2s ease';
    
    setTimeout(() => {
        tasksList.innerHTML = '';
        
        if (filteredTasks && Array.isArray(filteredTasks)) {
            if (filteredTasks.length === 0) {
                const emptyMessage = document.createElement('div');
                emptyMessage.className = 'empty-state';
                
                let message = '';
                if (currentFilter === 'pending') {
                    message = '🎉 Todas as tarefas concluídas!';
                } else if (currentFilter === 'completed') {
                    message = '📝 Nenhuma tarefa concluída ainda';
                } else {
                    message = '➕ Adicione sua primeira tarefa!';
                }
                
                emptyMessage.innerHTML = `<h3>${message}</h3>`;
                tasksList.appendChild(emptyMessage);
            } else {
                filteredTasks.forEach((task, index) => {
                    const taskElement = document.createElement('div');
                    taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
                    
                    // Pequeno delay para animação em cascata
                    taskElement.style.animationDelay = `${index * 0.05}s`;
                    
                    taskElement.innerHTML = `
                        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
                               onchange="toggleTask(${task.id})">
                        <span class="task-text">${task.text}</span>
                        <button class="delete-btn" onclick="deleteTask(${task.id})">🗑️</button>
                    `;
                    tasksList.appendChild(taskElement);
                });
            }
        }
        
        // Restaura a opacidade
        setTimeout(() => {
            tasksList.style.opacity = '1';
        }, 50);
        
    }, 200);
}
function filterTasks(filter) {
    currentFilter = filter;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.transform = 'scale(1)';
    });
    
    event.target.classList.add('active');
    event.target.style.transform = 'scale(1.05)';
    
    const tasksList = document.getElementById('tasksList');
    tasksList.style.opacity = '0.7';
    tasksList.style.transition = 'opacity 0.3s ease';
    
    setTimeout(() => {
        renderTasks();
        tasksList.style.opacity = '1';
    }, 200);
}

function filterTasksByStatus(filter) {
    if (!tasks || !Array.isArray(tasks)) {
        return [];
    }
    
    switch(filter) {
        case 'pending':
            return tasks.filter(task => !task.completed);
        case 'completed':
            return tasks.filter(task => task.completed);
        default:
            return tasks;
    }
}

function updateStats() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    
    const statsElement = document.getElementById('taskCount');
    
    statsElement.style.transform = 'scale(1.05)';
    statsElement.style.transition = 'transform 0.2s ease';
    
    setTimeout(() => {
        statsElement.style.transform = 'scale(1)';
    }, 200);
    
    let message = '';
    
    if (totalTasks === 0) {
        message = '🎯 Nenhuma tarefa ainda';
    } else if (completedTasks === totalTasks) {
        message = '🚀 Todas as tarefas concluídas!';
    } else if (pendingTasks === 1) {
        message = '📋 1 tarefa pendente';
    } else {
        message = `📋 ${pendingTasks} pendentes • ✅ ${completedTasks} concluídas • 📊 ${totalTasks} total`;
    }
    
    statsElement.textContent = message;
}

// Sistema de notificações
function showNotification(message, type = 'info') {
    // Remove notificação anterior se existir
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 50px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 0 20px currentColor;
    `;
    
    if (type === 'success') {
        notification.style.background = 'linear-gradient(45deg, #00ff80, #00ffff)';
    } else if (type === 'error') {
        notification.style.background = 'linear-gradient(45deg, #ff0080, #ff00ff)';
    } else {
        notification.style.background = 'linear-gradient(45deg, #0080ff, #8000ff)';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Adiciona os keyframes CSS dinamicamente
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Event listeners
document.getElementById('taskInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addTask();
    }
});

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 TaskFlow Frontend inicializado!');
    fetchTasks();
}); 

async function addTask() {
    const taskInput = document.getElementById('taskInput');
    const text = taskInput.value.trim();

    if (text) {
        try {
            console.log('📤 Enviando tarefa para API...', text);
            
            const response = await fetch(`${API_BASE_URL}/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    completed: false
                })
            });

            console.log('📥 Resposta da API:', response);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erro detalhado:', errorText);
                throw new Error(`Erro ${response.status}: ${errorText}`);
            }
            
            const result = await response.json();
            console.log('✅ Tarefa criada:', result);
            
            taskInput.value = '';
            await fetchTasks();
            showNotification('✅ Tarefa adicionada!', 'success');
            
        } catch (error) {
            console.error('💥 Erro completo:', error);
            showNotification('❌ Erro ao adicionar tarefa: ' + error.message, 'error');
        }
    }
}