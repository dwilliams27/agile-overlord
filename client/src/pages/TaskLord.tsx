import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import BoardView from '../components/tasklord/BoardView';
import { TaskLordProvider } from '../contexts/TaskLordContext';
import CreateTicketModal from '../components/tasklord/CreateTicketModal';

const TaskLordContent: React.FC = () => {
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  
  const openCreateTicket = () => {
    setShowCreateTicket(true);
  };
  
  const closeCreateTicket = () => {
    setShowCreateTicket(false);
  };
  
  return (
    <div className="h-screen w-full flex flex-col">
      {/* Header */}
      <div className="h-12 bg-blue-600 text-white flex items-center justify-between px-4">
        <div className="flex items-center">
          <Link to="/" className="flex items-center mr-4 hover:bg-blue-700 rounded p-1 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            <span className="ml-1">Back</span>
          </Link>
          <span className="text-lg font-medium">TaskLord</span>
        </div>
        <div>
          <button
            onClick={openCreateTicket}
            className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-blue-50"
          >
            Create Ticket
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <BoardView />
      </div>
      
      {/* Create Ticket Modal */}
      {showCreateTicket && (
        <CreateTicketModal onClose={closeCreateTicket} />
      )}
    </div>
  );
};

const TaskLord: React.FC = () => {
  return (
    <TaskLordProvider>
      <TaskLordContent />
    </TaskLordProvider>
  );
};

export default TaskLord;