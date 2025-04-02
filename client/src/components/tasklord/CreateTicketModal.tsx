import React, { useEffect, useState } from 'react';
import { useTaskLord, TicketStatus, TicketPriority, TicketType } from '../../contexts/TaskLordContext';
import { User } from '../../contexts/TeamChatContext';
import axios from 'axios';

interface CreateTicketModalProps {
  onClose: () => void;
}

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({ onClose }) => {
  const { createTicket, currentUser } = useTaskLord();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [formValues, setFormValues] = useState({
    title: '',
    description: '',
    status: TicketStatus.TODO,
    priority: TicketPriority.MEDIUM,
    type: TicketType.TASK,
    assigneeId: '',
    storyPoints: ''
  });
  
  useEffect(() => {
    // Fetch users for assignee dropdown
    const fetchUsers = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
        const response = await axios.get(`${API_URL}/api/users`);
        setUsers(response.data);
        
        // Log current state
        console.log('Current user in modal:', currentUser);
        console.log('Available users:', response.data);
        
        // If currentUser is not set, try to get the first non-AI user
        if (!currentUser && response.data.length > 0) {
          const firstHumanUser = response.data.find((user: User) => !user.isAI);
          if (firstHumanUser) {
            console.log('Setting current user to first human user:', firstHumanUser);
          }
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    
    fetchUsers();
  }, [currentUser]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted', { formValues, currentUser });
    
    if (!formValues.title) {
      console.error('Title is required');
      return;
    }
    
    if (!currentUser) {
      console.error('Current user is not set');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Creating ticket with:', {
        title: formValues.title,
        status: formValues.status,
        priority: formValues.priority,
        type: formValues.type,
        assigneeId: formValues.assigneeId ? parseInt(formValues.assigneeId) : null,
        reporterId: currentUser.id,
      });
      
      const ticket = await createTicket({
        title: formValues.title,
        description: formValues.description,
        status: formValues.status,
        priority: formValues.priority,
        assigneeId: formValues.assigneeId ? parseInt(formValues.assigneeId) : null,
        createdBy: currentUser.id
      });
      
      console.log('Ticket created successfully:', ticket);
      onClose();
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Error creating ticket: ' + (error.response?.data?.error || error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium">Create New Ticket</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              name="title"
              value={formValues.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formValues.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                name="type"
                value={formValues.type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={TicketType.TASK}>Task</option>
                <option value={TicketType.BUG}>Bug</option>
                <option value={TicketType.FEATURE}>Feature</option>
                <option value={TicketType.EPIC}>Epic</option>
                <option value={TicketType.STORY}>Story</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                name="priority"
                value={formValues.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={TicketPriority.HIGHEST}>Highest</option>
                <option value={TicketPriority.HIGH}>High</option>
                <option value={TicketPriority.MEDIUM}>Medium</option>
                <option value={TicketPriority.LOW}>Low</option>
                <option value={TicketPriority.LOWEST}>Lowest</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={formValues.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={TicketStatus.TODO}>To Do</option>
                <option value={TicketStatus.BACKLOG}>Backlog</option>
                <option value={TicketStatus.IN_PROGRESS}>In Progress</option>
                <option value={TicketStatus.REVIEW}>Review</option>
                <option value={TicketStatus.DONE}>Done</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Story Points</label>
              <input
                type="number"
                name="storyPoints"
                value={formValues.storyPoints}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
            <select
              name="assigneeId"
              value={formValues.assigneeId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Unassigned</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formValues.title || loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketModal;