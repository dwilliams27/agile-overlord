import React, { useEffect, useState } from 'react';
import { useTaskLord, TicketStatus } from '../../contexts/TaskLordContext';
import KanbanColumn from './KanbanColumn';
import TicketDetailsSidebar from './TicketDetailsSidebar';

const BoardView: React.FC = () => {
  const { board, fetchBoard, selectedTicket, setSelectedTicket } = useTaskLord();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadBoard = async () => {
      try {
        await fetchBoard();
      } catch (error) {
        console.error('Error loading board:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadBoard();
  }, [fetchBoard]);
  
  // Calculate dynamic column widths based on whether a ticket is selected
  const columnWidthClass = selectedTicket ? 'w-1/5' : 'w-1/5';
  
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-red-600 border-t-transparent mx-auto"></div>
          <p className="mt-3 text-gray-400 font-mono uppercase tracking-wider">INITIALIZING SYSTEM...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex bg-gray-900">
      <div className={`flex-1 flex overflow-x-auto p-4 ${selectedTicket ? 'pr-0' : ''}`}>
        {/* TODO Column */}
        <KanbanColumn 
          title="AWAITING ASSIGNMENT" 
          tickets={board[TicketStatus.TODO]} 
          status={TicketStatus.TODO}
          widthClass={columnWidthClass}
        />
        
        {/* IN PROGRESS Column */}
        <KanbanColumn 
          title="UNDER EXECUTION" 
          tickets={board[TicketStatus.IN_PROGRESS]} 
          status={TicketStatus.IN_PROGRESS}
          widthClass={columnWidthClass}
        />
        
        {/* REVIEW Column */}
        <KanbanColumn 
          title="PENDING INSPECTION" 
          tickets={board[TicketStatus.REVIEW]} 
          status={TicketStatus.REVIEW}
          widthClass={columnWidthClass}
        />
        
        {/* DONE Column */}
        <KanbanColumn 
          title="DIRECTIVE COMPLETED" 
          tickets={board[TicketStatus.DONE]} 
          status={TicketStatus.DONE}
          widthClass={columnWidthClass}
        />
        
        {/* BACKLOG Column */}
        <KanbanColumn 
          title="LOW PRIORITY QUEUE" 
          tickets={board[TicketStatus.BACKLOG]} 
          status={TicketStatus.BACKLOG}
          widthClass={columnWidthClass}
        />
      </div>
      
      {/* Ticket Details Sidebar */}
      {selectedTicket && (
        <div className="w-1/3 border-l border-gray-700 bg-gray-800 overflow-auto shadow-xl">
          <TicketDetailsSidebar 
            ticket={selectedTicket}
            onClose={() => setSelectedTicket(null)}
          />
        </div>
      )}
    </div>
  );
};

export default BoardView;