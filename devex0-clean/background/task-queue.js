/**
 * Task Queue Engine
 * Manages task scheduling, execution, and coordination
 */

export class TaskQueue {
  constructor() {
    this.tasks = new Map();
    this.priorityQueue = {
      high: [],
      medium: [],
      low: []
    };
    this.runningTasks = new Set();
    this.maxConcurrentTasks = 5;
    this.isInitialized = false;
  }

  async init() {
    try {
      // Load persistent tasks from storage
      await this.loadTasksFromStorage();
      
      // Resume any interrupted tasks
      await this.resumeInterruptedTasks();
      
      this.isInitialized = true;
      console.log('[TaskQueue] Initialized with', this.tasks.size, 'tasks');
    } catch (error) {
      console.error('[TaskQueue] Initialization failed:', error);
      throw error;
    }
  }

  async loadTasksFromStorage() {
    try {
      const stored = await chrome.storage.local.get(['taskQueue']);
      
      if (stored.taskQueue) {
        for (const taskData of stored.taskQueue) {
          this.tasks.set(taskData.id, taskData);
          
          // Add to priority queue if pending
          if (taskData.status === 'pending') {
            this.priorityQueue[taskData.priority].push(taskData.id);
          }
        }
      }
    } catch (error) {
      console.warn('[TaskQueue] Failed to load tasks from storage:', error);
    }
  }

  async saveTasksToStorage() {
    try {
      const tasksArray = Array.from(this.tasks.values());
      await chrome.storage.local.set({ taskQueue: tasksArray });
    } catch (error) {
      console.error('[TaskQueue] Failed to save tasks to storage:', error);
    }
  }

  async addTask(taskData) {
    const taskId = taskData.id || this.generateTaskId();
    const priority = taskData.priority || 'medium';
    
    const task = {
      id: taskId,
      type: taskData.type,
      domain: taskData.domain,
      url: taskData.url,
      schema: taskData.schema,
      options: taskData.options || {},
      priority,
      status: 'pending',
      createdAt: Date.now(),
      retry: taskData.retry || 3,
      retryCount: 0,
      assignedAgent: null,
      result: null,
      error: null
    };

    this.tasks.set(taskId, task);
    this.priorityQueue[priority].push(taskId);
    
    await this.saveTasksToStorage();
    
    console.log(`[TaskQueue] Added task ${taskId} with priority ${priority}`);
    return task;
  }

  async updateTask(taskId, updates) {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    Object.assign(task, updates);
    await this.saveTasksToStorage();
    
    return task;
  }

  async getTask(taskId) {
    return this.tasks.get(taskId);
  }

  async cancelTask(taskId) {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = 'cancelled';
    task.cancelledAt = Date.now();
    
    // Remove from priority queue
    this.removeFromPriorityQueue(taskId, task.priority);
    
    // Remove from running tasks
    this.runningTasks.delete(taskId);
    
    await this.saveTasksToStorage();
    
    console.log(`[TaskQueue] Cancelled task ${taskId}`);
    return task;
  }

  async updateTaskProgress(taskId, progress) {
    const task = this.tasks.get(taskId);
    
    if (task) {
      task.progress = progress;
      task.lastUpdate = Date.now();
      await this.saveTasksToStorage();
    }
  }

  getNextTask() {
    // Check high priority first, then medium, then low
    for (const priority of ['high', 'medium', 'low']) {
      const queue = this.priorityQueue[priority];
      
      if (queue.length > 0) {
        const taskId = queue.shift();
        const task = this.tasks.get(taskId);
        
        if (task && task.status === 'pending') {
          return task;
        }
      }
    }
    
    return null;
  }

  async resumeInterruptedTasks() {
    const interruptedTasks = Array.from(this.tasks.values()).filter(
      task => task.status === 'running' || task.status === 'assigned'
    );

    for (const task of interruptedTasks) {
      task.status = 'pending';
      this.priorityQueue[task.priority].push(task.id);
      console.log(`[TaskQueue] Resumed interrupted task ${task.id}`);
    }

    if (interruptedTasks.length > 0) {
      await this.saveTasksToStorage();
    }
  }

  removeFromPriorityQueue(taskId, priority) {
    const queue = this.priorityQueue[priority];
    const index = queue.indexOf(taskId);
    
    if (index > -1) {
      queue.splice(index, 1);
    }
  }

  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    const stats = {
      total: this.tasks.size,
      pending: 0,
      running: this.runningTasks.size,
      completed: 0,
      failed: 0,
      cancelled: 0,
      byPriority: {
        high: this.priorityQueue.high.length,
        medium: this.priorityQueue.medium.length,
        low: this.priorityQueue.low.length
      },
      byDomain: {}
    };

    for (const task of this.tasks.values()) {
      stats[task.status]++;
      
      if (!stats.byDomain[task.domain]) {
        stats.byDomain[task.domain] = 0;
      }
      stats.byDomain[task.domain]++;
    }

    return stats;
  }

  async clearCompletedTasks() {
    const completed = Array.from(this.tasks.values()).filter(
      task => task.status === 'completed' || task.status === 'failed'
    );

    for (const task of completed) {
      this.tasks.delete(task.id);
    }

    await this.saveTasksToStorage();
    
    console.log(`[TaskQueue] Cleared ${completed.length} completed tasks`);
    return completed.length;
  }
}