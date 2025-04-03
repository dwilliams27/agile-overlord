import React, { useEffect } from 'react';
import { useFoolsForum } from '../../contexts/FoolsForumContext';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';

const ThreadView: React.FC = () => {
  const { 
    activeThread, 
    setActiveThread, 
    threadMessages, 
    fetchThreadMessages, 
    loadingThreadMessages 
  } = useFoolsForum();
  
  // Memoize the thread ID to prevent unnecessary re-fetches
  const threadId = activeThread?.id;
  
  useEffect(() => {
    if (threadId) {
      fetchThreadMessages(threadId);
    }
  }, [threadId, fetchThreadMessages]);
  
  if (!activeThread) {
    return null;
  }
  
  const currentThreadMessages = threadMessages[activeThread.id] || [];
  
  return (
    <div className="w-96 border-l-2 border-red-500 flex flex-col h-[calc(100vh-3rem)] bg-green-50">
      {/* Thread header */}
      <div className="px-4 py-3 border-b-2 border-yellow-400 bg-purple-100 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-red-700">🎭 Jesting Thread</h2>
        <button 
          onClick={() => setActiveThread(null)} 
          className="text-purple-500 hover:text-red-700"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
              clipRule="evenodd" 
            />
          </svg>
        </button>
      </div>
      
      {/* Thread parent message */}
      <div className="border-b-2 border-yellow-400 bg-green-100">
        <MessageItem message={activeThread} showThreadButton={false} />
      </div>
      
      {/* Thread replies */}
      <div className="flex-1 overflow-y-auto">
        {loadingThreadMessages ? (
          <div className="p-4 space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-start animate-pulse">
                <div className="w-10 h-10 rounded-full bg-red-200 mr-3"></div>
                <div className="flex-1">
                  <div className="h-4 bg-yellow-200 rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-green-200 rounded w-full mb-1"></div>
                </div>
              </div>
            ))}
          </div>
        ) : currentThreadMessages.length === 0 ? (
          <div className="p-6 text-center text-purple-600">
            <p>No jesting replies yet! 🎪 Be the first to reply!</p>
          </div>
        ) : (
          <div className="divide-y divide-green-200">
            {currentThreadMessages.map((message) => (
              <MessageItem key={message.id} message={message} showThreadButton={false} />
            ))}
          </div>
        )}
      </div>
      
      {/* Thread input */}
      <div className="p-4 border-t-2 border-yellow-400 bg-purple-100">
        <MessageInput 
          channelId={activeThread.channelId} 
          threadParentId={activeThread.id} 
          placeholder="Continue the jesting..." 
        />
      </div>
    </div>
  );
};

export default ThreadView;