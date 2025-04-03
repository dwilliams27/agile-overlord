import React, { useState } from 'react';
import { useFoolsForum } from '../../contexts/FoolsForumContext';

interface MessageInputProps {
  channelId: number;
  threadParentId?: number;
  placeholder?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  channelId, 
  threadParentId,
  placeholder = 'Type a message...'
}) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { sendMessage, currentUser } = useFoolsForum();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !currentUser) return;
    
    setSending(true);
    try {
      await sendMessage(message, channelId, threadParentId);
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };
  
  if (!currentUser) {
    return (
      <div className="text-center p-2 bg-yellow-50 text-yellow-800 text-sm rounded">
        Please select a user to start chatting
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="flex items-center">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={placeholder}
        disabled={sending}
        className="flex-1 border-2 border-purple-500 rounded-l-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-red-400 bg-yellow-50 text-purple-900"
      />
      <button
        type="submit"
        disabled={!message.trim() || sending}
        className="bg-red-600 text-yellow-100 py-2 px-4 rounded-r-lg hover:bg-red-700 focus:outline-none disabled:opacity-50 border-2 border-yellow-400"
      >
        {sending ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-yellow-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Sending
          </span>
        ) : '🎭 Jest!'}
      </button>
    </form>
  );
};

export default MessageInput;