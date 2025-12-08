import { useState, useEffect, useRef, useCallback } from "react";
import { Users } from "lucide-react";
import Avatar from "./Avatar";
import NotificationBadge from "./NotificationBadge";
import Board from "./Board";
import TaskBoardComponent from "./TaskBoard";
import Comment from "./Comment";
import wsService from "./WebSocketService";

const App = () => {
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
