import { useState, useEffect, useRef, useCallback } from "react";
import { Users, Plus, MessageSquare, LayoutGrid, Send , X } from "lucide-react";
import Avatar from "./Avatar";
import NotificationBadge from "./NotificationBadge";
import TaskCard from "./TaskCard";
import wsService from "./WebSocketService";

const statusColumns = {
  TODO: { title: "📋 To Do", color: "border-yellow-500" },
  IN_PROGRESS: { title: "⚡ In Progress", color: "border-blue-500" },
  DONE: { title: "✅ Done", color: "border-green-500" },
};

const TaskBoard = () => {
  const [username, setUsername] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [boards, setBoards] = useState([]);
  const [currentBoardId, setCurrentBoardId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activeUsers, setActiveUsers] = useState(new Set());
  const [notifications, setNotifications] = useState([]);
  const [showBoardForm, setShowBoardForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newBoard, setNewBoard] = useState({ name: '', description: '', isPublic: false });
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    status: "TODO",
    assignedTo: "",
  });
  const [draggedTask, setDraggedTask] = useState(null);
  const ws = useRef(wsService);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    (message, type = "info") => {
      const id = Date.now();
      setNotifications((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        removeNotification(id);
      }, 6000);
    },
    [removeNotification]
  );

  useEffect(() => {
    const currentWs = ws.current;
    return () => {
      if (currentWs) {
        currentWs.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (currentBoardId && isConnected) {
      loadTasks(currentBoardId);
    }
  }, [currentBoardId, isConnected]);

  const loadBoards = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/boards/user/${username}`);
      const data = await response.json();
      setBoards(data);
      if (data.length > 0 && !currentBoardId) {
        setCurrentBoardId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading boards:', error);
    }
  }, [username, currentBoardId]);

  const loadTasks = useCallback(async (boardId) => {
    try {
      const response = await fetch(`http://localhost:8080/api/tasks/board/${boardId}`);
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }, []);

  const loadComments = useCallback(async (taskId) => {
    try {
      const response = await fetch(`http://localhost:8080/api/comments/task/${taskId}`);
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }, []);

  const connect = () => {
    if (!username.trim()) {
      alert("Please enter your name");
      return;
    }
    ws.current.connect(
      username,
      () => {
        setIsConnected(true);
        ws.current.subscribe("/topic/users", handleUserMessage);
        ws.current.send("/app/user.join", username);
        loadBoards();
        addNotification(`Welcome ${username}! You're now connected.`,"success");
      },
      () => {
        setIsConnected(false);
        addNotification("Connection error occurred", "error");
      }
    );
  };

  
  useEffect(() => {
    if (currentBoardId && isConnected) {
      ws.current.subscribe(`/topic/board/${currentBoardId}`, handleTaskMessage);
    }
  }, [currentBoardId, isConnected]);

  useEffect(() => {
    if (selectedTask && isConnected) {
      ws.current.subscribe(`/topic/task/${selectedTask.id}/comments`, handleCommentMessage);
    }
  }, [selectedTask, isConnected]);


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
          addNotification(
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
  }, [username, addNotification]);

  const handleCommentMessage = useCallback((message) => {
    if (message.type === 'COMMENT_CREATED') {
      loadComments(message.taskId);
      addNotification(`New comment on task`, 'info');
    } else if (message.type === 'COMMENT_DELETED') {
      loadComments(message.taskId);
    }
  }, [loadComments, addNotification]);

  const handleUserMessage = useCallback((message) => {
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
  }, [username, addNotification]);

  const createBoard = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newBoard, owner: username })
      });
      const board = await response.json();
      setBoards(prev => [...prev, board]);
      setNewBoard({ name: '', description: '', isPublic: false });
      setShowBoardForm(false);
      addNotification('Board created!', 'success');
    } catch (error) {
      console.error('Error creating board:', error);
    }
  };

  const createTask = () => {
    if (!currentBoardId) {
      alert('Please select a board first');
      return;
    }
    const task = { ...newTask, createdBy: username,boardId: currentBoardId };
    ws.current.send("/app/task.create", task);

    setNewTask({
      title: "",
      description: "",
      priority: "MEDIUM",
      status: "TODO",
      assignedTo: "",
    });
     setShowTaskForm(false);
  };

  const createComment = () => {
    if (!newComment.trim() || !selectedTask) return;
    const comment = { content: newComment, taskId: selectedTask.id, author: username };
    ws.current.send('/app/comment.create', comment);
    setNewComment('');
  };

  const openComments = (task) => {
    setSelectedTask(task);
    loadComments(task.id);
  };

  const deleteTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      ws.current.send('/app/task.delete', task);
    }
  };

  const handleDragStart = (task) => setDraggedTask(task);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (newStatus) => {
    if (!draggedTask) return;

    const task = {
      id: draggedTask.id,
      status: newStatus,
      boardId: currentBoardId,
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
        {notifications.map(n => <NotificationBadge key={n.id} notification={n} onClose={removeNotification} />)}
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-purple-600">🎯 Real-Time Task Board</h1>
            <div className="flex items-center gap-4">
              {!isConnected ? (
                <>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your name" className="px-4 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-500" onKeyPress={(e) => e.key === 'Enter' && connect()} />
                  <button onClick={connect} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold">Connect</button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Avatar name={username} size="md" />
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-600 font-medium">{username}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isConnected && activeUsers.size > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-gray-600" />
                <span className="text-sm font-semibold text-gray-700">Active Users ({activeUsers.size}):</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {Array.from(activeUsers).map(user => (
                  <div key={user} className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg">
                    <Avatar name={user} size="sm" />
                    <span className="text-sm font-medium text-purple-700">{user}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Boards Section */}
        {isConnected && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <LayoutGrid size={20} />
                My Boards
              </h2>
              <button onClick={() => setShowBoardForm(!showBoardForm)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold">
                <Plus size={16} className="inline mr-1" />
                New Board
              </button>
            </div>

            {showBoardForm && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <input type="text" value={newBoard.name} onChange={(e) => setNewBoard({...newBoard, name: e.target.value})} placeholder="Board name" className="w-full px-4 py-2 mb-2 border-2 border-gray-200 rounded-lg" />
                <input type="text" value={newBoard.description} onChange={(e) => setNewBoard({...newBoard, description: e.target.value})} placeholder="Description" className="w-full px-4 py-2 mb-2 border-2 border-gray-200 rounded-lg" />
                <label className="flex items-center gap-2 mb-2">
                  <input type="checkbox" checked={newBoard.isPublic} onChange={(e) => setNewBoard({...newBoard, isPublic: e.target.checked})} />
                  <span className="text-sm">Make public</span>
                </label>
                <button onClick={createBoard} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Create Board</button>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {boards.map(board => (
                <div key={board.id} onClick={() => setCurrentBoardId(board.id)} className={`p-4 rounded-lg cursor-pointer transition-all ${currentBoardId === board.id ? 'bg-purple-100 border-2 border-purple-500' : 'bg-gray-100 border-2 border-gray-200 hover:border-purple-300'}`}>
                  <div className="font-semibold text-gray-800">{board.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{board.isPublic ? '🌐 Public' : '🔒 Private'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Task Board */}
        {isConnected && currentBoardId && (
          <>
            <div className="mb-4">
              <button onClick={() => setShowTaskForm(!showTaskForm)} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">
                <Plus size={16} className="inline mr-1" />
                Add Task
              </button>
            </div>

            {showTaskForm && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h3 className="text-xl font-bold mb-4">New Task</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" value={newTask.title} onChange={(e) => setNewTask({...newTask, title: e.target.value})} placeholder="Title" className="px-4 py-2 border-2 border-gray-200 rounded-lg" />
                  <select value={newTask.status} onChange={(e) => setNewTask({...newTask, status: e.target.value})} className="px-4 py-2 border-2 border-gray-200 rounded-lg">
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                  <input type="text" value={newTask.description} onChange={(e) => setNewTask({...newTask, description: e.target.value})} placeholder="Description" className="col-span-2 px-4 py-2 border-2 border-gray-200 rounded-lg" />
                  <select value={newTask.priority} onChange={(e) => setNewTask({...newTask, priority: e.target.value})} className="px-4 py-2 border-2 border-gray-200 rounded-lg">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                  <input type="text" value={newTask.assignedTo} onChange={(e) => setNewTask({...newTask, assignedTo: e.target.value})} placeholder="Assigned to" className="px-4 py-2 border-2 border-gray-200 rounded-lg" />
                  <button onClick={createTask} disabled={!newTask.title.trim()} className="col-span-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300">Create Task</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(statusColumns).map(([status, config]) => (
                <div key={status} className="bg-white rounded-lg shadow-lg p-4 min-h-[500px]" onDragOver={handleDragOver} onDrop={() => handleDrop(status)}>
                  <div className={`text-xl font-bold mb-4 pb-3 border-b-4 ${config.color}`}>{config.title}</div>
                  <div className="space-y-3">
                    {getTasksByStatus(status).map(task => (
                      <TaskCard key={task.id} task={task} onDragStart={handleDragStart} onDelete={deleteTask} onOpenComments={openComments} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Comments Modal */}
        {selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedTask(null)}>
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold">{selectedTask.title}</h3>
                  <p className="text-gray-600">{selectedTask.description}</p>
                </div>
                <button onClick={() => setSelectedTask(null)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <MessageSquare size={16} />
                  Comments ({comments.length})
                </h4>
                <div className="space-y-3 max-h-60 overflow-y-auto mb-3">
                  {comments.map(comment => (
                    <div key={comment.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Avatar name={comment.author} size="sm" />
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{comment.author}</div>
                          <div className="text-gray-700">{comment.content}</div>
                          <div className="text-xs text-gray-500 mt-1">{new Date(comment.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg" onKeyPress={(e) => e.key === 'Enter' && createComment()} />
                  <button onClick={createComment} disabled={!newComment.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300">
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default TaskBoard;
