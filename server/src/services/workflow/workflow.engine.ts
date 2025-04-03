import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger';
import agentLogger from '../../utils/agentLogger';
import WorkflowModel from '../../models/Workflow';
import TicketModel from '../../models/Ticket';
import { Agent } from '../agents/agent';
import { AgentManager } from '../agents/agent.manager';
import {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowState,
  WorkflowContext,
  WorkflowAction,
  WorkflowActionInput,
  WorkflowActionOutput,
  WorkflowType,
  WorkflowTrigger,
  ActionStatus
} from './workflow.types';

/**
 * Workflow Engine handles workflow execution, transitions, and state management
 */
export class WorkflowEngine {
  private definitions: Map<string, WorkflowDefinition>;
  private actions: Map<string, WorkflowAction>;
  private agentManager: AgentManager;
  private executingWorkflows: Set<string>;
  private scheduledExecutions: Map<string, NodeJS.Timeout>;

  constructor(agentManager: AgentManager) {
    this.definitions = new Map();
    this.actions = new Map();
    this.agentManager = agentManager;
    this.executingWorkflows = new Set();
    this.scheduledExecutions = new Map();
  }

  /**
   * Register a workflow definition
   */
  registerWorkflowDefinition(definition: WorkflowDefinition): void {
    this.definitions.set(definition.id, definition);
    logger.info(`Registered workflow definition: ${definition.name} (${definition.id})`);
  }

  /**
   * Register a workflow action
   */
  registerAction(action: WorkflowAction): void {
    this.actions.set(action.id, action);
    logger.info(`Registered workflow action: ${action.name} (${action.id})`);
  }

  /**
   * Get a workflow definition by ID
   */
  getWorkflowDefinition(id: string): WorkflowDefinition | undefined {
    return this.definitions.get(id);
  }

  /**
   * Get all workflow definitions
   */
  getAllWorkflowDefinitions(): WorkflowDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Get a workflow definition by type
   */
  getWorkflowDefinitionByType(type: WorkflowType): WorkflowDefinition | undefined {
    return Array.from(this.definitions.values()).find(def => def.type === type);
  }

  /**
   * Get a workflow action by ID
   */
  getAction(id: string): WorkflowAction | undefined {
    return this.actions.get(id);
  }

  /**
   * Start a new workflow instance
   */
  async startWorkflow(
    definitionId: string,
    ticketId: number,
    agentId: number
  ): Promise<WorkflowInstance | null> {
    try {
      // Check if there's already an active workflow for this ticket and agent
      const existingWorkflow = await WorkflowModel.getActiveByTicketAndAgent(ticketId, agentId);
      if (existingWorkflow) {
        logger.info(`Workflow already exists for ticket ${ticketId} and agent ${agentId}. Returning existing workflow.`);
        return existingWorkflow;
      }
      
      // Get the workflow definition
      const definition = this.getWorkflowDefinition(definitionId);
      if (!definition) {
        logger.error(`Workflow definition ${definitionId} not found`);
        return null;
      }
      
      // Get the ticket
      const ticket = await TicketModel.getById(ticketId);
      if (!ticket) {
        logger.error(`Ticket ${ticketId} not found`);
        return null;
      }
      
      // Get the agent
      const agent = this.agentManager.getAgent(agentId);
      if (!agent) {
        logger.error(`Agent ${agentId} not found`);
        return null;
      }
      
      // Check if agent has required capabilities
      const hasRequiredCapabilities = definition.requiredCapabilities.every(
        cap => agent.capabilities.includes(cap)
      );
      
      if (!hasRequiredCapabilities) {
        logger.error(`Agent ${agentId} doesn't have required capabilities for workflow ${definitionId}`);
        return null;
      }
      
      // Create a new workflow context
      const context: WorkflowContext = {
        ticketId,
        agentId,
        workflowType: definition.type,
        currentState: definition.initialState,
        startedAt: new Date(),
        updatedAt: new Date(),
        actionHistory: [],
        stateData: {},
        metadata: {
          ticketTitle: ticket.title,
          ticketDescription: ticket.description,
          ticketStatus: ticket.status
        }
      };
      
      // Create the workflow instance
      const workflow = await WorkflowModel.create({
        definitionId,
        agentId,
        ticketId,
        status: 'active',
        currentState: definition.initialState,
        context
      });
      
      logger.info(`Started workflow ${workflow.id} for ticket ${ticketId} with agent ${agentId}`);
      
      // Log the agent workflow start in the dedicated agent log
      agentLogger.logWorkflow('started', workflow.id, {
        agentId,
        agentName: agent.name,
        ticketId,
        workflowType: definition.type,
        state: definition.initialState,
        details: {
          workflowName: definition.name,
          initialState: definition.initialState,
          ticketTitle: ticket.title
        }
      });
      
      // Schedule immediate execution
      this.scheduleWorkflowExecution(workflow.id, 0);
      
      return workflow;
    } catch (error) {
      logger.error(`Error starting workflow for ticket ${ticketId}:`, error);
      return null;
    }
  }

  /**
   * Execute the current state of a workflow
   */
  async executeWorkflow(workflowId: string): Promise<WorkflowInstance | null> {
    // Prevent multiple executions of the same workflow
    if (this.executingWorkflows.has(workflowId)) {
      logger.info(`Workflow ${workflowId} is already executing. Skipping.`);
      return null;
    }
    
    this.executingWorkflows.add(workflowId);
    
    try {
      // Get the workflow instance
      const workflow = await WorkflowModel.getById(workflowId);
      if (!workflow) {
        logger.error(`Workflow ${workflowId} not found`);
        this.executingWorkflows.delete(workflowId);
        return null;
      }
      
      // Skip execution if workflow is not active
      if (workflow.status !== 'active') {
        logger.info(`Workflow ${workflowId} is not active. Current status: ${workflow.status}`);
        this.executingWorkflows.delete(workflowId);
        return workflow;
      }
      
      // Get the workflow definition
      const definition = this.getWorkflowDefinition(workflow.definitionId);
      if (!definition) {
        logger.error(`Workflow definition ${workflow.definitionId} not found`);
        this.executingWorkflows.delete(workflowId);
        return null;
      }
      
      // Get actions for the current state
      const stateActionIds = definition.stateActions[workflow.currentState] || [];
      if (stateActionIds.length === 0) {
        logger.info(`No actions defined for state ${workflow.currentState} in workflow ${workflowId}`);
        this.executingWorkflows.delete(workflowId);
        return workflow;
      }
      
      // Get the ticket
      const ticket = await TicketModel.getById(workflow.ticketId);
      if (!ticket) {
        logger.error(`Ticket ${workflow.ticketId} not found`);
        this.executingWorkflows.delete(workflowId);
        return null;
      }
      
      // Get the agent
      const agent = this.agentManager.getAgent(workflow.agentId);
      if (!agent) {
        logger.error(`Agent ${workflow.agentId} not found`);
        this.executingWorkflows.delete(workflowId);
        return null;
      }
      
      logger.info(`Executing workflow ${workflowId} in state ${workflow.currentState} with ${stateActionIds.length} actions`);
      
      // Execute each action for the current state
      let nextState: WorkflowState | undefined = undefined;
      let updatedContext = { ...workflow.context };
      
      for (const actionId of stateActionIds) {
        const action = this.getAction(actionId);
        if (!action) {
          logger.error(`Action ${actionId} not found`);
          continue;
        }
        
        // Prepare the action input
        const actionInput: WorkflowActionInput = {
          ticket,
          agent,
          state: workflow.currentState,
          context: updatedContext
        };
        
        // Add action start to history
        updatedContext = {
          ...updatedContext,
          actionHistory: [
            ...updatedContext.actionHistory,
            {
              actionId,
              timestamp: new Date(),
              state: workflow.currentState,
              status: ActionStatus.IN_PROGRESS
            }
          ]
        };
        
        // Update the workflow context
        await WorkflowModel.update(workflowId, { context: updatedContext });
        
        // Execute the action
        logger.info(`Executing action ${action.name} (${actionId}) for workflow ${workflowId}`);
        
        // Log action start in the dedicated agent log
        agentLogger.logAction('started', workflowId, {
          agentId: agent.id,
          agentName: agent.name,
          ticketId: workflow.ticketId,
          actionId,
          actionName: action.name,
          state: workflow.currentState,
          details: {
            ticketTitle: ticket.title,
            actionDescription: action.description
          }
        });
        
        let actionOutput: WorkflowActionOutput;
        
        try {
          actionOutput = await action.execute(actionInput);
          logger.info(`Action ${action.name} (${actionId}) executed with result: ${actionOutput.success ? 'success' : 'failure'}`);
          
          // Update action history
          const lastActionIndex = updatedContext.actionHistory.length - 1;
          updatedContext.actionHistory[lastActionIndex] = {
            ...updatedContext.actionHistory[lastActionIndex],
            status: actionOutput.success ? ActionStatus.COMPLETED : ActionStatus.FAILED,
            notes: actionOutput.notes
          };
          
          // Store action result in state data
          updatedContext.stateData[workflow.currentState] = {
            ...(updatedContext.stateData[workflow.currentState] || {}),
            [actionId]: actionOutput.result
          };
          
          // Update context with action result
          await WorkflowModel.update(workflowId, { context: updatedContext });
          
          // Log action completion in the dedicated agent log
          agentLogger.logAction(
            actionOutput.success ? 'completed' : 'failed',
            workflowId, 
            {
              agentId: agent.id,
              agentName: agent.name,
              ticketId: workflow.ticketId,
              actionId,
              actionName: action.name,
              state: workflow.currentState,
              result: actionOutput.result,
              details: {
                success: actionOutput.success,
                nextState: actionOutput.nextState,
                notes: actionOutput.notes
              }
            }
          );
          
          // If action specifies next state, use it
          if (actionOutput.nextState) {
            nextState = actionOutput.nextState;
            break; // Stop executing actions if one determines the next state
          }
          
          // If action failed, stop execution
          if (!actionOutput.success) {
            break;
          }
        } catch (error) {
          logger.error(`Error executing action ${action.name} (${actionId}):`, error);
          
          // Update action history with failure
          const lastActionIndex = updatedContext.actionHistory.length - 1;
          updatedContext.actionHistory[lastActionIndex] = {
            ...updatedContext.actionHistory[lastActionIndex],
            status: ActionStatus.FAILED,
            notes: `Error: ${error.message}`
          };
          
          // Update context with error
          await WorkflowModel.update(workflowId, { context: updatedContext });
          
          // Log action failure in the dedicated agent log
          agentLogger.logAction('failed', workflowId, {
            agentId: agent.id,
            agentName: agent.name,
            ticketId: workflow.ticketId,
            actionId,
            actionName: action.name,
            state: workflow.currentState,
            error: error.message,
            details: {
              errorStack: error.stack
            }
          });
          
          break;
        }
      }
      
      // If nextState is defined, transition to it
      if (nextState) {
        logger.info(`Transitioning workflow ${workflowId} from ${workflow.currentState} to ${nextState}`);
        
        const updatedWorkflow = await this.transitionWorkflow(
          workflowId, 
          nextState, 
          WorkflowTrigger.STATE_COMPLETED,
          updatedContext
        );
        
        this.executingWorkflows.delete(workflowId);
        
        // Schedule next execution with slight delay
        if (updatedWorkflow && updatedWorkflow.status === 'active') {
          this.scheduleWorkflowExecution(workflowId, 2000);
        }
        
        return updatedWorkflow;
      }
      
      // If we're in a final state, complete the workflow
      if (definition.finalStates.includes(workflow.currentState)) {
        logger.info(`Workflow ${workflowId} reached final state ${workflow.currentState}`);
        
        const completedWorkflow = await WorkflowModel.update(workflowId, {
          status: 'completed',
          context: updatedContext
        });
        
        // Log workflow completion
        agentLogger.logWorkflow('completed', workflowId, {
          agentId: agent.id,
          agentName: agent.name,
          ticketId: workflow.ticketId,
          workflowType: definition.type,
          state: workflow.currentState,
          details: {
            finalState: workflow.currentState,
            duration: Date.now() - new Date(workflow.createdAt).getTime(),
            statesVisited: updatedContext.actionHistory
              .map(action => action.state)
              .filter((state, index, array) => array.indexOf(state) === index)
          }
        });
        
        this.executingWorkflows.delete(workflowId);
        return completedWorkflow;
      }
      
      // Update workflow with the updated context
      const updatedWorkflow = await WorkflowModel.update(workflowId, {
        context: updatedContext
      });
      
      this.executingWorkflows.delete(workflowId);
      
      // Schedule next execution with delay
      if (updatedWorkflow && updatedWorkflow.status === 'active') {
        this.scheduleWorkflowExecution(workflowId, 5000);
      }
      
      return updatedWorkflow;
    } catch (error) {
      logger.error(`Error executing workflow ${workflowId}:`, error);
      this.executingWorkflows.delete(workflowId);
      return null;
    }
  }

  /**
   * Transition a workflow to a new state
   */
  async transitionWorkflow(
    workflowId: string,
    targetState: WorkflowState,
    trigger: WorkflowTrigger,
    contextUpdates: Partial<WorkflowContext> = {}
  ): Promise<WorkflowInstance | null> {
    try {
      // Get the workflow instance
      const workflow = await WorkflowModel.getById(workflowId);
      if (!workflow) {
        logger.error(`Workflow ${workflowId} not found`);
        return null;
      }
      
      // Get the workflow definition
      const definition = this.getWorkflowDefinition(workflow.definitionId);
      if (!definition) {
        logger.error(`Workflow definition ${workflow.definitionId} not found`);
        return null;
      }
      
      // Find a valid transition
      const validTransition = definition.transitions.find(
        t => t.fromState === workflow.currentState && 
             t.toState === targetState && 
             t.trigger === trigger
      );
      
      if (!validTransition) {
        logger.error(
          `No valid transition found from ${workflow.currentState} to ${targetState} with trigger ${trigger} in workflow ${workflowId}`
        );
        return null;
      }
      
      // Check conditions if they exist
      if (validTransition.conditions && validTransition.conditions.length > 0) {
        const contextToEvaluate = {
          ...workflow.context,
          ...contextUpdates
        };
        
        const allConditionsMet = validTransition.conditions.every(
          condition => condition(contextToEvaluate)
        );
        
        if (!allConditionsMet) {
          logger.error(`Transition conditions not met for workflow ${workflowId}`);
          return null;
        }
      }
      
      // Update the workflow state and context
      const updatedWorkflow = await WorkflowModel.updateState(
        workflowId,
        targetState,
        contextUpdates
      );
      
      if (updatedWorkflow) {
        logger.info(`Transitioned workflow ${workflowId} from ${workflow.currentState} to ${targetState}`);
        
        // Get the agent
        const agent = this.agentManager.getAgent(workflow.agentId);
        
        // Log the state transition in the dedicated agent log
        if (agent) {
          agentLogger.logStateTransition(workflowId, {
            agentId: workflow.agentId,
            agentName: agent.name,
            ticketId: workflow.ticketId,
            fromState: workflow.currentState,
            toState: targetState,
            trigger,
            details: contextUpdates
          });
        }
      }
      
      return updatedWorkflow;
    } catch (error) {
      logger.error(`Error transitioning workflow ${workflowId} to ${targetState}:`, error);
      return null;
    }
  }

  /**
   * Pause a workflow
   */
  async pauseWorkflow(workflowId: string, reason: string): Promise<WorkflowInstance | null> {
    try {
      // Get the workflow instance
      const workflow = await WorkflowModel.getById(workflowId);
      if (!workflow) {
        logger.error(`Workflow ${workflowId} not found`);
        return null;
      }
      
      // Clear any scheduled executions
      if (this.scheduledExecutions.has(workflowId)) {
        clearTimeout(this.scheduledExecutions.get(workflowId)!);
        this.scheduledExecutions.delete(workflowId);
      }
      
      // Update context with pause reason
      const updatedContext = {
        ...workflow.context,
        metadata: {
          ...workflow.context.metadata,
          pauseReason: reason,
          pausedAt: new Date()
        }
      };
      
      // Update workflow status
      const updatedWorkflow = await WorkflowModel.update(workflowId, {
        status: 'paused',
        context: updatedContext
      });
      
      if (updatedWorkflow) {
        logger.info(`Paused workflow ${workflowId} in state ${workflow.currentState}: ${reason}`);
        
        // Get the agent
        const agent = this.agentManager.getAgent(workflow.agentId);
        
        // Log workflow pause
        if (agent) {
          agentLogger.logWorkflow('paused', workflowId, {
            agentId: workflow.agentId,
            agentName: agent.name,
            ticketId: workflow.ticketId,
            workflowType: workflow.context.workflowType,
            state: workflow.currentState,
            details: {
              reason,
              pausedAt: new Date(),
              lastAction: workflow.context.actionHistory.length > 0 
                ? workflow.context.actionHistory[workflow.context.actionHistory.length - 1]
                : null
            }
          });
        }
      }
      
      return updatedWorkflow;
    } catch (error) {
      logger.error(`Error pausing workflow ${workflowId}:`, error);
      return null;
    }
  }

  /**
   * Resume a paused workflow
   */
  async resumeWorkflow(workflowId: string): Promise<WorkflowInstance | null> {
    try {
      // Get the workflow instance
      const workflow = await WorkflowModel.getById(workflowId);
      if (!workflow) {
        logger.error(`Workflow ${workflowId} not found`);
        return null;
      }
      
      if (workflow.status !== 'paused') {
        logger.error(`Cannot resume workflow ${workflowId} that is not paused. Current status: ${workflow.status}`);
        return null;
      }
      
      // Update context to remove pause information
      const updatedContext = {
        ...workflow.context,
        metadata: {
          ...workflow.context.metadata,
          resumedAt: new Date()
        }
      };
      
      delete updatedContext.metadata.pauseReason;
      
      // Update workflow status
      const updatedWorkflow = await WorkflowModel.update(workflowId, {
        status: 'active',
        context: updatedContext
      });
      
      if (updatedWorkflow) {
        logger.info(`Resumed workflow ${workflowId} in state ${workflow.currentState}`);
        
        // Get the agent
        const agent = this.agentManager.getAgent(workflow.agentId);
        
        // Log workflow resume
        if (agent) {
          agentLogger.logWorkflow('resumed', workflowId, {
            agentId: workflow.agentId,
            agentName: agent.name,
            ticketId: workflow.ticketId,
            workflowType: workflow.context.workflowType,
            state: workflow.currentState,
            details: {
              pauseDuration: workflow.context.metadata.pausedAt 
                ? Date.now() - new Date(workflow.context.metadata.pausedAt).getTime() 
                : null,
              resumedAt: new Date()
            }
          });
        }
        
        // Schedule immediate execution
        this.scheduleWorkflowExecution(workflowId, 0);
      }
      
      return updatedWorkflow;
    } catch (error) {
      logger.error(`Error resuming workflow ${workflowId}:`, error);
      return null;
    }
  }

  /**
   * Mark a workflow as failed
   */
  async failWorkflow(workflowId: string, error: Error | string): Promise<WorkflowInstance | null> {
    try {
      // Get the workflow instance
      const workflow = await WorkflowModel.getById(workflowId);
      if (!workflow) {
        logger.error(`Workflow ${workflowId} not found`);
        return null;
      }
      
      // Clear any scheduled executions
      if (this.scheduledExecutions.has(workflowId)) {
        clearTimeout(this.scheduledExecutions.get(workflowId)!);
        this.scheduledExecutions.delete(workflowId);
      }
      
      // Update context with error information
      const updatedContext = {
        ...workflow.context,
        metadata: {
          ...workflow.context.metadata,
          failureReason: error instanceof Error ? error.message : error,
          failureStack: error instanceof Error ? error.stack : undefined,
          failedAt: new Date()
        }
      };
      
      // Update workflow status
      const updatedWorkflow = await WorkflowModel.update(workflowId, {
        status: 'failed',
        context: updatedContext
      });
      
      if (updatedWorkflow) {
        logger.error(`Workflow ${workflowId} in state ${workflow.currentState} failed:`, error);
        
        // Get the agent
        const agent = this.agentManager.getAgent(workflow.agentId);
        
        // Log workflow failure
        if (agent) {
          agentLogger.logWorkflow('failed', workflowId, {
            agentId: workflow.agentId,
            agentName: agent.name,
            ticketId: workflow.ticketId,
            workflowType: workflow.context.workflowType,
            state: workflow.currentState,
            details: {
              error: error instanceof Error ? error.message : error,
              errorStack: error instanceof Error ? error.stack : undefined,
              failedAt: new Date(),
              duration: Date.now() - new Date(workflow.createdAt).getTime(),
              lastAction: workflow.context.actionHistory.length > 0 
                ? workflow.context.actionHistory[workflow.context.actionHistory.length - 1]
                : null
            }
          });
        }
      }
      
      return updatedWorkflow;
    } catch (error) {
      logger.error(`Error marking workflow ${workflowId} as failed:`, error);
      return null;
    }
  }

  /**
   * Schedule a workflow execution with delay
   */
  private scheduleWorkflowExecution(workflowId: string, delayMs: number): void {
    // Clear any existing scheduled execution
    if (this.scheduledExecutions.has(workflowId)) {
      clearTimeout(this.scheduledExecutions.get(workflowId)!);
    }
    
    // Schedule new execution
    const timeout = setTimeout(async () => {
      try {
        await this.executeWorkflow(workflowId);
      } catch (error) {
        logger.error(`Error in scheduled execution of workflow ${workflowId}:`, error);
      } finally {
        this.scheduledExecutions.delete(workflowId);
      }
    }, delayMs);
    
    this.scheduledExecutions.set(workflowId, timeout);
    logger.debug(`Scheduled workflow ${workflowId} execution in ${delayMs}ms`);
  }

  /**
   * Handle ticket status change event
   */
  async handleTicketStatusChange(
    ticketId: number,
    newStatus: string,
    assigneeId?: number | null
  ): Promise<void> {
    try {
      logger.info(`Handling ticket status change for ticket ${ticketId}. New status: ${newStatus}`);
      
      // If the ticket was assigned to an agent and moved to in_progress, start a workflow
      if (newStatus === 'in_progress' && assigneeId !== undefined && assigneeId !== null) {
        const agent = this.agentManager.getAgent(assigneeId);
        
        if (agent && agent.state.isActive) {
          // Find appropriate workflow for ticket resolution
          const workflowDef = this.getWorkflowDefinitionByType(WorkflowType.TICKET_RESOLUTION);
          
          if (workflowDef) {
            logger.info(`Starting ticket resolution workflow for ticket ${ticketId} with agent ${assigneeId}`);
            await this.startWorkflow(workflowDef.id, ticketId, assigneeId);
          } else {
            logger.error('No ticket resolution workflow definition found');
          }
        }
      }
      
      // If the ticket status changed to something else, we might need to pause, resume, or complete workflows
      const workflows = await WorkflowModel.getByTicketId(ticketId);
      
      for (const workflow of workflows) {
        if (workflow.status !== 'active' && workflow.status !== 'paused') {
          continue; // Skip completed or failed workflows
        }
        
        const definition = this.getWorkflowDefinition(workflow.definitionId);
        if (!definition) continue;
        
        if (newStatus === 'done' && workflow.status === 'active') {
          // If ticket is done, try to set workflow to completed state
          const completedState = definition.finalStates.find(s => s === WorkflowState.COMPLETED);
          
          if (completedState) {
            await this.transitionWorkflow(
              workflow.id,
              completedState,
              WorkflowTrigger.TICKET_STATUS_CHANGED,
              {
                metadata: {
                  ...workflow.context.metadata,
                  ticketStatus: newStatus,
                  completedViaTicketStatusChange: true
                }
              }
            );
          }
        } else if (newStatus === 'in_progress' && workflow.status === 'paused') {
          // Resume paused workflow if ticket is back in progress
          await this.resumeWorkflow(workflow.id);
        } else if (newStatus !== 'in_progress' && workflow.status === 'active') {
          // Pause active workflow if ticket is not in progress
          await this.pauseWorkflow(
            workflow.id,
            `Ticket status changed to ${newStatus}`
          );
        }
      }
    } catch (error) {
      logger.error(`Error handling ticket status change for ticket ${ticketId}:`, error);
    }
  }

  /**
   * Shutdown the workflow engine
   */
  shutdown(): void {
    // Clear all scheduled executions
    for (const timeout of this.scheduledExecutions.values()) {
      clearTimeout(timeout);
    }
    
    this.scheduledExecutions.clear();
    this.executingWorkflows.clear();
    
    logger.info('Workflow engine shut down');
  }
}