import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TeamChatProvider, useTeamChat } from '../../contexts/TeamChatContext';
import ChannelsList from './ChannelsList';
import MessageList from './MessageList';
import ThreadView from './ThreadView';
import UserSelector from './UserSelector';

const TeamChatContent: React.FC = () => {
  const { activeThread, fetchChannels } = useTeamChat();
  
  // Only fetch channels on mount
  useEffect(() => {
    // We only want to fetch channels once on component mount
    let isMounted = true;
    if (isMounted) {
      fetchChannels();
    }
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return (
    <div className="h-screen w-full flex flex-col">
      <div className="h-12 bg-indigo-600 text-white flex items-center justify-between px-4">
        <div className="flex items-center">
          <Link to="/" className="flex items-center mr-4 hover:bg-indigo-700 rounded p-1 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            <span className="ml-1">Back</span>
          </Link>
          <span className="text-lg font-medium">TeamChat</span>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 flex flex-col bg-gray-800 h-[calc(100vh-3rem)]">
          <UserSelector />
          <div className="flex-1 overflow-hidden">
            <ChannelsList />
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex-1 flex overflow-hidden h-[calc(100vh-3rem)]">
          <div className="flex-1 overflow-hidden">
            <MessageList />
          </div>
          
          {/* Thread sidebar */}
          {activeThread && <ThreadView />}
        </div>
      </div>
    </div>
  );
};

const TeamChat: React.FC = () => {
  return (
    <TeamChatProvider>
      <TeamChatContent />
    </TeamChatProvider>
  );
};

export default TeamChat;