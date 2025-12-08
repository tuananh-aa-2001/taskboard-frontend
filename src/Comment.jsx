import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import Avatar from './Avatar';
import wsService from './WebSocketService';

const Comment = ({ 
  selectedTask, 
  onClose, 
  username, 
  isConnected,
  onNotification 
}) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  const loadComments = useCallback(async (taskId) => {
    try {
      const response = await fetch(`http://localhost:8080/api/comments/task/${taskId}`);
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }, []);

  const createComment = useCallback(() => {
    if (!newComment.trim() || !selectedTask) return;
    const comment = { 
      content: newComment, 
      taskId: selectedTask.id, 
      author: username 
    };
    wsService.send('/app/comment.create', comment);
    setNewComment('');
  }, [newComment, selectedTask, username]);

  const handleCommentMessage = useCallback((message) => {
    if (message.type === 'COMMENT_CREATED') {
      loadComments(message.taskId);
      onNotification?.('New comment on task', 'info');
    } else if (message.type === 'COMMENT_DELETED') {
      loadComments(message.taskId);
    }
  }, [loadComments, onNotification]);

  // Load comments when selectedTask changes
  useEffect(() => {
    if (selectedTask) {
      loadComments(selectedTask.id);
    }
  }, [selectedTask, loadComments]);

  // Subscribe to comment updates
  useEffect(() => {
    if (selectedTask && isConnected) {
      wsService.subscribe(`/topic/task/${selectedTask.id}/comments`, handleCommentMessage);
    }
  }, [selectedTask, isConnected, handleCommentMessage]);

  if (!selectedTask) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-6 max-w-2xl w-full m-4 max-h-[80vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Task Details Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-2xl font-bold">{selectedTask.title}</h3>
            <p className="text-gray-600">{selectedTask.description}</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Comments Section */}
        <div className="mb-4">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <MessageSquare size={16} />
            Comments ({comments.length})
          </h4>

          {/* Comments List */}
          <div className="space-y-3 max-h-60 overflow-y-auto mb-3">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <Avatar name={comment.author} size="sm" />
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{comment.author}</div>
                    <div className="text-gray-700">{comment.content}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(comment.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Comment Input */}
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newComment} 
              onChange={(e) => setNewComment(e.target.value)} 
              placeholder="Add a comment..." 
              className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg" 
              onKeyPress={(e) => e.key === 'Enter' && createComment()}
              disabled={!isConnected}
            />
            <button 
              onClick={createComment} 
              disabled={!newComment.trim() || !isConnected} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Comment;
