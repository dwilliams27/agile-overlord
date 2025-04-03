import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Agent logger for tracking all agent-related activities
 * This includes workflow actions, state transitions, and other agent activities
 */
const agentLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'agent-service' },
  transports: [
    // Write to agents.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'agents.log'),
      level: 'info'
    }),
    // Write error logs to agents-error.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'agents-error.log'), 
      level: 'error' 
    }),
  ],
});

// If not in production, also log to console
if (process.env.NODE_ENV !== 'production') {
  agentLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// Helper functions for different types of agent logging

/**
 * Log a workflow event
 */
export function logWorkflow(
  eventType: 'started' | 'completed' | 'paused' | 'resumed' | 'failed',
  workflowId: string,
  data: {
    agentId: number;
    agentName: string;
    ticketId: number;
    workflowType: string;
    state?: string;
    details?: any;
  }
) {
  agentLogger.info(`Workflow ${eventType}`, {
    eventType: `workflow:${eventType}`,
    workflowId,
    ...data
  });
}

/**
 * Log a workflow state transition
 */
export function logStateTransition(
  workflowId: string,
  data: {
    agentId: number;
    agentName: string;
    ticketId: number;
    fromState: string;
    toState: string;
    trigger: string;
    details?: any;
  }
) {
  agentLogger.info(`State transition`, {
    eventType: 'workflow:state_transition',
    workflowId,
    ...data
  });
}

/**
 * Log an action execution
 */
export function logAction(
  actionStatus: 'started' | 'completed' | 'failed',
  workflowId: string,
  data: {
    agentId: number;
    agentName: string;
    ticketId: number;
    actionId: string;
    actionName: string;
    state: string;
    details?: any;
    result?: any;
    error?: any;
  }
) {
  if (actionStatus === 'failed' && data.error) {
    agentLogger.error(`Action ${actionStatus}`, {
      eventType: `action:${actionStatus}`,
      workflowId,
      ...data
    });
  } else {
    agentLogger.info(`Action ${actionStatus}`, {
      eventType: `action:${actionStatus}`,
      workflowId,
      ...data
    });
  }
}

/**
 * Log an agent activity outside of workflows
 */
export function logAgentActivity(
  activityType: string,
  data: {
    agentId: number;
    agentName: string;
    details?: any;
    [key: string]: any;
  }
) {
  agentLogger.info(`Agent activity: ${activityType}`, {
    eventType: `agent:${activityType}`,
    ...data
  });
}

export default {
  logWorkflow,
  logStateTransition,
  logAction,
  logAgentActivity
};