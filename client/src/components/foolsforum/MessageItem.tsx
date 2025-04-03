import React from 'react';
import { Message, useFoolsForum } from '../../contexts/FoolsForumContext';

interface MessageItemProps {
  message: Message;
  showThreadButton?: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, showThreadButton = true }) => {
  const { setActiveThread } = useFoolsForum();
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const handleThreadClick = () => {
    setActiveThread(message);
  };
  
  return (
    <div className="flex items-start p-3 hover:bg-yellow-100">
      {/* Avatar placeholder */}
      <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-yellow-200 font-bold mr-3 flex-shrink-0 border-2 border-yellow-400">
        {message.user?.name.charAt(0) || '🃏'}
      </div>
      
      <div className="flex-1 min-w-0">
        {/* Message header */}
        <div className="flex items-center">
          <span className="font-medium text-red-700">{message.user?.name || 'Unknown Jester'}</span>
          <span className="ml-2 text-xs text-green-700">{formatDate(message.createdAt)}</span>
        </div>
        
        {/* Message content */}
        <div className="mt-1 text-purple-900">{message.content}</div>
        
        {/* Thread button */}
        {showThreadButton && (
          <div className="mt-2">
            <button 
              onClick={handleThreadClick}
              className="text-xs text-red-600 hover:text-yellow-600 font-medium"
            >
              🎭 Reply in thread
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;