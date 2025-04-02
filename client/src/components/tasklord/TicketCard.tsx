import React from 'react';
import { Ticket, TicketType, TicketPriority, useTaskLord } from '../../contexts/TaskLordContext';

interface TicketCardProps {
  ticket: Ticket;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket }) => {
  const { setSelectedTicket } = useTaskLord();
  
  const handleClick = () => {
    setSelectedTicket(ticket);
  };
  
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('ticketId', ticket.id.toString());
  };
  
  // Type icon and color
  const typeInfo = {
    [TicketType.BUG]: { icon: '🐞', color: 'text-red-600' },
    [TicketType.TASK]: { icon: '✓', color: 'text-blue-600' },
    [TicketType.FEATURE]: { icon: '✨', color: 'text-green-600' },
    [TicketType.EPIC]: { icon: '🏆', color: 'text-purple-600' },
    [TicketType.STORY]: { icon: '📖', color: 'text-yellow-600' }
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
  
  return (
    <div
      className="bg-white rounded shadow p-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`${typeInfo[ticket.type].color} text-sm font-medium`}>
          {typeInfo[ticket.type].icon} {ticket.type.charAt(0).toUpperCase() + ticket.type.slice(1)}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded ${priorityColor[ticket.priority]}`}>
          {priorityLabel[ticket.priority]}
        </span>
      </div>
      
      <h4 className="font-medium text-gray-900 mb-1 line-clamp-2">{ticket.title}</h4>
      
      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{ticket.description}</p>
      
      {ticket.storyPoints && (
        <div className="mb-2">
          <span className="bg-gray-200 text-gray-700 rounded-full text-xs px-2 py-0.5">
            {ticket.storyPoints} {ticket.storyPoints === 1 ? 'point' : 'points'}
          </span>
        </div>
      )}
      
      {ticket.assignee && (
        <div className="flex items-center mt-2">
          <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs mr-2">
            {ticket.assignee.name.charAt(0)}
          </div>
          <span className="text-xs text-gray-600 truncate">
            {ticket.assignee.name}
          </span>
        </div>
      )}
    </div>
  );
};

export default TicketCard;