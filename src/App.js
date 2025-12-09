import { useState, useEffect, useRef, useCallback } from "react";
import NotificationBadge from "./NotificationBadge";
import Board from "./Board";
import TaskBoardComponent from "./TaskBoard";
import Comment from "./Comment";
import wsService from "./WebSocketService";
import Header from "./Header";
import Avatar from "./Avatar";
import { MessageCircle, Send,X } from "lucide-react";

const App = () => {
  const [tasks, setTasks] = useState([]);
  // const [tasks, setTasks] = useState([
  //   { id: 1, title: 'Fix login bug', description: 'Users cannot login', status: 'TODO', priority: 'URGENT', assignedTo: 'Alice', dueDate: '2024-12-10T10:00' },
  //   { id: 2, title: 'Update documentation', description: 'Add API docs', status: 'IN_PROGRESS', priority: 'MEDIUM', assignedTo: 'Bob', dueDate: '2024-12-15T15:00' },
  //   { id: 3, title: 'Design new UI', description: 'Homepage redesign', status: 'TODO', priority: 'HIGH', assignedTo: 'Alice', dueDate: '2024-12-09T18:00' },
  //   { id: 4, title: 'Database optimization', description: 'Improve query performance', status: 'DONE', priority: 'LOW', assignedTo: '', dueDate: '' },
  // ]);
  const [username, setUsername] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [currentBoardId, setCurrentBoardId] = useState(null);
  const [activeUsers, setActiveUsers] = useState(new Set());
  const [notifications, setNotifications] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const ws = useRef(wsService);

  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const chatEndRef = useRef(null);

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
    if (chatEndRef.current && showChat) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, showChat]);

  useEffect(() => {
    const currentWs = ws.current;
    const handleBeforeUnload = () => {
      if (currentWs && username) {
        currentWs.disconnect();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      currentWs.disconnect();
    };
  }, [username]);

  useEffect(() => {
    if (!isConnected || !username) return;

    const checkDueDates = () => {
      const now = new Date();
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      tasks.forEach((task) => {
        if (!task.dueDate || task.assignedTo !== username) return;

        const dueDate = new Date(task.dueDate);
        const isOverdue = dueDate < now && task.status !== "DONE";
        const isDueSoon =
          dueDate > now && dueDate < oneDayFromNow && task.status !== "DONE";

        if (isOverdue) {
          addNotification(`⚠️ Task "${task.title}" is OVERDUE!`, "error");
        } else if (isDueSoon) {
          addNotification(`⏰ Task "${task.title}" is due soon!`, "warning");
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
        ws.current.subscribe("/topic/chat", handleChatMessage);
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

  const handleUserMessage = useCallback(
    (message) => {
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
    },
    [username, addNotification]
  );

  const handleChatMessage = (message) => {
    if (message.type === "CHAT_MESSAGE") {
      const newMsg = {
        id: Date.now(),
        author: message.username,
        content: message.message,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, newMsg]);

      if (!showChat && message.username !== username) {
        setUnreadChatCount((prev) => prev + 1);
      }
    }
  };

  const sendChatMessage = () => {
    if (!newChatMessage.trim() || !isConnected) return;
    ws.current.send("/app/chat.message", {
      username: username,
      message: newChatMessage,
    });

    setNewChatMessage("");
  };

  const toggleChat = () => {
    setShowChat(!showChat);
    if (!showChat) {
      setUnreadChatCount(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-indigo-600 p-6">
      <div className="fixed top-4 right-4 z-50 max-w-md">
        {notifications.map((n) => (
          <NotificationBadge
            key={n.id}
            notification={n}
            onClose={removeNotification}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto">
        <Header
          username={username}
          setUsername={setUsername}
          isConnected={isConnected}
          connect={connect}
          activeUsers={activeUsers}
          onNotification={addNotification}
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

      {/* Floating Chat Button */}
      {isConnected && (
        <button
          onClick={toggleChat}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center z-40"
        >
          <MessageCircle size={24} />
          {unreadChatCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
              {unreadChatCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Panel */}
      {showChat && isConnected && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl z-40 flex flex-col">
          {/* Chat Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MessageCircle size={20} />
              <span className="font-semibold">Team Chat</span>
              <span className="text-xs bg-blue-500 px-2 py-1 rounded-full">
                {activeUsers.size} online
              </span>
            </div>
            <button
              onClick={toggleChat}
              className="hover:bg-blue-700 rounded p-1"
            >
              <X size={20} />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <MessageCircle size={48} className="mx-auto mb-2 opacity-50" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.author === username ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] ${
                      msg.author === username
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-gray-200"
                    } rounded-lg p-3 shadow-sm`}
                  >
                    {msg.author !== username && (
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar name={msg.author} size="sm" />
                        <span className="font-semibold text-sm text-gray-800">
                          {msg.author}
                        </span>
                      </div>
                    )}
                    <div
                      className={`${
                        msg.author === username ? "text-white" : "text-gray-800"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <div
                      className={`text-xs mt-1 ${
                        msg.author === username
                          ? "text-blue-200"
                          : "text-gray-400"
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
            <div className="flex gap-2">
              <input
                type="text"
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
              />
              <button
                onClick={sendChatMessage}
                disabled={!newChatMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

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
