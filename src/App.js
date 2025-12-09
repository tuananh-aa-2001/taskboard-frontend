import { useState, useEffect, useRef, useCallback } from "react";
import NotificationBadge from "./NotificationBadge";
import Board from "./Board";
import TaskBoardComponent from "./TaskBoard";
import Comment from "./Comment";
import wsService from "./WebSocketService";
import Header from './Header';

const App = () => {
  const [tasks, setTasks] = useState([]);
  const [username, setUsername] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [currentBoardId, setCurrentBoardId] = useState(null);
  const [activeUsers, setActiveUsers] = useState(new Set());
  const [notifications, setNotifications] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
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
    if (!isConnected || !username) return;

    const checkDueDates = () => {
      const now = new Date();
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      tasks.forEach(task => {
        if (!task.dueDate || task.assignedTo !== username) return;

        const dueDate = new Date(task.dueDate);
        const isOverdue = dueDate < now && task.status !== 'DONE';
        const isDueSoon = dueDate > now && dueDate < oneDayFromNow && task.status !== 'DONE';

        if (isOverdue) {
          addNotification(`⚠️ Task "${task.title}" is OVERDUE!`, 'error');
        } else if (isDueSoon) {
          addNotification(`⏰ Task "${task.title}" is due soon!`, 'warning');
        }
      });
    };
    checkDueDates();
    // Then check every minute
    const interval = setInterval(checkDueDates, 60000);
    return () => clearInterval(interval);
  }, [tasks, isConnected, username]);

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
        addNotification(`Welcome ${username}! You're now connected.`,"success");
      },
      () => {
        setIsConnected(false);
        addNotification("Connection error occurred", "error");
      }
    );
  };

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

   return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-indigo-600 p-6">
      <div className="fixed top-4 right-4 z-50 max-w-md">
        {notifications.map(n => <NotificationBadge key={n.id} notification={n} onClose={removeNotification} />)}
      </div>

      <div className="max-w-7xl mx-auto">
        <Header
          username={username}
          setUsername={setUsername}
          isConnected={isConnected}
          connect={connect}
          activeUsers={activeUsers}
        />

        {/* Boards Component */}
        <Board
          username={username}
          isConnected={isConnected}
          currentBoardId={currentBoardId}
          onBoardSelect={setCurrentBoardId}
          onNotification={addNotification}
        />

        {/* Task Board Component */}
        <TaskBoardComponent
          currentBoardId={currentBoardId}
          username={username}
          isConnected={isConnected}
          onOpenComments={setSelectedTask}
          onNotification={addNotification}
          tasks={tasks}
          onTasksChange={setTasks}
        />

        {/* Comments Component */}
        <Comment
          selectedTask={selectedTask}
          onClose={() => setSelectedTask(null)}
          username={username}
          isConnected={isConnected}
          onNotification={addNotification}
        />
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

export default App;
