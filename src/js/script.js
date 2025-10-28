// script.js - VERSÃO COMPLETA CORRIGIDA
const API_BASE_URL = (function() {
    // Se estiver no GitHub Pages (produção)
    if (window.location.hostname.includes('github.io')) {
        return ''; // Front-end só, sem back-end
    }
    // Se estiver em localhost (desenvolvimento)
    return 'http://localhost:8000';
})();

// Variáveis globais
let tasks = [];
let currentFilter = 'all';
let useLocalStorage = false;

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 TaskFlow Frontend inicializado!');
    
    // Verifica se o backend está disponível
    const backendOnline = await checkBackendStatus();
    useLocalStorage = !backendOnline;
    
    if (useLocalStorage) {
        showMobileMessage();
    }
    
    await fetchTasks();
});

// Função para verificar status do backend
async function checkBackendStatus() {
    if (!API_BASE_URL) return false;
    
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET'
        });
        return response.ok;
    } catch (error) {
        console.log('🔴 Backend offline - usando modo local');
        return false;
    }
}

// Mostra mensagem de modo offline
function showMobileMessage() {
    const mobileMessage = document.getElementById('mobileMessage');
    if (mobileMessage) {
        mobileMessage.style.display = 'block';
    }
}

// SISTEMA COMPLETO DE FALLBACK - FUNÇÕES CORRIGIDAS
async function fetchTasks() {
    console.log('📥 Buscando tarefas...');
    
    // Tenta o back-end primeiro (apenas se não estiver forçado para localStorage)
    if (API_BASE_URL && !useLocalStorage) {
        try {
            console.log('🌐 Tentando conectar com backend...');
            const response = await fetch(`${API_BASE_URL}/tasks`);
            
            if (response.ok) {
                const apiTasks = await response.json();
                console.log('✅ Backend online, tarefas carregadas:', apiTasks.length);
                
                tasks = apiTasks;
                // Sincroniza com localStorage como backup
                localStorage.setItem('tasks', JSON.stringify(tasks));
                renderTasks();
                updateStats();
                return;
            }
        } catch (error) {
            console.log('🔄 Caiu para localStorage - Backend offline');
            useLocalStorage = true;
            showMobileMessage();
        }
    }
    
    // Fallback para localStorage
    console.log('💾 Usando localStorage...');
    const storedTasks = localStorage.getItem('tasks');
    tasks = storedTasks ? JSON.parse(storedTasks) : [];
    
    console.log('📋 Tarefas carregadas do localStorage:', tasks);
    renderTasks();
    updateStats();
}

// FUNÇÃO ADD TASK CORRIGIDA
async function addTask() {
    const taskInput = document.getElementById('taskInput');
    const text = taskInput.value.trim();

    if (!text) {
        showNotification('📝 Digite uma tarefa!', 'error');
        return;
    }

    try {
        console.log('📤 Adicionando tarefa:', text);
        
        const newTask = {
            text: text,
            completed: false,
            created_at: new Date().toISOString()
        };

        // Se backend disponível, tenta salvar lá
        if (API_BASE_URL && !useLocalStorage) {
            try {
                const response = await fetch(`${API_BASE_URL}/tasks`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(newTask)
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Tarefa salva no backend:', result);
                    
                    taskInput.value = '';
                    await fetchTasks(); // Recarrega as tarefas
                    showNotification('✅ Tarefa adicionada!', 'success');
                    return;
                }
            } catch (error) {
                console.log('🔄 Caiu para localStorage na criação');
                useLocalStorage = true;
                showMobileMessage();
            }
        }

        // SALVAMENTO NO LOCALSTORAGE (FUNCIONA SEMPRE)
        console.log('💾 Salvando no localStorage...');
        
        // Gera um ID temporário
        newTask.id = Date.now(); // ID baseado no timestamp
        tasks.unshift(newTask); // Adiciona no início do array
        
        // Salva no localStorage
        localStorage.setItem('tasks', JSON.stringify(tasks));
        
        console.log('✅ Tarefa salva no localStorage:', newTask);
        
        // Atualiza a interface
        taskInput.value = '';
        renderTasks();
        updateStats();
        showNotification('✅ Tarefa adicionada!', 'success');
        
    } catch (error) {
        console.error('💥 Erro ao adicionar tarefa:', error);
        showNotification('❌ Erro ao adicionar tarefa', 'error');
    }
}

// FUNÇÃO TOGGLE TASK CORRIGIDA
async function toggleTask(id) {
    try {
        console.log('🔘 Alternando tarefa:', id);
        
        // Encontra a tarefa
        const taskIndex = tasks.findIndex(task => task.id === id);
        if (taskIndex === -1) {
            console.error('❌ Tarefa não encontrada:', id);
            return;
        }
        
        // Alterna o status
        tasks[taskIndex].completed = !tasks[taskIndex].completed;
        console.log(`🔄 Tarefa ${id} alterada para:`, tasks[taskIndex].completed);
        
        // Tenta atualizar no backend
        if (API_BASE_URL && !useLocalStorage) {
            try {
                const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        completed: tasks[taskIndex].completed
                    })
                });

                if (response.ok) {
                    console.log('✅ Tarefa atualizada no backend');
                    // Sincroniza localStorage
                    localStorage.setItem('tasks', JSON.stringify(tasks));
                    renderTasks();
                    updateStats();
                    return;
                }
            } catch (error) {
                console.log('🔄 Caiu para localStorage no toggle');
                useLocalStorage = true;
                showMobileMessage();
            }
        }
        
        // ATUALIZA NO LOCALSTORAGE
        localStorage.setItem('tasks', JSON.stringify(tasks));
        renderTasks();
        updateStats();
        showNotification('✅ Tarefa atualizada!', 'success');
        
    } catch (error) {
        console.error('💥 Erro completo no toggle:', error);
        showNotification('❌ Erro ao atualizar tarefa', 'error');
    }
}

// FUNÇÃO DELETE TASK CORRIGIDA
async function deleteTask(id) {
    const taskElement = document.querySelector(`.delete-btn[onclick="deleteTask(${id})"]`)?.parentElement;
    
    if (taskElement) {
        taskElement.style.animation = 'shake 0.5s ease-in-out';
    }
    
    setTimeout(async () => {
        if (confirm('Tem certeza que quer deletar esta tarefa?')) {
            try {
                // Efeito visual
                if (taskElement) {
                    taskElement.style.transition = 'all 0.3s ease';
                    taskElement.style.opacity = '0';
                    taskElement.style.transform = 'translateX(-100%)';
                }
                
                // Tenta deletar no backend
                if (API_BASE_URL && !useLocalStorage) {
                    try {
                        const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
                            method: 'DELETE'
                        });

                        if (response.ok) {
                            console.log('✅ Tarefa deletada do backend');
                            await fetchTasks();
                            showNotification('🗑️ Tarefa deletada!', 'success');
                            return;
                        }
                    } catch (error) {
                        console.log('🔄 Caiu para localStorage no delete');
                        useLocalStorage = true;
                        showMobileMessage();
                    }
                }
                
                // DELETA DO LOCALSTORAGE
                tasks = tasks.filter(task => task.id !== id);
                localStorage.setItem('tasks', JSON.stringify(tasks));
                
                renderTasks();
                updateStats();
                showNotification('🗑️ Tarefa deletada!', 'success');
                
            } catch (error) {
                console.error('Erro:', error);
                showNotification('❌ Erro ao deletar tarefa', 'error');
            }
        }
    }, 500);
}

// FUNÇÃO CLEAR COMPLETED CORRIGIDA
async function clearCompleted() {
    const completedTasks = tasks.filter(task => task.completed);
    
    if (completedTasks.length === 0) {
        showNotification('🎉 Não há tarefas concluídas para limpar!', 'info');
        return;
    }
    
    if (confirm(`🗑️ Tem certeza que quer remover ${completedTasks.length} tarefa(s) concluída(s)?`)) {
        try {
            // Efeito visual
            const completedElements = document.querySelectorAll('.task-item.completed');
            completedElements.forEach(element => {
                element.style.transition = 'all 0.4s ease';
                element.style.opacity = '0';
                element.style.transform = 'translateX(100%) rotate(10deg)';
            });
            
            setTimeout(async () => {
                // Tenta limpar no backend
                if (API_BASE_URL && !useLocalStorage) {
                    try {
                        // Para cada tarefa concluída, faz DELETE individual
                        for (const task of completedTasks) {
                            await fetch(`${API_BASE_URL}/tasks/${task.id}`, {
                                method: 'DELETE'
                            });
                        }
                        console.log('✅ Tarefas concluídas removidas do backend');
                        await fetchTasks();
                        showNotification(`🗑️ ${completedTasks.length} tarefas removidas!`, 'success');
                        return;
                    } catch (error) {
                        console.log('🔄 Caiu para localStorage no clear');
                        useLocalStorage = true;
                        showMobileMessage();
                    }
                }
                
                // LIMPA DO LOCALSTORAGE
                tasks = tasks.filter(task => !task.completed);
                localStorage.setItem('tasks', JSON.stringify(tasks));
                
                renderTasks();
                updateStats();
                showNotification(`🗑️ ${completedTasks.length} tarefas removidas!`, 'success');
                
            }, 400);
            
        } catch (error) {
            console.error('💥 Erro ao limpar tarefas:', error);
            showNotification('❌ Erro ao limpar tarefas concluídas', 'error');
        }
    }
}

// FUNÇÕES DE RENDERIZAÇÃO
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

// SISTEMA DE NOTIFICAÇÕES
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

// Função para forçar modo localStorage (útil para testes)
function forceLocalStorageMode() {
    useLocalStorage = true;
    showMobileMessage();
    fetchTasks();
    showNotification('🔧 Modo localStorage ativado!', 'info');
}

// Função para tentar reconectar com o backend
async function tryReconnectBackend() {
    const wasOnline = !useLocalStorage;
    useLocalStorage = false;
    
    const backendOnline = await checkBackendStatus();
    if (backendOnline) {
        showNotification('🌐 Conectado com o backend!', 'success');
        document.getElementById('mobileMessage').style.display = 'none';
        await fetchTasks();
    } else {
        useLocalStorage = true;
        showNotification('🔴 Backend ainda offline', 'error');
    }
}

console.log('🎮 TaskFlow JavaScript carregado!');
console.log('📡 API Base URL:', API_BASE_URL || 'Nenhuma (modo estático)');