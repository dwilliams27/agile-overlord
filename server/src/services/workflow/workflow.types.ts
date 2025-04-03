import { Agent } from '../agents/agent';
import { Ticket } from '../../models/Ticket';

/**
 * Represents the possible states of a workflow.
 */
export enum WorkflowState {
  PENDING = 'pending',
  ANALYSIS = 'analysis',
  PLANNING = 'planning',
  IMPLEMENTATION = 'implementation',
  TESTING = 'testing',
  REVIEW = 'review',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  FAILED = 'failed'
}

/**
 * Represents the type of workflow.
 */
export enum WorkflowType {
  TICKET_RESOLUTION = 'ticket_resolution',
  CODE_REVIEW = 'code_review',
  BUG_INVESTIGATION = 'bug_investigation'
}

/**
 * Represents a trigger for workflow state transitions.
 */
export enum WorkflowTrigger {
  TICKET_ASSIGNED = 'ticket_assigned',
  TICKET_STATUS_CHANGED = 'ticket_status_changed',
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
  STATE_COMPLETED = 'state_completed',
  EXTERNAL = 'external'
}

/**
 * Represents the status of a workflow action.
 */
export enum ActionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Interface for workflow action inputs.
 */
export interface WorkflowActionInput {
  ticket: Ticket;
  agent: Agent;
  state: WorkflowState;
  context: WorkflowContext;
  [key: string]: any;
}

/**
 * Interface for workflow action outputs.
 */
export interface WorkflowActionOutput {
  success: boolean;
  nextState?: WorkflowState;
  result?: any;
  error?: Error;
  notes?: string;
}

/**
 * Interface for a workflow action that an agent can perform.
 */
export interface WorkflowAction {
  id: string;
  name: string;
  description: string;
  requiredCapabilities: string[];
  execute(input: WorkflowActionInput): Promise<WorkflowActionOutput>;
}

/**
 * Interface for workflow transition conditions.
 */
export interface WorkflowTransition {
  fromState: WorkflowState;
  toState: WorkflowState;
  conditions?: ((context: WorkflowContext) => boolean)[];
  trigger: WorkflowTrigger;
}

/**
 * Interface for workflow context, which stores data across workflow execution.
 */
export interface WorkflowContext {
  ticketId: number;
  agentId: number;
  workflowType: WorkflowType;
  currentState: WorkflowState;
  previousState?: WorkflowState;
  startedAt: Date;
  updatedAt: Date;
  actionHistory: {
    actionId: string;
    timestamp: Date;
    state: WorkflowState;
    status: ActionStatus;
    notes?: string;
  }[];
  stateData: {
    [key in WorkflowState]?: any;
  };
  metadata: {
    [key: string]: any;
  };
}

/**
 * Interface for workflow definition.
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  type: WorkflowType;
  initialState: WorkflowState;
  finalStates: WorkflowState[];
  transitions: WorkflowTransition[];
  stateActions: {
    [key in WorkflowState]?: string[];
  };
  requiredCapabilities: string[];
}

/**
 * Interface for workflow instance.
 */
export interface WorkflowInstance {
  id: string;
  definitionId: string;
  agentId: number;
  ticketId: number;
  context: WorkflowContext;
  status: 'active' | 'paused' | 'completed' | 'failed';
  currentState: WorkflowState;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for the workflow database model.
 */
export interface WorkflowDbModel {
  id: string;
  definition_id: string;
  agent_id: number;
  ticket_id: number;
  status: string;
  current_state: string;
  context: string; // JSON serialized
  created_at: string;
  updated_at: string;
}