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
      setBoards(data);
      if (data.length > 0 && !currentBoardId) {
        onBoardSelect(data[0].id);
      }
    } catch (error) {
      console.error('Error loading boards:', error);
    }
  }, [username, onBoardSelect]);

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
        if (message.type === 'BOARD_CREATED') {
          setBoards(prev => [...prev, message.board]);
          onNotification?.(`Board "${message.board.name}" created`, 'info');
        } else if (message.type === 'BOARD_UPDATED') {
          setBoards(prev => 
            prev.map(b => b.id === message.board.id ? message.board : b)
          );
        } else if (message.type === 'BOARD_DELETED') {
          setBoards(prev => prev.filter(b => b.id !== message.boardId));
          onNotification?.('Board deleted', 'info');
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
        {boards.map(board => (
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
