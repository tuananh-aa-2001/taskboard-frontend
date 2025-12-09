import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, LayoutGrid } from 'lucide-react';
import wsService from './WebSocketService';

const Board = ({ 
  username, 
  isConnected,
  currentBoardId,
  onBoardSelect,
  onNotification
}) => {
  const [boards, setBoards] = useState([]);
  const [showBoardForm, setShowBoardForm] = useState(false);
  const [newBoard, setNewBoard] = useState({ 
    name: '', 
    description: '', 
    isPublic: false 
  });
  const ws = useRef(wsService);

  const loadBoards = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/boards/user/${username}`);
      const data = await response.json();
      // Normalize payload: server may return an array or an object { boards: [] }
      const boardsArray = Array.isArray(data)
        ? data
        : (data && Array.isArray(data.boards) ? data.boards : []);
      setBoards(boardsArray);
      if (boardsArray.length > 0 && !currentBoardId) {
        onBoardSelect(boardsArray[0].id);
      }
    } catch (error) {
      console.error('Error loading boards:', error);
    }
  }, [username,currentBoardId, onBoardSelect]);

  const createBoard = useCallback(async () => {
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
      onNotification?.('Board created!', 'success');
    } catch (error) {
      console.error('Error creating board:', error);
    }
  }, [newBoard, username, onNotification]);

  // Load boards when component mounts or username changes
  useEffect(() => {
    if (username && isConnected) {
      loadBoards();
    }
  }, [username, isConnected, loadBoards]);

  // Subscribe to board updates for real-time sync
  useEffect(() => {
    if (isConnected) {
      const handleBoardMessage = (message) => {
        // Normalize incoming message shapes. Message may contain a `board`,
        // or the payload itself may be a board object. Defensive handling
        // prevents state from becoming a non-array.
        try {
          const type = message.type;
          const payloadBoard = message.board ?? (message.payload ?? message);

          if (type === 'BOARD_CREATED') {
            const board = payloadBoard;
            if (board) setBoards(prev => Array.isArray(prev) ? [...prev, board] : [board]);
            onNotification?.(`Board "${board?.name}" created`, 'info');
          } else if (type === 'BOARD_UPDATED') {
            const board = payloadBoard;
            if (board) setBoards(prev => Array.isArray(prev)
              ? prev.map(b => b.id === board.id ? board : b)
              : [board]
            );
          } else if (type === 'BOARD_DELETED') {
            const boardId = message.boardId ?? message.id ?? payloadBoard?.id;
            setBoards(prev => Array.isArray(prev) ? prev.filter(b => b.id !== boardId) : []);
            onNotification?.('Board deleted', 'info');
          } else if (type === 'BOARD_LIST') {
            // Replace full list
            const list = Array.isArray(message.boards) ? message.boards : (Array.isArray(message.payload) ? message.payload : []);
            setBoards(list);
          } else {
            // unexpected shape: log for debugging
            if (message && (message.boards || message.board)) {
              // Try to salvage boards list
              if (Array.isArray(message.boards)) setBoards(message.boards);
            } else {
              console.warn('Unexpected board message shape:', message);
            }
          }
        } catch (err) {
          console.error('Error handling board message:', err, message);
        }
      };
      ws.current.subscribe('/topic/boards', handleBoardMessage);
    }
  }, [isConnected, onNotification]);

  if (!isConnected) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <LayoutGrid size={20} />
          My Boards
        </h2>
        <button 
          onClick={() => setShowBoardForm(!showBoardForm)} 
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold"
        >
          <Plus size={16} className="inline mr-1" />
          New Board
        </button>
      </div>

      {showBoardForm && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <input 
            type="text" 
            value={newBoard.name} 
            onChange={(e) => setNewBoard({...newBoard, name: e.target.value})} 
            placeholder="Board name" 
            className="w-full px-4 py-2 mb-2 border-2 border-gray-200 rounded-lg" 
          />
          <input 
            type="text" 
            value={newBoard.description} 
            onChange={(e) => setNewBoard({...newBoard, description: e.target.value})} 
            placeholder="Description" 
            className="w-full px-4 py-2 mb-2 border-2 border-gray-200 rounded-lg" 
          />
          <label className="flex items-center gap-2 mb-2">
            <input 
              type="checkbox" 
              checked={newBoard.isPublic} 
              onChange={(e) => setNewBoard({...newBoard, isPublic: e.target.checked})} 
            />
            <span className="text-sm">Make public</span>
          </label>
          <button 
            onClick={createBoard} 
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Create Board
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.isArray(boards) && boards.map(board => (
          <div 
            key={board.id} 
            onClick={() => onBoardSelect(board.id)} 
            className={`p-4 rounded-lg cursor-pointer transition-all ${
              currentBoardId === board.id 
                ? 'bg-purple-100 border-2 border-purple-500' 
                : 'bg-gray-100 border-2 border-gray-200 hover:border-purple-300'
            }`}
          >
            <div className="font-semibold text-gray-800">{board.name}</div>
            <div className="text-xs text-gray-500 mt-1">
              {board.isPublic ? '🌐 Public' : '🔒 Private'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Board;
