import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger';
import { AgentManager } from '../agents/agent.manager';
import { WorkflowEngine } from './workflow.engine';
import WorkflowModel from '../../models/Workflow';
import CommentModel from '../../models/Comment';
import TicketModel, { TicketStatus } from '../../models/Ticket';
import {
  WorkflowDefinition,
  WorkflowState,
  WorkflowType,
  WorkflowTrigger,
  WorkflowAction
} from './workflow.types';
import { createDefaultWorkflowDefinitions } from './workflow.definitions';
import { createDefaultWorkflowActions } from './workflow.actions';

/**
 * WorkflowOrchestrator manages the lifecycle of workflows in the system
 */
export class WorkflowOrchestrator {
  private workflowEngine: WorkflowEngine;
  private agentManager: AgentManager;
  private io: any | null;
  
  constructor(agentManager: AgentManager) {
    this.agentManager = agentManager;
    this.workflowEngine = new WorkflowEngine(agentManager);
    this.io = null;
  }
  
  /**
   * Initialize the workflow orchestrator
   */
  async initialize(): Promise<void> {
    try {
      // Initialize the workflows table
      await WorkflowModel.initTable();
      
      // Register default workflow definitions
      const defaultDefinitions = createDefaultWorkflowDefinitions();
      for (const definition of defaultDefinitions) {
        this.workflowEngine.registerWorkflowDefinition(definition);
      }
      
      // Register default workflow actions
      const defaultActions = createDefaultWorkflowActions(this.agentManager);
      for (const action of defaultActions) {
        this.workflowEngine.registerAction(action);
      }
      
      // Resume active workflows
      await this.resumeActiveWorkflows();
      
      logger.info('Workflow orchestrator initialized');
    } catch (error) {
      logger.error('Error initializing workflow orchestrator:', error);
      throw error;
    }
  }
  
  /**
   * Set Socket.IO instance for real-time communication
   */
  setIO(io: any): void {
    this.io = io;
  }
  
  /**
   * Handle a ticket event
   */
  async handleTicketEvent(
    type: 'created' | 'updated' | 'statusChanged' | 'deleted',
    ticketId: number,
    data: any
  ): Promise<void> {
    try {
      logger.info(`Handling ticket event: ${type} for ticket ${ticketId}`);
      
      switch (type) {
        case 'created':
          // For now, we don't start workflows on ticket creation
          // They are started when assigned and moved to in_progress
          break;
          
        case 'updated':
          // If assignee changed, we might need to start/reassign workflows
          if (data.assigneeId !== undefined) {
            await this.handleAssigneeChange(ticketId, data.assigneeId);
          }
          break;
          
        case 'statusChanged':
          // Handle ticket status change
          await this.workflowEngine.handleTicketStatusChange(
            ticketId, 
            data.status,
            data.assigneeId
          );
          break;
          
        case 'deleted':
          // Clean up workflows for deleted tickets
          await WorkflowModel.deleteByTicketId(ticketId);
          break;
      }
    } catch (error) {
      logger.error(`Error handling ticket event ${type} for ticket ${ticketId}:`, error);
    }
  }
  
  /**
   * Handle assignee change for a ticket
   */
  private async handleAssigneeChange(ticketId: number, newAssigneeId: number | null): Promise<void> {
    try {
      // Get the ticket to check its status
      const ticket = await TicketModel.getById(ticketId);
      if (!ticket) {
        logger.error(`Ticket ${ticketId} not found`);
        return;
      }
      
      // Get current workflows for this ticket
      const currentWorkflows = await WorkflowModel.getByTicketId(ticketId);
      
      // If assigned to an AI agent and ticket is in progress, start a workflow
      if (newAssigneeId !== null && ticket.status === TicketStatus.IN_PROGRESS) {
        const agent = this.agentManager.getAgent(newAssigneeId);
        
        if (agent && agent.state.isActive) {
          // Check if there's already a workflow for this agent
          const existingWorkflow = currentWorkflows.find(w => 
            w.agentId === newAssigneeId && 
            (w.status === 'active' || w.status === 'paused')
          );
          
          if (!existingWorkflow) {
            // Find appropriate workflow for ticket resolution
            const workflowDef = this.workflowEngine.getWorkflowDefinitionByType(WorkflowType.TICKET_RESOLUTION);
            
            if (workflowDef) {
              logger.info(`Starting ticket resolution workflow for ticket ${ticketId} with agent ${newAssigneeId}`);
              await this.workflowEngine.startWorkflow(workflowDef.id, ticketId, newAssigneeId);
              
              // Add a comment to the ticket indicating the agent is working on it
              await CommentModel.create({
                ticketId,
                userId: newAssigneeId,
                content: 'I have been assigned to work on this ticket and will begin analysis shortly.'
              });
            }
          } else if (existingWorkflow.status === 'paused') {
            // Resume paused workflow
            await this.workflowEngine.resumeWorkflow(existingWorkflow.id);
          }
        }
      }
      
      // Pause workflows for agents no longer assigned to the ticket
      for (const workflow of currentWorkflows) {
        if (workflow.agentId !== newAssigneeId && workflow.status === 'active') {
          await this.workflowEngine.pauseWorkflow(
            workflow.id,
            'Agent no longer assigned to ticket'
          );
          
          // Add a comment to the ticket
          await CommentModel.create({
            ticketId,
            userId: workflow.agentId,
            content: 'I have been unassigned from this ticket. Pausing my work.'
          });
        }
      }
    } catch (error) {
      logger.error(`Error handling assignee change for ticket ${ticketId}:`, error);
    }
  }
  
  /**
   * Resume active workflows after restart
   */
  private async resumeActiveWorkflows(): Promise<void> {
    try {
      const activeWorkflows = await WorkflowModel.getAll();
      const activeCount = activeWorkflows.filter(w => w.status === 'active').length;
      const pausedCount = activeWorkflows.filter(w => w.status === 'paused').length;
      
      logger.info(`Found ${activeWorkflows.length} existing workflows. Active: ${activeCount}, Paused: ${pausedCount}`);
      
      // Resume active workflows with a slight delay between each
      for (const workflow of activeWorkflows) {
        if (workflow.status === 'active') {
          const ticket = await TicketModel.getById(workflow.ticketId);
          if (!ticket) {
            logger.warn(`Ticket ${workflow.ticketId} not found for workflow ${workflow.id}. Marking as failed.`);
            await this.workflowEngine.failWorkflow(workflow.id, 'Ticket not found');
            continue;
          }
          
          const agent = this.agentManager.getAgent(workflow.agentId);
          if (!agent) {
            logger.warn(`Agent ${workflow.agentId} not found for workflow ${workflow.id}. Marking as failed.`);
            await this.workflowEngine.failWorkflow(workflow.id, 'Agent not found');
            continue;
          }
          
          // Only resume if ticket is still in progress and assigned to the agent
          if (ticket.status === TicketStatus.IN_PROGRESS && ticket.assigneeId === workflow.agentId) {
            logger.info(`Resuming active workflow ${workflow.id} for ticket ${workflow.ticketId}`);
            // Let the workflow engine handle execution
            setTimeout(() => {
              this.workflowEngine.executeWorkflow(workflow.id);
            }, 1000);
          } else {
            // Pause workflow if ticket is not in progress or agent is not assigned
            logger.info(`Pausing workflow ${workflow.id} as ticket status or assignee changed`);
            await this.workflowEngine.pauseWorkflow(
              workflow.id,
              `Ticket status (${ticket.status}) or assignee (${ticket.assigneeId}) changed`
            );
          }
        }
      }
    } catch (error) {
      logger.error('Error resuming active workflows:', error);
    }
  }
  
  /**
   * Register a custom workflow definition
   */
  registerWorkflowDefinition(definition: WorkflowDefinition): void {
    this.workflowEngine.registerWorkflowDefinition(definition);
  }
  
  /**
   * Register a custom workflow action
   */
  registerWorkflowAction(action: WorkflowAction): void {
    this.workflowEngine.registerAction(action);
  }
  
  /**
   * Get workflow engine instance
   */
  getWorkflowEngine(): WorkflowEngine {
    return this.workflowEngine;
  }
  
  /**
   * Shutdown the workflow orchestrator
   */
  shutdown(): void {
    this.workflowEngine.shutdown();
    logger.info('Workflow orchestrator shut down');
  }
}