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
    e.currentTarget.classList.add('bg-blue-50');
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-blue-50');
  };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-50');
    
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
    [TicketStatus.TODO]: 'bg-gray-100',
    [TicketStatus.IN_PROGRESS]: 'bg-blue-50',
    [TicketStatus.REVIEW]: 'bg-yellow-50',
    [TicketStatus.DONE]: 'bg-green-50',
    [TicketStatus.BACKLOG]: 'bg-gray-50'
  };
  
  return (
    <div 
      className={`${widthClass} min-w-[250px] mx-2 rounded-md ${columnColors[status]} flex flex-col`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-medium">{title}</h3>
        <span className="bg-gray-200 text-gray-700 rounded-full text-xs px-2 py-1">
          {tickets.length}
        </span>
      </div>
      
      <div className="flex-1 p-2 overflow-y-auto">
        {tickets.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">
            No tickets
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