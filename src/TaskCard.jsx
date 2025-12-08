import { Trash2, MessageSquare, Clock} from 'lucide-react';
import Avatar from './Avatar';

const priorityColors = {
  LOW: 'bg-blue-100 text-blue-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800'
};

const TaskCard = ({ task, onDragStart, onDelete,onOpenComments  }) => {
  const isDueSoon = task.dueDate && new Date(task.dueDate) - new Date() < 24 * 60 * 60 * 1000 && new Date(task.dueDate) > new Date();
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task)}
      className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 cursor-move hover:shadow-md transition-shadow"
    >
      <div className="font-semibold text-gray-800 mb-2">{task.title}</div>
      {task.description && (
        <div className="text-sm text-gray-600 mb-3">{task.description}</div>
      )}
      
      <div className="flex justify-between items-center mb-3">
        <span className={`px-2 py-1 rounded text-xs font-bold ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
      </div>

      {task.dueDate && (
        <div className={`flex items-center gap-2 mb-3 p-2 rounded text-sm ${
          isOverdue ? 'bg-red-100 text-red-800' : isDueSoon ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-50 text-blue-800'
        }`}>
          <Clock size={14} />
          <span className="font-medium">
            {isOverdue ? 'Overdue: ' : isDueSoon ? 'Due Soon: ' : 'Due: '}
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        </div>
      )}

      {task.assignedTo && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-white rounded border border-gray-200">
          <Avatar name={task.assignedTo} size="sm" />
          <div className="flex-1">
            <div className="text-xs text-gray-500">Assigned to</div>
            <div className="text-sm font-medium text-gray-700">{task.assignedTo}</div>
          </div>
        </div>
      )}

      {task.createdBy && (
        <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
          <span>Created by {task.createdBy}</span>
        </div>
      )}
      
     <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenComments(task);
          }}
          className="flex-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          <MessageSquare size={14} />
          Comments
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm font-medium"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export default TaskCard;