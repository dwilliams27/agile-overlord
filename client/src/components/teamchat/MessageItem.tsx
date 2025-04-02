import React from 'react';
import { Message, useTeamChat } from '../../contexts/TeamChatContext';

interface MessageItemProps {
  message: Message;
  showThreadButton?: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, showThreadButton = true }) => {
  const { setActiveThread } = useTeamChat();
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const handleThreadClick = () => {
    setActiveThread(message);
  };
  
  return (
    <div className="flex items-start p-3 hover:bg-gray-50">
      {/* Avatar placeholder */}
      <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold mr-3 flex-shrink-0">
        {message.user?.name.charAt(0) || '?'}
      </div>
      
      <div className="flex-1 min-w-0">
        {/* Message header */}
        <div className="flex items-center">
          <span className="font-medium">{message.user?.name || 'Unknown User'}</span>
          <span className="ml-2 text-xs text-gray-500">{formatDate(message.createdAt)}</span>
        </div>
        
        {/* Message content */}
        <div className="mt-1">{message.content}</div>
        
        {/* Thread button */}
        {showThreadButton && (
          <div className="mt-2">
            <button 
              onClick={handleThreadClick}
              className="text-xs text-gray-500 hover:text-indigo-600"
            >
              Reply in thread
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;