import React from 'react';
import { Link } from 'react-router-dom';
import { FoolsForumProvider, useFoolsForum } from '../../contexts/FoolsForumContext';
import ChannelsList from './ChannelsList';
import MessageList from './MessageList';
import ThreadView from './ThreadView';
import UserSelector from './UserSelector';

const FoolsForumContent: React.FC = () => {
  const { activeThread } = useFoolsForum();
  
  return (
    <div className="h-screen w-full flex flex-col">
      {/* Header */}
      <div className="h-12 bg-purple-700 text-white flex items-center px-4">
        <Link to="/" className="flex items-center mr-4 hover:bg-purple-800 rounded p-1 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          <span className="ml-1">Back</span>
        </Link>
        <h1 className="text-lg font-bold">🎭 Fool's Forum</h1>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 flex flex-col bg-green-900 text-white">
          <UserSelector />
          <div className="flex-1 overflow-hidden">
            <ChannelsList />
          </div>
        </div>
        
        {/* Main chat area */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <MessageList />
          </div>
          
          {/* Thread panel */}
          {activeThread && <ThreadView />}
        </div>
      </div>
    </div>
  );
};

const FoolsForum: React.FC = () => {
  return (
    <FoolsForumProvider>
      <FoolsForumContent />
    </FoolsForumProvider>
  );
};

export default FoolsForum;