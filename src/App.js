import { useState, useEffect, useRef } from "react";
import { Users, Plus, AlertCircle } from "lucide-react";
import Avatar from "./Avatar";
import NotificationBadge from "./NotificationBadge";
import TaskCard from "./TaskCard";
import wsService from "./WebSocketService";

const TaskBoard = () => {
  const [username, setUsername] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [activeUsers, setActiveUsers] = useState(new Set());
  const [notifications, setNotifications] = useState([]);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    status: "TODO",
    assignedTo: "",
  });
  const [draggedTask, setDraggedTask] = useState(null);
  const ws = useRef(wsService);

  const statusColumns = {
    TODO: { title: "📋 To Do", color: "border-yellow-500" },
    IN_PROGRESS: { title: "⚡ In Progress", color: "border-blue-500" },
    DONE: { title: "✅ Done", color: "border-green-500" },
  };

  const addNotification = (message, type = "info") => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeNotification(id);
    }, 6000);
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  useEffect(() => {
    const currentWs = ws.current;
    return () => {
      if (currentWs) {
        currentWs.disconnect();
      }
    };
  }, []);

  const loadTasks = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/tasks");
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };

  const connect = () => {
    if (!username.trim()) {
      alert("Please enter your name");
      return;
    }
    ws.current.connect(
      username,
      () => {
        setIsConnected(true);
        ws.current.subscribe("/topic/tasks", handleTaskMessage);
        ws.current.subscribe("/topic/users", handleUserMessage);
        // Load tasks first to see existing state
        loadTasks();
        ws.current.send("/app/user.join", username);

        addNotification(
          `Welcome ${username}! You're now connected.`,
          "success"
        );
      },
      () => {
        setIsConnected(false);
        addNotification("Connection error occurred", "error");
      }
    );
  };

  const handleTaskMessage = (message) => {
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
          addNotification(
            `You've been assigned to: "${message.task.title}"`,
            "success"
          );
        } else if (message.task.createdBy !== username) {
          addNotification(
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
          const oldTask = tasks.find((t) => t.id === message.task.id);
          if (oldTask && oldTask.assignedTo !== message.task.assignedTo) {
            addNotification(
              `You've been assigned to: "${message.task.title}"`,
              "success"
            );
          }
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
          addNotification(
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
          addNotification(
            `Task "${message.task.title}" was deleted`,
            "warning"
          );
        }
        break;
      default:
        break;
    }
  };

  const handleUserMessage = (message) => {
    if (message.type === "USER_JOINED") {
      // Only show notification if it's not yourself
      if (message.username !== username) {
        addNotification(`${message.username} joined the board`, "info");
      }
    } else if (message.type === "USER_LEFT") {
      // Only show notification if it's not yourself
      if (message.username !== username) {
        addNotification(`${message.username} left the board`, "info");
      }
    } else if (message.type === "USER_LIST") {
      // Sync the complete user list from the server
      if (message.username) {
        const userList = message.username
          .split(",")
          .filter((u) => u.trim() !== "");
        setActiveUsers(new Set(userList));
      }
    }
  };

  const createTask = () => {
    if (!isConnected || !newTask.title.trim()) {
      alert("Please connect and enter a task title");
      return;
    }
    const task = { ...newTask, createdBy: username };
    ws.current.send("/app/task.create", task);

    setNewTask({
      title: "",
      description: "",
      priority: "MEDIUM",
      status: "TODO",
      assignedTo: "",
    });
  };

  const deleteTask = (taskId) => {
    if (!isConnected) return;
    ws.current.send("/app/task.delete", { id: taskId });
  };

  const handleDragStart = (task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (newStatus) => {
    if (!draggedTask || !isConnected) return;

    const task = {
      id: draggedTask.id,
      status: newStatus,
    };

    ws.current.send("/app/task.move", task);
    setDraggedTask(null);
  };

  const getTasksByStatus = (status) => {
    return tasks.filter((task) => task.status === status);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-indigo-600 p-6">
      <div className="fixed top-4 right-4 z-50 max-w-md">
        {notifications.map((notification) => (
          <NotificationBadge
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-purple-600">
              🎯 Real-Time Task Board
            </h1>

            <div className="flex items-center gap-4">
              {!isConnected ? (
                <>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your name"
                    className="px-4 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-500"
                    onKeyPress={(e) => e.key === "Enter" && connect()}
                  />
                  <button
                    onClick={connect}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                  >
                    Connect
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Avatar name={username} size="md" />
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-600 font-medium">
                      {username}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Users */}
          {isConnected && activeUsers.size > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} className="text-gray-600" />
                <span className="text-sm font-semibold text-gray-700">
                  Active Users ({activeUsers.size}):
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {Array.from(activeUsers).map((user) => (
                  <div
                    key={user}
                    className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg"
                  >
                    <Avatar name={user} size="sm" />
                    <span className="text-sm font-medium text-purple-700">
                      {user}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Board Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {Object.entries(statusColumns).map(([status, config]) => (
            <div
              key={status}
              className="bg-white rounded-lg shadow-lg p-4 min-h-[500px]"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(status)}
            >
              <div
                className={`text-xl font-bold mb-4 pb-3 border-b-4 ${config.color}`}
              >
                {config.title}
              </div>

              <div className="space-y-3">
                {getTasksByStatus(status).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDragStart={handleDragStart}
                    onDelete={deleteTask}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Add Task Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Plus size={24} />
            Add New Task
          </h2>

          {!isConnected && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <AlertCircle size={20} className="text-yellow-600 mt-0.5" />
              <span className="text-sm text-yellow-800">
                Please connect to create tasks
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
                placeholder="Task title"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                disabled={!isConnected}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Status
              </label>
              <select
                value={newTask.status}
                onChange={(e) =>
                  setNewTask({ ...newTask, status: e.target.value })
                }
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                disabled={!isConnected}
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Assigned To
              </label>
              <input
                type="text"
                value={newTask.assignedTo}
                onChange={(e) =>
                  setNewTask({ ...newTask, assignedTo: e.target.value })
                }
                placeholder="Assignee name"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                disabled={!isConnected}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={newTask.description}
                onChange={(e) =>
                  setNewTask({ ...newTask, description: e.target.value })
                }
                placeholder="Task description"
                rows={3}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                disabled={!isConnected}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={newTask.priority}
                onChange={(e) =>
                  setNewTask({ ...newTask, priority: e.target.value })
                }
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                disabled={!isConnected}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={createTask}
                disabled={!isConnected || !newTask.title.trim()}
                className="w-full px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskBoard;
