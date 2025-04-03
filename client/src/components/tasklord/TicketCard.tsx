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
    [TicketType.BUG]: { icon: '⚠️', color: 'text-red-500' },
    [TicketType.TASK]: { icon: '⚙️', color: 'text-gray-400' },
    [TicketType.FEATURE]: { icon: '🔧', color: 'text-gray-300' },
    [TicketType.EPIC]: { icon: '⚔️', color: 'text-red-400' },
    [TicketType.STORY]: { icon: '📜', color: 'text-gray-400' }
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
  
  // Default to TASK if type is undefined
  const ticketType = ticket.type || TicketType.TASK;

  return (
    <div
      className="bg-gray-900 rounded border border-gray-700 p-3 cursor-pointer hover:bg-gray-800 transition-colors shadow-md"
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`${typeInfo[ticketType].color} text-xs font-mono uppercase tracking-wide`}>
          {typeInfo[ticketType].icon} {ticketType.toUpperCase()}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-sm ${priorityColor[ticket.priority]} font-bold uppercase text-[10px] tracking-wider`}>
          {priorityLabel[ticket.priority]}
        </span>
      </div>
      
      <h4 className="font-medium text-gray-200 mb-1 line-clamp-2 text-sm uppercase">{ticket.title}</h4>
      
      <p className="text-gray-400 text-xs mb-3 line-clamp-2 font-mono">{ticket.description}</p>
      
      {ticket.storyPoints && (
        <div className="mb-2">
          <span className="bg-gray-800 text-gray-400 border border-gray-700 rounded-sm text-xs px-2 py-0.5 font-mono">
            {ticket.storyPoints} {ticket.storyPoints === 1 ? 'UNIT' : 'UNITS'}
          </span>
        </div>
      )}
      
      {ticket.assignee && (
        <div className="flex items-center mt-2 border-t border-gray-800 pt-2">
          <div className="w-5 h-5 rounded bg-red-900 border border-red-700 flex items-center justify-center text-gray-300 text-xs mr-2 font-mono">
            {ticket.assignee.name.charAt(0)}
          </div>
          <span className="text-xs text-gray-400 truncate font-mono uppercase">
            {ticket.assignee.name}
          </span>
        </div>
      )}
    </div>
  );
};

export default TicketCard;