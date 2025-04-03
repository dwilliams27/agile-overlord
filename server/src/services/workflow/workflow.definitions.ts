import { v4 as uuidv4 } from 'uuid';
import {
  WorkflowDefinition,
  WorkflowState,
  WorkflowType,
  WorkflowTrigger
} from './workflow.types';

/**
 * Create the default workflow definitions for the system
 */
export function createDefaultWorkflowDefinitions(): WorkflowDefinition[] {
  return [
    createTicketResolutionWorkflow(),
    createCodeReviewWorkflow(),
    createBugInvestigationWorkflow()
  ];
}

/**
 * Create the ticket resolution workflow definition
 */
function createTicketResolutionWorkflow(): WorkflowDefinition {
  return {
    id: 'ticket-resolution-workflow',
    name: 'Ticket Resolution Workflow',
    description: 'Standard workflow for resolving tickets',
    type: WorkflowType.TICKET_RESOLUTION,
    initialState: WorkflowState.ANALYSIS,
    finalStates: [WorkflowState.COMPLETED, WorkflowState.FAILED],
    requiredCapabilities: ['ticketResolution'],
    
    // Define actions for each state
    stateActions: {
      [WorkflowState.ANALYSIS]: ['analyze-ticket'],
      [WorkflowState.PLANNING]: ['create-implementation-plan'],
      [WorkflowState.IMPLEMENTATION]: ['implement-solution'],
      [WorkflowState.TESTING]: ['test-implementation'],
      [WorkflowState.REVIEW]: ['create-review-artifacts'],
      [WorkflowState.COMPLETED]: ['notify-completion']
    },
    
    // Define allowed transitions between states
    transitions: [
      // Analysis transitions
      {
        fromState: WorkflowState.ANALYSIS,
        toState: WorkflowState.PLANNING,
        trigger: WorkflowTrigger.STATE_COMPLETED
      },
      {
        fromState: WorkflowState.ANALYSIS,
        toState: WorkflowState.FAILED,
        trigger: WorkflowTrigger.STATE_COMPLETED,
        conditions: [context => context.stateData[WorkflowState.ANALYSIS]?.analysisSuccess === false]
      },
      
      // Planning transitions
      {
        fromState: WorkflowState.PLANNING,
        toState: WorkflowState.IMPLEMENTATION,
        trigger: WorkflowTrigger.STATE_COMPLETED
      },
      {
        fromState: WorkflowState.PLANNING,
        toState: WorkflowState.FAILED,
        trigger: WorkflowTrigger.STATE_COMPLETED,
        conditions: [context => context.stateData[WorkflowState.PLANNING]?.planSuccess === false]
      },
      
      // Implementation transitions
      {
        fromState: WorkflowState.IMPLEMENTATION,
        toState: WorkflowState.TESTING,
        trigger: WorkflowTrigger.STATE_COMPLETED
      },
      {
        fromState: WorkflowState.IMPLEMENTATION,
        toState: WorkflowState.FAILED,
        trigger: WorkflowTrigger.STATE_COMPLETED,
        conditions: [context => context.stateData[WorkflowState.IMPLEMENTATION]?.implementationSuccess === false]
      },
      
      // Testing transitions
      {
        fromState: WorkflowState.TESTING,
        toState: WorkflowState.REVIEW,
        trigger: WorkflowTrigger.STATE_COMPLETED
      },
      {
        fromState: WorkflowState.TESTING,
        toState: WorkflowState.IMPLEMENTATION,
        trigger: WorkflowTrigger.STATE_COMPLETED,
        conditions: [context => context.stateData[WorkflowState.TESTING]?.testsPassed === false]
      },
      {
        fromState: WorkflowState.TESTING,
        toState: WorkflowState.FAILED,
        trigger: WorkflowTrigger.STATE_COMPLETED,
        conditions: [context => context.stateData[WorkflowState.TESTING]?.testingSuccess === false]
      },
      
      // Review transitions
      {
        fromState: WorkflowState.REVIEW,
        toState: WorkflowState.COMPLETED,
        trigger: WorkflowTrigger.STATE_COMPLETED
      },
      {
        fromState: WorkflowState.REVIEW,
        toState: WorkflowState.FAILED,
        trigger: WorkflowTrigger.STATE_COMPLETED,
        conditions: [context => context.stateData[WorkflowState.REVIEW]?.reviewSuccess === false]
      },
      
      // Paused transitions - allow resuming to same state
      {
        fromState: WorkflowState.PAUSED,
        toState: WorkflowState.ANALYSIS,
        trigger: WorkflowTrigger.MANUAL,
        conditions: [context => context.previousState === WorkflowState.ANALYSIS]
      },
      {
        fromState: WorkflowState.PAUSED,
        toState: WorkflowState.PLANNING,
        trigger: WorkflowTrigger.MANUAL,
        conditions: [context => context.previousState === WorkflowState.PLANNING]
      },
      {
        fromState: WorkflowState.PAUSED,
        toState: WorkflowState.IMPLEMENTATION,
        trigger: WorkflowTrigger.MANUAL,
        conditions: [context => context.previousState === WorkflowState.IMPLEMENTATION]
      },
      {
        fromState: WorkflowState.PAUSED,
        toState: WorkflowState.TESTING,
        trigger: WorkflowTrigger.MANUAL,
        conditions: [context => context.previousState === WorkflowState.TESTING]
      },
      {
        fromState: WorkflowState.PAUSED,
        toState: WorkflowState.REVIEW,
        trigger: WorkflowTrigger.MANUAL,
        conditions: [context => context.previousState === WorkflowState.REVIEW]
      },
      
      // Ticket status change transitions
      {
        fromState: WorkflowState.ANALYSIS,
        toState: WorkflowState.PAUSED,
        trigger: WorkflowTrigger.TICKET_STATUS_CHANGED
      },
      {
        fromState: WorkflowState.PLANNING,
        toState: WorkflowState.PAUSED,
        trigger: WorkflowTrigger.TICKET_STATUS_CHANGED
      },
      {
        fromState: WorkflowState.IMPLEMENTATION,
        toState: WorkflowState.PAUSED,
        trigger: WorkflowTrigger.TICKET_STATUS_CHANGED
      },
      {
        fromState: WorkflowState.TESTING,
        toState: WorkflowState.PAUSED,
        trigger: WorkflowTrigger.TICKET_STATUS_CHANGED
      },
      {
        fromState: WorkflowState.REVIEW,
        toState: WorkflowState.PAUSED,
        trigger: WorkflowTrigger.TICKET_STATUS_CHANGED
      }
    ]
  };
}

/**
 * Create the code review workflow definition
 */
function createCodeReviewWorkflow(): WorkflowDefinition {
  return {
    id: 'code-review-workflow',
    name: 'Code Review Workflow',
    description: 'Workflow for reviewing code changes',
    type: WorkflowType.CODE_REVIEW,
    initialState: WorkflowState.ANALYSIS,
    finalStates: [WorkflowState.COMPLETED, WorkflowState.FAILED],
    requiredCapabilities: ['codeReview'],
    
    // Define actions for each state
    stateActions: {
      [WorkflowState.ANALYSIS]: ['analyze-code-changes'],
      [WorkflowState.REVIEW]: ['perform-code-review'],
      [WorkflowState.COMPLETED]: ['submit-review-results']
    },
    
    // Define allowed transitions between states
    transitions: [
      // Analysis transitions
      {
        fromState: WorkflowState.ANALYSIS,
        toState: WorkflowState.REVIEW,
        trigger: WorkflowTrigger.STATE_COMPLETED
      },
      {
        fromState: WorkflowState.ANALYSIS,
        toState: WorkflowState.FAILED,
        trigger: WorkflowTrigger.STATE_COMPLETED,
        conditions: [context => context.stateData[WorkflowState.ANALYSIS]?.analysisSuccess === false]
      },
      
      // Review transitions
      {
        fromState: WorkflowState.REVIEW,
        toState: WorkflowState.COMPLETED,
        trigger: WorkflowTrigger.STATE_COMPLETED
      },
      {
        fromState: WorkflowState.REVIEW,
        toState: WorkflowState.FAILED,
        trigger: WorkflowTrigger.STATE_COMPLETED,
        conditions: [context => context.stateData[WorkflowState.REVIEW]?.reviewSuccess === false]
      },
      
      // Paused transitions
      {
        fromState: WorkflowState.PAUSED,
        toState: WorkflowState.ANALYSIS,
        trigger: WorkflowTrigger.MANUAL,
        conditions: [context => context.previousState === WorkflowState.ANALYSIS]
      },
      {
        fromState: WorkflowState.PAUSED,
        toState: WorkflowState.REVIEW,
        trigger: WorkflowTrigger.MANUAL,
        conditions: [context => context.previousState === WorkflowState.REVIEW]
      },
      
      // Ticket status change transitions
      {
        fromState: WorkflowState.ANALYSIS,
        toState: WorkflowState.PAUSED,
        trigger: WorkflowTrigger.TICKET_STATUS_CHANGED
      },
      {
        fromState: WorkflowState.REVIEW,
        toState: WorkflowState.PAUSED,
        trigger: WorkflowTrigger.TICKET_STATUS_CHANGED
      }
    ]
  };
}

/**
 * Create the bug investigation workflow definition
 */
function createBugInvestigationWorkflow(): WorkflowDefinition {
  return {
    id: 'bug-investigation-workflow',
    name: 'Bug Investigation Workflow',
    description: 'Workflow for investigating and analyzing bugs',
    type: WorkflowType.BUG_INVESTIGATION,
    initialState: WorkflowState.ANALYSIS,
    finalStates: [WorkflowState.COMPLETED, WorkflowState.FAILED],
    requiredCapabilities: ['bugInvestigation'],
    
    // Define actions for each state
    stateActions: {
      [WorkflowState.ANALYSIS]: ['reproduce-bug'],
      [WorkflowState.PLANNING]: ['investigate-root-cause'],
      [WorkflowState.REVIEW]: ['suggest-fix-approach'],
      [WorkflowState.COMPLETED]: ['document-investigation-results']
    },
    
    // Define allowed transitions between states
    transitions: [
      // Analysis transitions
      {
        fromState: WorkflowState.ANALYSIS,
        toState: WorkflowState.PLANNING,
        trigger: WorkflowTrigger.STATE_COMPLETED,
        conditions: [context => context.stateData[WorkflowState.ANALYSIS]?.bugReproduced === true]
      },
      {
        fromState: WorkflowState.ANALYSIS,
        toState: WorkflowState.FAILED,
        trigger: WorkflowTrigger.STATE_COMPLETED,
        conditions: [context => context.stateData[WorkflowState.ANALYSIS]?.bugReproduced === false]
      },
      
      // Planning transitions
      {
        fromState: WorkflowState.PLANNING,
        toState: WorkflowState.REVIEW,
        trigger: WorkflowTrigger.STATE_COMPLETED,
        conditions: [context => context.stateData[WorkflowState.PLANNING]?.rootCauseIdentified === true]
      },
      {
        fromState: WorkflowState.PLANNING,
        toState: WorkflowState.FAILED,
        trigger: WorkflowTrigger.STATE_COMPLETED,
        conditions: [context => context.stateData[WorkflowState.PLANNING]?.rootCauseIdentified === false]
      },
      
      // Review transitions
      {
        fromState: WorkflowState.REVIEW,
        toState: WorkflowState.COMPLETED,
        trigger: WorkflowTrigger.STATE_COMPLETED
      },
      {
        fromState: WorkflowState.REVIEW,
        toState: WorkflowState.FAILED,
        trigger: WorkflowTrigger.STATE_COMPLETED,
        conditions: [context => context.stateData[WorkflowState.REVIEW]?.fixApproachDeveloped === false]
      },
      
      // Paused transitions
      {
        fromState: WorkflowState.PAUSED,
        toState: WorkflowState.ANALYSIS,
        trigger: WorkflowTrigger.MANUAL,
        conditions: [context => context.previousState === WorkflowState.ANALYSIS]
      },
      {
        fromState: WorkflowState.PAUSED,
        toState: WorkflowState.PLANNING,
        trigger: WorkflowTrigger.MANUAL,
        conditions: [context => context.previousState === WorkflowState.PLANNING]
      },
      {
        fromState: WorkflowState.PAUSED,
        toState: WorkflowState.REVIEW,
        trigger: WorkflowTrigger.MANUAL,
        conditions: [context => context.previousState === WorkflowState.REVIEW]
      },
      
      // Ticket status change transitions
      {
        fromState: WorkflowState.ANALYSIS,
        toState: WorkflowState.PAUSED,
        trigger: WorkflowTrigger.TICKET_STATUS_CHANGED
      },
      {
        fromState: WorkflowState.PLANNING,
        toState: WorkflowState.PAUSED,
        trigger: WorkflowTrigger.TICKET_STATUS_CHANGED
      },
      {
        fromState: WorkflowState.REVIEW,
        toState: WorkflowState.PAUSED,
        trigger: WorkflowTrigger.TICKET_STATUS_CHANGED
      }
    ]
  };
}