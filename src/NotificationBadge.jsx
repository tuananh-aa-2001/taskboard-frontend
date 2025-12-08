import { Bell, X } from 'lucide-react';

const NotificationBadge = ({ notification, onClose }) => {
  const bgColors = {
    success: 'bg-green-100 border-green-400',
    error: 'bg-red-100 border-red-400',
    warning: 'bg-yellow-100 border-yellow-400',
    info: 'bg-blue-100 border-blue-400'
  };

  const textColors = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800'
  };

  return (
    <div className={`${bgColors[notification.type]} border-l-4 p-4 mb-2 rounded shadow-md flex items-start justify-between animate-slide-in`}>
      <div className="flex items-start gap-2">
        <Bell size={18} className={textColors[notification.type]} />
        <span className={`text-sm font-medium ${textColors[notification.type]}`}>
          {notification.message}
        </span>
      </div>
      <button
        onClick={() => onClose(notification.id)}
        className={`${textColors[notification.type]} hover:opacity-70`}
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default NotificationBadge;