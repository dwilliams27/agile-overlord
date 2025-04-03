import React from 'react';
import { Ticket, TicketStatus, useTaskLord } from '../../contexts/TaskLordContext';
import TicketCard from './TicketCard';

interface KanbanColumnProps {
  title: string;
  tickets: Ticket[];
  status: TicketStatus;
  widthClass: string;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, tickets, status, widthClass }) => {
  const { updateTicketStatus, setSelectedTicket } = useTaskLord();
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-red-900/20');
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-red-900/20');
  };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-red-900/20');
    
    const ticketId = e.dataTransfer.getData('ticketId');
    if (ticketId) {
      try {
        const updatedTicket = await updateTicketStatus(parseInt(ticketId), status);
        setSelectedTicket(updatedTicket);
      } catch (error) {
        console.error('Error updating ticket status:', error);
      }
    }
  };
  
  const columnColors = {
    [TicketStatus.TODO]: 'bg-gray-800 border-t-red-700',
    [TicketStatus.IN_PROGRESS]: 'bg-gray-800 border-t-yellow-700',
    [TicketStatus.REVIEW]: 'bg-gray-800 border-t-purple-700',
    [TicketStatus.DONE]: 'bg-gray-800 border-t-green-700',
    [TicketStatus.BACKLOG]: 'bg-gray-800 border-t-gray-700'
  };
  
  return (
    <div 
      className={`${widthClass} min-w-[250px] mx-2 rounded border border-gray-700 shadow-md ${columnColors[status]} flex flex-col border-t-4`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-3 border-b border-gray-700 flex justify-between items-center bg-gradient-to-r from-gray-800 to-gray-900">
        <h3 className="font-bold text-gray-300 uppercase tracking-wide text-xs">{title}</h3>
        <span className="bg-gray-900 text-gray-400 rounded text-xs px-2 py-1 border border-gray-700">
          {tickets.length}
        </span>
      </div>
      
      <div className="flex-1 p-2 overflow-y-auto">
        {tickets.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-xs font-mono uppercase">
            No active directives
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map(ticket => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;