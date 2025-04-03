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
    type: ticket.type || TicketType.TASK,
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
    [TicketPriority.HIGHEST]: 'bg-red-900 text-gray-200 border border-red-600',
    [TicketPriority.HIGH]: 'bg-red-800 text-gray-300 border border-red-700',
    [TicketPriority.MEDIUM]: 'bg-gray-800 text-gray-300 border border-gray-700',
    [TicketPriority.LOW]: 'bg-gray-900 text-gray-400 border border-gray-700',
    [TicketPriority.LOWEST]: 'bg-gray-900 text-gray-500 border border-gray-800'
  };
  
  const priorityLabel = {
    [TicketPriority.HIGHEST]: 'CRITICAL',
    [TicketPriority.HIGH]: 'URGENT',
    [TicketPriority.MEDIUM]: 'STANDARD',
    [TicketPriority.LOW]: 'SECONDARY',
    [TicketPriority.LOWEST]: 'MINIMAL'
  };
  
  // Type icon and color
  const typeInfo = {
    [TicketType.BUG]: { icon: '⚠️', color: 'text-red-500' },
    [TicketType.TASK]: { icon: '⚙️', color: 'text-gray-400' },
    [TicketType.FEATURE]: { icon: '🔧', color: 'text-gray-300' },
    [TicketType.EPIC]: { icon: '⚔️', color: 'text-red-400' },
    [TicketType.STORY]: { icon: '📜', color: 'text-gray-400' }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <div className="h-full flex flex-col bg-gray-800 text-gray-300">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gradient-to-r from-red-900 to-red-800">
        <h2 className="text-lg font-bold uppercase tracking-wide text-gray-200">Directive Information</h2>
        <button 
          onClick={onClose}
          className="text-gray-300 hover:text-red-400"
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
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Directive Title</label>
                <input
                  type="text"
                  name="title"
                  value={formValues.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-600 text-gray-200 font-mono"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Directive Details</label>
                <textarea
                  name="description"
                  value={formValues.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-600 text-gray-200 font-mono"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Status Classification</label>
                  <select
                    name="status"
                    value={formValues.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-600 text-gray-200 font-mono uppercase"
                  >
                    <option value={TicketStatus.TODO}>AWAITING ASSIGNMENT</option>
                    <option value={TicketStatus.IN_PROGRESS}>UNDER EXECUTION</option>
                    <option value={TicketStatus.REVIEW}>PENDING INSPECTION</option>
                    <option value={TicketStatus.DONE}>DIRECTIVE COMPLETED</option>
                    <option value={TicketStatus.BACKLOG}>LOW PRIORITY QUEUE</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Priority Level</label>
                  <select
                    name="priority"
                    value={formValues.priority}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-600 text-gray-200 font-mono uppercase"
                  >
                    <option value={TicketPriority.HIGHEST}>CRITICAL</option>
                    <option value={TicketPriority.HIGH}>URGENT</option>
                    <option value={TicketPriority.MEDIUM}>STANDARD</option>
                    <option value={TicketPriority.LOW}>SECONDARY</option>
                    <option value={TicketPriority.LOWEST}>MINIMAL</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Directive Type</label>
                  <select
                    name="type"
                    value={formValues.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-600 text-gray-200 font-mono uppercase"
                  >
                    <option value={TicketType.TASK}>TASK</option>
                    <option value={TicketType.BUG}>DEFECT</option>
                    <option value={TicketType.FEATURE}>ENHANCEMENT</option>
                    <option value={TicketType.EPIC}>MAJOR INITIATIVE</option>
                    <option value={TicketType.STORY}>NARRATIVE</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Work Units</label>
                  <input
                    type="number"
                    name="storyPoints"
                    value={formValues.storyPoints || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-600 text-gray-200 font-mono"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-700 mt-4">
                <button
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-sm font-bold uppercase text-gray-300 hover:bg-gray-700 tracking-wide"
                >
                  Abort
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-red-900 border border-red-700 rounded-md shadow-sm text-sm font-bold uppercase text-gray-200 hover:bg-red-800 tracking-wide"
                >
                  Confirm
                </button>
              </div>
            </div>
          ) : (
            /* View Mode */
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  {ticket.type ? (
                    <span className={`${typeInfo[ticket.type].color} font-mono uppercase tracking-wide`}>
                      {typeInfo[ticket.type].icon} {ticket.type.toUpperCase()}
                    </span>
                  ) : (
                    <span className={`${typeInfo[TicketType.TASK].color} font-mono uppercase tracking-wide`}>
                      {typeInfo[TicketType.TASK].icon} TASK
                    </span>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-sm ${priorityColor[ticket.priority]} font-bold uppercase text-[10px] tracking-wider`}>
                  {priorityLabel[ticket.priority]}
                </span>
              </div>
              
              <h1 className="text-xl font-bold mb-4 text-gray-200 uppercase">{ticket.title}</h1>
              
              <div className="bg-gray-900 rounded border border-gray-700 p-3 mb-4 whitespace-pre-wrap text-gray-300 font-mono text-sm">
                {ticket.description || 'NO DESCRIPTION PROVIDED.'}
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="border border-gray-700 p-2 bg-gray-900 rounded">
                  <h3 className="text-xs font-bold text-gray-400 mb-1 uppercase">Current Status</h3>
                  <p className="text-gray-200 font-mono uppercase">{ticket.status.replace('_', ' ')}</p>
                </div>
                
                <div className="border border-gray-700 p-2 bg-gray-900 rounded">
                  <h3 className="text-xs font-bold text-gray-400 mb-1 uppercase">Work Units</h3>
                  <p className="text-gray-200 font-mono">{ticket.storyPoints || 'NOT SPECIFIED'}</p>
                </div>
                
                <div className="border border-gray-700 p-2 bg-gray-900 rounded">
                  <h3 className="text-xs font-bold text-gray-400 mb-1 uppercase">Assigned Labor</h3>
                  {ticket.assignee ? (
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded bg-red-900 border border-red-700 flex items-center justify-center text-gray-200 text-xs mr-2 font-mono">
                        {ticket.assignee.name.charAt(0)}
                      </div>
                      <span className="text-gray-200 font-mono uppercase">{ticket.assignee.name}</span>
                    </div>
                  ) : (
                    <p className="text-red-400 font-mono">UNASSIGNED</p>
                  )}
                </div>
                
                <div className="border border-gray-700 p-2 bg-gray-900 rounded">
                  <h3 className="text-xs font-bold text-gray-400 mb-1 uppercase">Directive Source</h3>
                  {ticket.creator ? (
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded bg-red-900 border border-red-700 flex items-center justify-center text-gray-200 text-xs mr-2 font-mono">
                        {ticket.creator.name.charAt(0)}
                      </div>
                      <span className="text-gray-200 font-mono uppercase">{ticket.creator.name}</span>
                    </div>
                  ) : (
                    <p className="text-gray-500 font-mono">UNKNOWN</p>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-2 mb-6">
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-sm font-bold text-gray-300 hover:bg-gray-700 uppercase tracking-wide"
                >
                  Modify
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-900 border border-red-700 rounded text-sm font-bold text-gray-200 hover:bg-red-800 uppercase tracking-wide"
                >
                  Terminate
                </button>
              </div>
              
              <div className="text-xs text-gray-400 mb-6 font-mono border-t border-gray-700 pt-4">
                <p>CREATED: {formatDate(ticket.createdAt)}</p>
                <p>UPDATED: {formatDate(ticket.updatedAt)}</p>
              </div>
            </div>
          )}
          
          {/* Comments Section */}
          <div className="border-t border-gray-700 pt-4 mt-4">
            <h3 className="text-lg font-bold uppercase tracking-wide text-gray-300 mb-4 flex items-center">
              <span className="mr-2">📟</span>Communication Log
            </h3>
            <CommentSection ticketId={ticket.id} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailsSidebar;