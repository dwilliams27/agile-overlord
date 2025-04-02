import React, { useEffect, useState } from 'react';
import { Ticket, TicketStatus, TicketPriority, TicketType, useTaskLord } from '../../contexts/TaskLordContext';
import CommentSection from './CommentSection';

interface TicketDetailsSidebarProps {
  ticket: Ticket;
  onClose: () => void;
}

const TicketDetailsSidebar: React.FC<TicketDetailsSidebarProps> = ({ ticket, onClose }) => {
  const { 
    updateTicket, 
    deleteTicket, 
    fetchTicketComments,
    currentUser
  } = useTaskLord();
  
  const [editMode, setEditMode] = useState(false);
  const [formValues, setFormValues] = useState({
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    type: ticket.type,
    assigneeId: ticket.assigneeId,
    storyPoints: ticket.storyPoints
  });
  
  useEffect(() => {
    fetchTicketComments(ticket.id);
  }, [ticket.id, fetchTicketComments]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value
    });
  };
  
  const handleSave = async () => {
    try {
      await updateTicket(ticket.id, {
        title: formValues.title,
        description: formValues.description,
        status: formValues.status as TicketStatus,
        priority: formValues.priority as TicketPriority,
        type: formValues.type as TicketType,
        assigneeId: formValues.assigneeId === '' ? null : parseInt(formValues.assigneeId as string),
        storyPoints: formValues.storyPoints === '' ? null : parseInt(formValues.storyPoints as string)
      });
      setEditMode(false);
    } catch (error) {
      console.error('Error saving ticket:', error);
    }
  };
  
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this ticket?')) {
      try {
        await deleteTicket(ticket.id);
        onClose();
      } catch (error) {
        console.error('Error deleting ticket:', error);
      }
    }
  };
  
  // Priority badge color
  const priorityColor = {
    [TicketPriority.HIGHEST]: 'bg-red-100 text-red-800',
    [TicketPriority.HIGH]: 'bg-orange-100 text-orange-800',
    [TicketPriority.MEDIUM]: 'bg-blue-100 text-blue-800',
    [TicketPriority.LOW]: 'bg-green-100 text-green-800',
    [TicketPriority.LOWEST]: 'bg-gray-100 text-gray-800'
  };
  
  const priorityLabel = {
    [TicketPriority.HIGHEST]: 'Highest',
    [TicketPriority.HIGH]: 'High',
    [TicketPriority.MEDIUM]: 'Medium',
    [TicketPriority.LOW]: 'Low',
    [TicketPriority.LOWEST]: 'Lowest'
  };
  
  // Type icon and color
  const typeInfo = {
    [TicketType.BUG]: { icon: '🐞', color: 'text-red-600' },
    [TicketType.TASK]: { icon: '✓', color: 'text-blue-600' },
    [TicketType.FEATURE]: { icon: '✨', color: 'text-green-600' },
    [TicketType.EPIC]: { icon: '🏆', color: 'text-purple-600' },
    [TicketType.STORY]: { icon: '📖', color: 'text-yellow-600' }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-medium">Ticket Details</h2>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          {editMode ? (
            /* Edit Mode */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  value={formValues.title}
                  onChange={handleChange}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={formValues.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={TicketStatus.TODO}>To Do</option>
                    <option value={TicketStatus.IN_PROGRESS}>In Progress</option>
                    <option value={TicketStatus.REVIEW}>Review</option>
                    <option value={TicketStatus.DONE}>Done</option>
                    <option value={TicketStatus.BACKLOG}>Backlog</option>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Story Points</label>
                  <input
                    type="number"
                    name="storyPoints"
                    value={formValues.storyPoints || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            /* View Mode */
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className={`${typeInfo[ticket.type].color} font-medium`}>
                    {typeInfo[ticket.type].icon} {ticket.type.charAt(0).toUpperCase() + ticket.type.slice(1)}
                  </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${priorityColor[ticket.priority]}`}>
                  {priorityLabel[ticket.priority]}
                </span>
              </div>
              
              <h1 className="text-xl font-medium mb-4">{ticket.title}</h1>
              
              <div className="bg-gray-50 rounded p-3 mb-4 whitespace-pre-wrap">
                {ticket.description || 'No description provided.'}
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                  <p>{ticket.status.replace('_', ' ')}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Story Points</h3>
                  <p>{ticket.storyPoints || 'Not set'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Assignee</h3>
                  {ticket.assignee ? (
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs mr-2">
                        {ticket.assignee.name.charAt(0)}
                      </div>
                      <span>{ticket.assignee.name}</span>
                    </div>
                  ) : (
                    <p>Unassigned</p>
                  )}
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Created by</h3>
                  {ticket.creator ? (
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs mr-2">
                        {ticket.creator.name.charAt(0)}
                      </div>
                      <span>{ticket.creator.name}</span>
                    </div>
                  ) : (
                    <p>Unknown</p>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-2 mb-6">
                <button
                  onClick={() => setEditMode(true)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1 border border-red-300 rounded text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
              
              <div className="text-sm text-gray-500 mb-6">
                <p>Created: {formatDate(ticket.createdAt)}</p>
                <p>Updated: {formatDate(ticket.updatedAt)}</p>
              </div>
            </div>
          )}
          
          {/* Comments Section */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-lg font-medium mb-4">Comments</h3>
            <CommentSection ticketId={ticket.id} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailsSidebar;