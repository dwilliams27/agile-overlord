import React, { useEffect, useRef, useCallback } from 'react';
import { useTeamChat } from '../../contexts/TeamChatContext';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';

const MessageList: React.FC = () => {
  const { 
    activeChannel, 
    messages, 
    loadingMessages,
    fetchMessages
  } = useTeamChat();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Memoize the activeChannel.id dependency
  const channelId = activeChannel?.id;
  
  useEffect(() => {
    if (channelId) {
      fetchMessages(channelId);
    }
  }, [channelId, fetchMessages]);
  
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
  useEffect(() => {
    // Scroll to bottom when messages change to show the newest messages
    if (channelId && messages[channelId]) {
      // Short delay to ensure DOM is updated
      setTimeout(scrollToBottom, 100);
    }
  }, [channelId, messages, scrollToBottom]);
  
  if (!activeChannel) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center bg-white">
        <p className="text-gray-500">Select a channel to start chatting</p>
      </div>
    );
  }
  
  const channelMessages = activeChannel ? messages[activeChannel.id] || [] : [];
  
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Channel header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold">#{activeChannel.name}</h2>
        {activeChannel.description && (
          <p className="text-sm text-gray-600">{activeChannel.description}</p>
        )}
      </div>
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {loadingMessages ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200 mr-3"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : channelMessages.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>No messages in this channel yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {channelMessages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Message input */}
      <div className="p-4 border-t border-gray-200">
        <MessageInput channelId={activeChannel.id} />
      </div>
    </div>
  );
};

export default MessageList;