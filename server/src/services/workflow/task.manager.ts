import logger from '../../utils/logger';
import agentLogger from '../../utils/agentLogger';
import { AgentManager } from '../agents/agent.manager';
import TicketModel, { TicketStatus } from '../../models/Ticket';
import CommentModel from '../../models/Comment';
import { TaskWorkflow } from './task.workflow';

/**
 * Manager for handling task-based workflows
 */
export class TaskManager {
  private agentManager: AgentManager;
  private activeWorkflows: Map<number, TaskWorkflow>; // Map of ticketId to workflow
  
  constructor(agentManager: AgentManager) {
    this.agentManager = agentManager;
    this.activeWorkflows = new Map();
  }
  
  /**
   * Handle ticket assignment to an agent
   */
  async handleTicketAssignment(ticketId: number, agentId: number): Promise<void> {
    try {
      // Check if the ticket exists
      const ticket = await TicketModel.getById(ticketId);
      if (!ticket) {
        logger.error(`Ticket ${ticketId} not found`);
        return;
      }
      
      // Check if the agent exists
      const agent = this.agentManager.getAgent(agentId);
      if (!agent) {
        logger.error(`Agent ${agentId} not found`);
        return;
      }
      
      // If the ticket is in progress, start a workflow
      if (ticket.status === TicketStatus.IN_PROGRESS) {
        // Check if there's already a workflow for this ticket
        if (this.activeWorkflows.has(ticketId)) {
          logger.info(`Workflow already exists for ticket ${ticketId}. Skipping.`);
          return;
        }
        
        // Create a new workflow
        const workflow = new TaskWorkflow(agent, ticket);
        
        // Store the workflow
        this.activeWorkflows.set(ticketId, workflow);
        
        // Log the workflow creation
        agentLogger.logAgentActivity('task_workflow_created', {
          agentId,
          agentName: agent.name,
          ticketId,
          details: {
            ticketTitle: ticket.title,
            ticketStatus: ticket.status
          }
        });
        
        // Start the workflow asynchronously
        this.executeWorkflowAsync(workflow, ticketId);
      }
    } catch (error) {
      logger.error(`Error handling ticket assignment for ticket ${ticketId}:`, error);
    }
  }
  
  /**
   * Handle ticket status change
   */
  async handleTicketStatusChange(ticketId: number, newStatus: string): Promise<void> {
    try {
      // Check if we have an active workflow for this ticket
      if (!this.activeWorkflows.has(ticketId)) {
        // If the status is now in_progress and ticket is assigned to an AI agent,
        // we should start a workflow
        const ticket = await TicketModel.getById(ticketId);
        if (!ticket) {
          logger.error(`Ticket ${ticketId} not found`);
          return;
        }
        
        if (newStatus === TicketStatus.IN_PROGRESS && ticket.assigneeId) {
          const agent = this.agentManager.getAgent(ticket.assigneeId);
          if (agent) {
            // Start a new workflow
            await this.handleTicketAssignment(ticketId, ticket.assigneeId);
          }
        }
        
        return;
      }
      
      // If the status changed to a non-in-progress status, we should pause or end the workflow
      if (newStatus !== TicketStatus.IN_PROGRESS) {
        // If done, we can remove the workflow
        if (newStatus === TicketStatus.DONE) {
          logger.info(`Ticket ${ticketId} is done. Removing workflow.`);
          this.activeWorkflows.delete(ticketId);
        }
        // For other statuses, we'll keep the workflow in memory for now
        // In a production system, we would persist workflow state to allow resuming
      }
    } catch (error) {
      logger.error(`Error handling ticket status change for ticket ${ticketId}:`, error);
    }
  }
  
  /**
   * Execute a workflow asynchronously
   */
  private async executeWorkflowAsync(workflow: TaskWorkflow, ticketId: number): Promise<void> {
    try {
      // Execute the workflow
      await workflow.execute();
      
      // Remove the workflow from active workflows if it's completed
      const taskState = workflow.getTaskState();
      if (taskState.status === 'completed' || taskState.status === 'failed') {
        this.activeWorkflows.delete(ticketId);
        
        logger.info(`Workflow for ticket ${ticketId} has ${taskState.status}. Removing from active workflows.`);
      }
    } catch (error) {
      logger.error(`Error executing workflow for ticket ${ticketId}:`, error);
      
      // Remove the workflow from active workflows on error
      this.activeWorkflows.delete(ticketId);
    }
  }
  
  /**
   * Get all active workflows
   */
  getActiveWorkflows(): Map<number, TaskWorkflow> {
    return this.activeWorkflows;
  }
  
  /**
   * Get a workflow for a specific ticket
   */
  getWorkflow(ticketId: number): TaskWorkflow | undefined {
    return this.activeWorkflows.get(ticketId);
  }
}