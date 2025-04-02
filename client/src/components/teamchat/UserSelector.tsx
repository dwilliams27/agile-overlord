import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTeamChat, User } from '../../contexts/TeamChatContext';

const UserSelector: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, setCurrentUser } = useTeamChat();
  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get('/api/users');
        setUsers(response.data);
        
        // Set first non-AI user as current user if none selected
        if (!currentUser && response.data.length > 0) {
          const firstHumanUser = response.data.find((user: User) => !user.isAI);
          if (firstHumanUser) {
            setCurrentUser(firstHumanUser);
          }
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);
  
  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = parseInt(e.target.value);
    const selectedUser = users.find(user => user.id === userId);
    if (selectedUser) {
      setCurrentUser(selectedUser);
    }
  };
  
  if (loading) {
    return (
      <div className="px-3 py-2 animate-pulse">
        <div className="h-6 bg-gray-200 rounded"></div>
      </div>
    );
  }
  
  // Filter out AI users
  const humanUsers = users.filter(user => !user.isAI);
  
  return (
    <div className="px-3 py-2">
      <label htmlFor="user-select" className="block text-sm font-medium text-gray-300 mb-1">
        You are:
      </label>
      <select
        id="user-select"
        value={currentUser?.id || ''}
        onChange={handleUserChange}
        className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="" disabled>Select a user</option>
        {humanUsers.map(user => (
          <option key={user.id} value={user.id}>
            {user.name} ({user.role})
          </option>
        ))}
      </select>
    </div>
  );
};

export default UserSelector;