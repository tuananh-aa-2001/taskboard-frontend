import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import TaskCard from './TaskCard';
import wsService from './WebSocketService';

const statusColumns = {
  TODO: { title: "📋 To Do", color: "border-yellow-500" },
  IN_PROGRESS: { title: "⚡ In Progress", color: "border-blue-500" },
  DONE: { title: "✅ Done", color: "border-green-500" },
};

const TaskBoard = ({ 
  currentBoardId,
  username,
  isConnected,
  onOpenComments,
  onNotification
}) => {
  const [tasks, setTasks] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    status: "TODO",
    assignedTo: "",
  });
  const ws = useRef(wsService);

  const loadTasks = useCallback(async (boardId) => {
    try {
      const response = await fetch(`http://localhost:8080/api/tasks/board/${boardId}`);
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }, []);

  const createTask = useCallback(() => {
    if (!currentBoardId) {
      alert('Please select a board first');
      return;
    }
    const task = { ...newTask, createdBy: username, boardId: currentBoardId };
    ws.current.send("/app/task.create", task);

    setNewTask({
      title: "",
      description: "",
      priority: "MEDIUM",
      status: "TODO",
      assignedTo: "",
    });
    setShowTaskForm(false);
  }, [currentBoardId, username, newTask]);

  const deleteTask = useCallback((taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      ws.current.send('/app/task.delete', task);
    }
  }, [tasks]);

  const handleDragStart = (task) => setDraggedTask(task);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = useCallback((newStatus) => {
    if (!draggedTask) return;

    const task = {
      id: draggedTask.id,
      status: newStatus,
      boardId: currentBoardId,
    };

    ws.current.send("/app/task.move", task);
    setDraggedTask(null);
  }, [draggedTask, currentBoardId]);

  const getTasksByStatus = (status) => {
    return tasks.filter((task) => task.status === status);
  };

  // Subscribe to task updates
  useEffect(() => {
    if (currentBoardId && isConnected) {
      ws.current.subscribe(`/topic/board/${currentBoardId}`, handleTaskMessage);
    }
  }, [currentBoardId, isConnected]);

  const handleTaskMessage = useCallback((message) => {
    switch (message.type) {
      case "TASK_CREATED":
        setTasks((prev) => {
          const filtered = prev.filter((t) => t.id !== message.task.id);
          return [...filtered, message.task];
        });
        if (
          message.task.assignedTo &&
          message.task.assignedTo.toLowerCase() === username.toLowerCase()
        ) {
          onNotification?.(
            `You've been assigned to: "${message.task.title}"`,
            "success"
          );
        } else if (message.task.createdBy !== username) {
          onNotification?.(
            `${message.task.createdBy} created: "${message.task.title}"`,
            "info"
          );
        }
        break;
      case "TASK_UPDATED":
        setTasks((prev) => {
          const filtered = prev.filter((t) => t.id !== message.task.id);
          return [...filtered, message.task];
        });
        if (
          message.task.assignedTo &&
          message.task.assignedTo.toLowerCase() === username.toLowerCase()
        ) {
          onNotification?.(
            `You've been assigned to: "${message.task.title}"`,
            "success"
          );
        }
        break;
      case "TASK_MOVED":
        setTasks((prev) => {
          const filtered = prev.filter((t) => t.id !== message.task.id);
          return [...filtered, message.task];
        });

        if (
          message.task.assignedTo &&
          message.task.assignedTo.toLowerCase() === username.toLowerCase()
        ) {
          const statusName =
            statusColumns[message.task.status]?.title || message.task.status;
          onNotification?.(
            `Your task "${message.task.title}" moved to ${statusName}`,
            "info"
          );
        }
        break;
      case "TASK_DELETED":
        setTasks((prev) => prev.filter((t) => t.id !== message.task.id));
        if (
          message.task.assignedTo &&
          message.task.assignedTo.toLowerCase() === username.toLowerCase()
        ) {
          onNotification?.(
            `Task "${message.task.title}" was deleted`,
            "warning"
          );
        }
        break;
      default:
        break;
    }
  }, [username, onNotification]);

  // Load tasks when board changes
  useEffect(() => {
    if (currentBoardId && isConnected) {
      loadTasks(currentBoardId);
    }
  }, [currentBoardId, isConnected, loadTasks]);

  if (!isConnected || !currentBoardId) return null;

  return (
    <>
      <div className="mb-4">
        <button 
          onClick={() => setShowTaskForm(!showTaskForm)} 
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
        >
          <Plus size={16} className="inline mr-1" />
          Add Task
        </button>
      </div>

      {showTaskForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">New Task</h3>
          <div className="grid grid-cols-2 gap-4">
            <input 
              type="text" 
              value={newTask.title} 
              onChange={(e) => setNewTask({...newTask, title: e.target.value})} 
              placeholder="Title" 
              className="px-4 py-2 border-2 border-gray-200 rounded-lg" 
            />
            <select 
              value={newTask.status} 
              onChange={(e) => setNewTask({...newTask, status: e.target.value})} 
              className="px-4 py-2 border-2 border-gray-200 rounded-lg"
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
            <input 
              type="text" 
              value={newTask.description} 
              onChange={(e) => setNewTask({...newTask, description: e.target.value})} 
              placeholder="Description" 
              className="col-span-2 px-4 py-2 border-2 border-gray-200 rounded-lg" 
            />
            <select 
              value={newTask.priority} 
              onChange={(e) => setNewTask({...newTask, priority: e.target.value})} 
              className="px-4 py-2 border-2 border-gray-200 rounded-lg"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
            <input 
              type="text" 
              value={newTask.assignedTo} 
              onChange={(e) => setNewTask({...newTask, assignedTo: e.target.value})} 
              placeholder="Assigned to" 
              className="px-4 py-2 border-2 border-gray-200 rounded-lg" 
            />
            <button 
              onClick={createTask} 
              disabled={!newTask.title.trim()} 
              className="col-span-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300"
            >
              Create Task
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(statusColumns).map(([status, config]) => (
          <div 
            key={status} 
            className="bg-white rounded-lg shadow-lg p-4 min-h-[500px]" 
            onDragOver={handleDragOver} 
            onDrop={() => handleDrop(status)}
          >
            <div className={`text-xl font-bold mb-4 pb-3 border-b-4 ${config.color}`}>
              {config.title}
            </div>
            <div className="space-y-3">
              {getTasksByStatus(status).map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onDragStart={handleDragStart} 
                  onDelete={deleteTask} 
                  onOpenComments={onOpenComments} 
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default TaskBoard;
