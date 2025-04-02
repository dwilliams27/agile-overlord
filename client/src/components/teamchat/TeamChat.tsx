import React, { useEffect } from 'react';
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
    <div className="h-full flex flex-col">
      <div className="h-12 bg-indigo-600 text-white flex items-center px-4 text-lg font-medium">
        TeamChat
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 flex flex-col bg-gray-800">
          <UserSelector />
          <div className="flex-1 overflow-hidden">
            <ChannelsList />
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
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