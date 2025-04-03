import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import BoardView from '../components/tasklord/BoardView';
import { TaskLordProvider, useTaskLord } from '../contexts/TaskLordContext';
import CreateTicketModal from '../components/tasklord/CreateTicketModal';
import { User } from '../contexts/FoolsForumContext';

const TaskLordContent: React.FC = () => {
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const { setCurrentUser, currentUser } = useTaskLord();
  
  useEffect(() => {
    // Fetch the first human user and set as current user
    const fetchAndSetUser = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
        const response = await axios.get(`${API_URL}/api/users`);
        const users = response.data;
        
        // Find the human user (Big Boss Man)
        const humanUser = users.find((user: User) => !user.isAI);
        
        if (humanUser && !currentUser) {
          console.log('Setting current user to:', humanUser);
          setCurrentUser(humanUser);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    
    if (!currentUser) {
      fetchAndSetUser();
    }
  }, [currentUser, setCurrentUser]);
  
  const openCreateTicket = () => {
    setShowCreateTicket(true);
  };
  
  const closeCreateTicket = () => {
    setShowCreateTicket(false);
  };
  
  return (
    <div className="h-screen w-full flex flex-col bg-gray-900 text-gray-300">
      {/* Header */}
      <div className="h-16 bg-gradient-to-r from-red-900 to-red-800 text-gray-200 flex items-center justify-between px-6 border-b border-gray-800 shadow-md">
        <div className="flex items-center">
          <Link to="/" className="flex items-center mr-4 hover:bg-red-950 rounded p-1 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            <span className="ml-1">RETURN</span>
          </Link>
          <span className="text-xl font-bold uppercase tracking-wider flex items-center">
            <span className="mr-2">⚒️</span>
            TASKLORD CONTROL CENTER
          </span>
        </div>
        <div>
          <button
            onClick={openCreateTicket}
            className="bg-gray-800 text-red-500 border border-red-800 px-4 py-2 rounded text-sm font-bold uppercase tracking-wider hover:bg-gray-900 transition-colors shadow-sm"
          >
            ISSUE NEW DIRECTIVE
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