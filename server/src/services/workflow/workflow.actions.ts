import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger';
import CommentModel from '../../models/Comment';
import TicketModel, { TicketStatus } from '../../models/Ticket';
import { AgentManager } from '../agents/agent.manager';
import {
  WorkflowAction,
  WorkflowActionInput,
  WorkflowActionOutput,
  WorkflowState,
  ActionStatus
} from './workflow.types';

/**
 * Create the default workflow actions for the system
 */
export function createDefaultWorkflowActions(agentManager: AgentManager): WorkflowAction[] {
  return [
    // Ticket Resolution Actions
    createAnalyzeTicketAction(agentManager),
    createImplementationPlanAction(agentManager),
    createImplementSolutionAction(agentManager),
    createTestImplementationAction(agentManager),
    createReviewArtifactsAction(agentManager),
    createNotifyCompletionAction(agentManager),
    
    // Code Review Actions
    createAnalyzeCodeChangesAction(agentManager),
    createPerformCodeReviewAction(agentManager),
    createSubmitReviewResultsAction(agentManager),
    
    // Bug Investigation Actions
    createReproduceBugAction(agentManager),
    createInvestigateRootCauseAction(agentManager),
    createSuggestFixApproachAction(agentManager),
    createDocumentInvestigationResultsAction(agentManager)
  ];
}

// ----------------- Ticket Resolution Actions -----------------

/**
 * Create the analyze ticket action
 */
function createAnalyzeTicketAction(agentManager: AgentManager): WorkflowAction {
  return {
    id: 'analyze-ticket',
    name: 'Analyze Ticket',
    description: 'Analyze the ticket to understand requirements and plan approach',
    requiredCapabilities: ['ticketResolution'],
    
    async execute(input: WorkflowActionInput): Promise<WorkflowActionOutput> {
      const { ticket, agent, context } = input;
      
      try {
        logger.info(`Agent ${agent.name} analyzing ticket ${ticket.id}: ${ticket.title}`);
        
        // In a real implementation, the agent would use LLM to analyze the ticket
        // For now, we'll simulate the analysis
        
        // Add a comment to the ticket
        await CommentModel.create({
          ticketId: ticket.id,
          userId: agent.id,
          content: `I've started analyzing this ticket. I'm reviewing the requirements and will come up with an implementation plan.`
        });
        
        // Simulate some analysis delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Success result
        return {
          success: true,
          nextState: WorkflowState.PLANNING,
          result: {
            analysisSuccess: true,
            analysisNotes: 'Ticket requirements understood',
            estimatedComplexity: 'medium',
            ticketType: ticket.type || 'task'
          },
          notes: 'Completed ticket analysis successfully'
        };
      } catch (error) {
        logger.error(`Error in analyze ticket action for ticket ${ticket.id}:`, error);
        
        // Failure result
        return {
          success: false,
          result: {
            analysisSuccess: false,
            error: error.message
          },
          error: error,
          notes: `Failed to analyze ticket: ${error.message}`
        };
      }
    }
  };
}

/**
 * Create the implementation plan action
 */
function createImplementationPlanAction(agentManager: AgentManager): WorkflowAction {
  return {
    id: 'create-implementation-plan',
    name: 'Create Implementation Plan',
    description: 'Create a plan for implementing the solution',
    requiredCapabilities: ['ticketResolution'],
    
    async execute(input: WorkflowActionInput): Promise<WorkflowActionOutput> {
      const { ticket, agent, context } = input;
      
      try {
        logger.info(`Agent ${agent.name} creating implementation plan for ticket ${ticket.id}`);
        
        // Get analysis results from previous state
        const analysisResults = context.stateData[WorkflowState.ANALYSIS] || {};
        
        // Add a comment to the ticket
        await CommentModel.create({
          ticketId: ticket.id,
          userId: agent.id,
          content: `I've analyzed the requirements and I'm creating an implementation plan. This appears to be a ${analysisResults.estimatedComplexity || 'medium'} complexity task.`
        });
        
        // Simulate some planning delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Success result
        return {
          success: true,
          nextState: WorkflowState.IMPLEMENTATION,
          result: {
            planSuccess: true,
            implementationSteps: [
              'Setup basic structure',
              'Implement core functionality',
              'Add error handling',
              'Write tests'
            ],
            estimatedTimeHours: 4
          },
          notes: 'Created implementation plan successfully'
        };
      } catch (error) {
        logger.error(`Error in create implementation plan action for ticket ${ticket.id}:`, error);
        
        // Failure result
        return {
          success: false,
          result: {
            planSuccess: false,
            error: error.message
          },
          error: error,
          notes: `Failed to create implementation plan: ${error.message}`
        };
      }
    }
  };
}

/**
 * Create the implement solution action
 */
function createImplementSolutionAction(agentManager: AgentManager): WorkflowAction {
  return {
    id: 'implement-solution',
    name: 'Implement Solution',
    description: 'Implement the solution based on the plan',
    requiredCapabilities: ['ticketResolution'],
    
    async execute(input: WorkflowActionInput): Promise<WorkflowActionOutput> {
      const { ticket, agent, context } = input;
      
      try {
        logger.info(`Agent ${agent.name} implementing solution for ticket ${ticket.id}`);
        
        // Get implementation plan from previous state
        const planResults = context.stateData[WorkflowState.PLANNING] || {};
        const steps = planResults.implementationSteps || [];
        
        // Add a comment to the ticket
        await CommentModel.create({
          ticketId: ticket.id,
          userId: agent.id,
          content: `I'm starting implementation work on this ticket. I'll be following these steps:\n\n${steps.map(s => `- ${s}`).join('\n')}`
        });
        
        // Add a second comment after some delay to simulate progress
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        await CommentModel.create({
          ticketId: ticket.id,
          userId: agent.id,
          content: `Implementation in progress. I've completed the first few steps and am working on the remaining ones.`
        });
        
        // Simulate more implementation work
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Success result
        return {
          success: true,
          nextState: WorkflowState.TESTING,
          result: {
            implementationSuccess: true,
            implementedSteps: steps,
            codeChanges: {
              filesModified: 3,
              linesAdded: 120,
              linesRemoved: 45
            }
          },
          notes: 'Implemented solution successfully'
        };
      } catch (error) {
        logger.error(`Error in implement solution action for ticket ${ticket.id}:`, error);
        
        // Failure result
        return {
          success: false,
          result: {
            implementationSuccess: false,
            error: error.message
          },
          error: error,
          notes: `Failed to implement solution: ${error.message}`
        };
      }
    }
  };
}

/**
 * Create the test implementation action
 */
function createTestImplementationAction(agentManager: AgentManager): WorkflowAction {
  return {
    id: 'test-implementation',
    name: 'Test Implementation',
    description: 'Test the implemented solution',
    requiredCapabilities: ['ticketResolution'],
    
    async execute(input: WorkflowActionInput): Promise<WorkflowActionOutput> {
      const { ticket, agent, context } = input;
      
      try {
        logger.info(`Agent ${agent.name} testing implementation for ticket ${ticket.id}`);
        
        // Add a comment to the ticket
        await CommentModel.create({
          ticketId: ticket.id,
          userId: agent.id,
          content: `I've completed the implementation and am now running tests to verify the solution works correctly.`
        });
        
        // Simulate test execution
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Randomly determine if tests pass (for simulation purposes)
        const testsPassed = Math.random() > 0.2; // 80% chance of success
        
        if (testsPassed) {
          await CommentModel.create({
            ticketId: ticket.id,
            userId: agent.id,
            content: `All tests are passing. The implementation meets the requirements.`
          });
          
          // Success result
          return {
            success: true,
            nextState: WorkflowState.REVIEW,
            result: {
              testingSuccess: true,
              testsPassed: true,
              testResults: {
                totalTests: 12,
                passed: 12,
                failed: 0,
                coverage: '87%'
              }
            },
            notes: 'All tests passed successfully'
          };
        } else {
          await CommentModel.create({
            ticketId: ticket.id,
            userId: agent.id,
            content: `I found some issues during testing. I'll need to fix them before proceeding.`
          });
          
          // Tests failed but the action is still successful (we're returning to implementation)
          return {
            success: true,
            nextState: WorkflowState.IMPLEMENTATION,
            result: {
              testingSuccess: true,
              testsPassed: false,
              testResults: {
                totalTests: 12,
                passed: 10,
                failed: 2,
                coverage: '85%'
              },
              issues: [
                'Edge case handling fails when input is empty',
                'Race condition in async operation'
              ]
            },
            notes: 'Testing found issues, returning to implementation'
          };
        }
      } catch (error) {
        logger.error(`Error in test implementation action for ticket ${ticket.id}:`, error);
        
        // Failure result
        return {
          success: false,
          result: {
            testingSuccess: false,
            error: error.message
          },
          error: error,
          notes: `Failed to test implementation: ${error.message}`
        };
      }
    }
  };
}

/**
 * Create the review artifacts action
 */
function createReviewArtifactsAction(agentManager: AgentManager): WorkflowAction {
  return {
    id: 'create-review-artifacts',
    name: 'Create Review Artifacts',
    description: 'Create artifacts for review (PR, documentation, etc.)',
    requiredCapabilities: ['ticketResolution'],
    
    async execute(input: WorkflowActionInput): Promise<WorkflowActionOutput> {
      const { ticket, agent, context } = input;
      
      try {
        logger.info(`Agent ${agent.name} creating review artifacts for ticket ${ticket.id}`);
        
        // Add a comment to the ticket
        await CommentModel.create({
          ticketId: ticket.id,
          userId: agent.id,
          content: `Implementation and testing are complete. I'm preparing a pull request and documentation for review.`
        });
        
        // Simulate PR creation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Update ticket status to review
        await TicketModel.updateStatus(ticket.id, TicketStatus.REVIEW);
        
        // Add a final comment with PR details
        await CommentModel.create({
          ticketId: ticket.id,
          userId: agent.id,
          content: `I've created a pull request for this ticket. The implementation is ready for review.\n\nPR #123: Implement feature X\n\nKey changes:\n- Added new component\n- Updated API endpoints\n- Added unit tests\n\nPlease review when you have time.`
        });
        
        // Success result
        return {
          success: true,
          nextState: WorkflowState.COMPLETED,
          result: {
            reviewSuccess: true,
            artifacts: {
              pullRequestNumber: 123,
              documentationUpdated: true
            }
          },
          notes: 'Created review artifacts successfully'
        };
      } catch (error) {
        logger.error(`Error in create review artifacts action for ticket ${ticket.id}:`, error);
        
        // Failure result
        return {
          success: false,
          result: {
            reviewSuccess: false,
            error: error.message
          },
          error: error,
          notes: `Failed to create review artifacts: ${error.message}`
        };
      }
    }
  };
}

/**
 * Create the notify completion action
 */
function createNotifyCompletionAction(agentManager: AgentManager): WorkflowAction {
  return {
    id: 'notify-completion',
    name: 'Notify Completion',
    description: 'Notify that the workflow has completed',
    requiredCapabilities: ['ticketResolution'],
    
    async execute(input: WorkflowActionInput): Promise<WorkflowActionOutput> {
      const { ticket, agent, context } = input;
      
      try {
        logger.info(`Agent ${agent.name} completing workflow for ticket ${ticket.id}`);
        
        // Add a completion comment to the ticket
        await CommentModel.create({
          ticketId: ticket.id,
          userId: agent.id,
          content: `I've completed work on this ticket. All implementation, testing, and documentation are done. The PR is ready for final review.`
        });
        
        // Update ticket status to done if it's not already
        if (ticket.status !== TicketStatus.DONE) {
          await TicketModel.updateStatus(ticket.id, TicketStatus.DONE);
        }
        
        // Success result
        return {
          success: true,
          result: {
            workflowCompleted: true,
            timeElapsed: context.startedAt instanceof Date 
              ? new Date().getTime() - context.startedAt.getTime() 
              : 'unknown'
          },
          notes: 'Workflow completed successfully'
        };
      } catch (error) {
        logger.error(`Error in notify completion action for ticket ${ticket.id}:`, error);
        
        // Failure result - but we still want to complete the workflow
        return {
          success: true, // Still mark as success to complete the workflow
          result: {
            workflowCompleted: true,
            error: error.message
          },
          notes: `Completed with notification error: ${error.message}`
        };
      }
    }
  };
}

// ----------------- Code Review Actions -----------------

/**
 * Create the analyze code changes action
 */
function createAnalyzeCodeChangesAction(agentManager: AgentManager): WorkflowAction {
  return {
    id: 'analyze-code-changes',
    name: 'Analyze Code Changes',
    description: 'Analyze code changes to understand the scope of the review',
    requiredCapabilities: ['codeReview'],
    
    async execute(input: WorkflowActionInput): Promise<WorkflowActionOutput> {
      const { ticket, agent, context } = input;
      
      try {
        logger.info(`Agent ${agent.name} analyzing code changes for ticket ${ticket.id}`);
        
        // Add a comment to the ticket
        await CommentModel.create({
          ticketId: ticket.id,
          userId: agent.id,
          content: `I'm analyzing the code changes for this ticket to understand what needs to be reviewed.`
        });
        
        // Simulate analysis
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Success result
        return {
          success: true,
          nextState: WorkflowState.REVIEW,
          result: {
            analysisSuccess: true,
            changes: {
              filesChanged: 5,
              linesAdded: 250,
              linesRemoved: 120
            },
            areas: ['UI', 'API', 'Database'],
            complexity: 'medium'
          },
          notes: 'Analyzed code changes successfully'
        };
      } catch (error) {
        logger.error(`Error in analyze code changes action for ticket ${ticket.id}:`, error);
        
        // Failure result
        return {
          success: false,
          result: {
            analysisSuccess: false,
            error: error.message
          },
          error: error,
          notes: `Failed to analyze code changes: ${error.message}`
        };
      }
    }
  };
}

/**
 * Create the perform code review action
 */
function createPerformCodeReviewAction(agentManager: AgentManager): WorkflowAction {
  return {
    id: 'perform-code-review',
    name: 'Perform Code Review',
    description: 'Review the code changes and provide feedback',
    requiredCapabilities: ['codeReview'],
    
    async execute(input: WorkflowActionInput): Promise<WorkflowActionOutput> {
      const { ticket, agent, context } = input;
      
      try {
        logger.info(`Agent ${agent.name} performing code review for ticket ${ticket.id}`);
        
        // Get analysis results from previous state
        const analysisResults = context.stateData[WorkflowState.ANALYSIS] || {};
        
        // Add a comment to the ticket
        await CommentModel.create({
          ticketId: ticket.id,
          userId: agent.id,
          content: `I'm reviewing the code changes across ${analysisResults.changes?.filesChanged || 'multiple'} files. This is a ${analysisResults.complexity || 'medium'} complexity change.`
        });
        
        // Simulate review process
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Add review comments
        await CommentModel.create({
          ticketId: ticket.id,
          userId: agent.id,
          content: `I've completed my review of the code changes. Here's my feedback:

1. The implementation looks solid overall.
2. There are a few minor code style issues that should be fixed.
3. Consider adding more unit tests for the edge cases.
4. The documentation needs to be updated to reflect these changes.

Overall, this is good work but needs some minor adjustments before approval.`
        });
        
        // Success result
        return {
          success: true,
          nextState: WorkflowState.COMPLETED,
          result: {
            reviewSuccess: true,
            feedback: {
              issues: 3,
              suggestions: 2,
              approval: 'conditional'
            }
          },
          notes: 'Completed code review successfully'
        };
      } catch (error) {
        logger.error(`Error in perform code review action for ticket ${ticket.id}:`, error);
        
        // Failure result
        return {
          success: false,
          result: {
            reviewSuccess: false,
            error: error.message
          },
          error: error,
          notes: `Failed to perform code review: ${error.message}`
        };
      }
    }
  };
}

/**
 * Create the submit review results action
 */
function createSubmitReviewResultsAction(agentManager: AgentManager): WorkflowAction {
  return {
    id: 'submit-review-results',
    name: 'Submit Review Results',
    description: 'Submit the results of the code review',
    requiredCapabilities: ['codeReview'],
    
    async execute(input: WorkflowActionInput): Promise<WorkflowActionOutput> {
      const { ticket, agent, context } = input;
      
      try {
        logger.info(`Agent ${agent.name} submitting review results for ticket ${ticket.id}`);
        
        // Get review results from previous state
        const reviewResults = context.stateData[WorkflowState.REVIEW] || {};
        
        // Add a final comment with review summary
        await CommentModel.create({
          ticketId: ticket.id,
          userId: agent.id,
          content: `Review Summary:

${reviewResults.feedback?.approval === 'conditional' ? 'Approved with conditions' : 
  reviewResults.feedback?.approval === 'approved' ? 'Approved' : 'Changes requested'}

${reviewResults.feedback?.issues} issues found
${reviewResults.feedback?.suggestions} suggestions provided

Please address the feedback and let me know when the changes are ready for another review.`
        });
        
        // Update ticket status if needed
        if (ticket.status === TicketStatus.IN_PROGRESS) {
          await TicketModel.updateStatus(ticket.id, TicketStatus.REVIEW);
        }
        
        // Success result
        return {
          success: true,
          result: {
            resultsSubmitted: true,
            reviewCompleted: true
          },
          notes: 'Submitted review results successfully'
        };
      } catch (error) {
        logger.error(`Error in submit review results action for ticket ${ticket.id}:`, error);
        
        // Failure result - but we still want to complete the workflow
        return {
          success: true, // Still mark as success to complete the workflow
          result: {
            resultsSubmitted: true,
            error: error.message
          },
          notes: `Submitted with errors: ${error.message}`
        };
      }
    }
  };
}

// ----------------- Bug Investigation Actions -----------------

/**
 * Create the reproduce bug action
 */
function createReproduceBugAction(agentManager: AgentManager): WorkflowAction {
  return {
    id: 'reproduce-bug',
    name: 'Reproduce Bug',
    description: 'Attempt to reproduce the reported bug',
    requiredCapabilities: ['bugInvestigation'],
    
    async execute(input: WorkflowActionInput): Promise<WorkflowActionOutput> {
      const { ticket, agent, context } = input;
      
      try {
        logger.info(`Agent ${agent.name} attempting to reproduce bug for ticket ${ticket.id}`);
        
        // Add a comment to the ticket
        await CommentModel.create({
          ticketId: ticket.id,
          userId: agent.id,
          content: `I'm working on reproducing the bug described in this ticket. I'll report back with my findings.`
        });
        
        // Simulate bug reproduction attempt
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Randomly determine if bug can be reproduced (for simulation)
        const bugReproduced = Math.random() > 0.1; // 90% chance of reproduction
        
        if (bugReproduced) {
          await CommentModel.create({
            ticketId: ticket.id,
            userId: agent.id,
            content: `I've been able to reproduce the bug. Here are the exact steps to reproduce:

1. Navigate to the user profile page
2. Click on the settings tab
3. Change the email address
4. Click save without filling in the confirmation field

Expected: Error message should show that confirmation is required
Actual: Form submits successfully but email is not updated

I'll continue investigating the root cause.`
          });
          
          // Success result
          return {
            success: true,
            nextState: WorkflowState.PLANNING,
            result: {
              bugReproduced: true,
              reproductionSteps: [
                'Navigate to user profile',
                'Click settings tab',
                'Change email',
                'Click save without confirmation'
              ],
              environment: 'Chrome 98.0.4758.102'
            },
            notes: 'Successfully reproduced the bug'
          };
        } else {
          await CommentModel.create({
            ticketId: ticket.id,
            userId: agent.id,
            content: `I've spent time trying to reproduce this bug but haven't been able to do so following the steps provided. Could you please provide more details about the environment and exact steps to reproduce? 

In particular, I need to know:
1. Which browser/device was being used
2. The exact data being entered
3. Any specific timing or order of operations`
          });
          
          // Failure result (but action succeeded)
          return {
            success: true,
            result: {
              bugReproduced: false,
              attemptsCount: 5,
              needsMoreInfo: true
            },
            notes: 'Could not reproduce the bug with the information provided'
          };
        }
      } catch (error) {
        logger.error(`Error in reproduce bug action for ticket ${ticket.id}:`, error);
        
        // Failure result
        return {
          success: false,
          result: {
            bugReproduced: false,
            error: error.message
          },
          error: error,
          notes: `Failed to attempt bug reproduction: ${error.message}`
        };
      }
    }
  };
}

/**
 * Create the investigate root cause action
 */
function createInvestigateRootCauseAction(agentManager: AgentManager): WorkflowAction {
  return {
    id: 'investigate-root-cause',
    name: 'Investigate Root Cause',
    description: 'Investigate the root cause of the bug',
    requiredCapabilities: ['bugInvestigation'],
    
    async execute(input: WorkflowActionInput): Promise<WorkflowActionOutput> {
      const { ticket, agent, context } = input;
      
      try {
        logger.info(`Agent ${agent.name} investigating root cause for ticket ${ticket.id}`);
        
        // Get reproduction results from previous state
        const reproductionResults = context.stateData[WorkflowState.ANALYSIS] || {};
        
        // Add a comment to the ticket
        await CommentModel.create({
          ticketId: ticket.id,
          userId: agent.id,
          content: `Now that I've reproduced the bug, I'm investigating the root cause by analyzing the codebase.`
        });
        
        // Simulate investigation
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Add root cause analysis
        await CommentModel.create({
          ticketId: ticket.id,
          userId: agent.id,
          content: `I've identified the root cause of the bug:

The form validation in UserProfileForm.js has a logic error. The email confirmation check is correctly implemented in the UI layer, but the API validation middleware (validateUserProfile.js) has a condition that doesn't check for the confirmation field when the email is being changed.

Specifically, in validateUserProfile.js line 45:
\`\`\`javascript
if (req.body.email && req.body.email !== user.email) {
  // Should check for confirmation here, but doesn't
  validations.push(validateEmail(req.body.email));
}
\`\`\`

This explains why the form submits successfully but the email doesn't actually update - the backend validation fails silently.`
        });
        
        // Success result
        return {
          success: true,
          nextState: WorkflowState.REVIEW,
          result: {
            rootCauseIdentified: true,
            rootCause: {
              file: 'middleware/validateUserProfile.js',
              line: 45,
              issue: 'Missing email confirmation validation in API middleware'
            },
            severity: 'medium',
            impactedAreas: ['User profile management', 'Email notifications']
          },
          notes: 'Successfully identified the root cause'
        };
      } catch (error) {
        logger.error(`Error in investigate root cause action for ticket ${ticket.id}:`, error);
        
        // Failure result
        return {
          success: false,
          result: {
            rootCauseIdentified: false,
            error: error.message
          },
          error: error,
          notes: `Failed to investigate root cause: ${error.message}`
        };
      }
    }
  };
}

/**
 * Create the suggest fix approach action
 */
function createSuggestFixApproachAction(agentManager: AgentManager): WorkflowAction {
  return {
    id: 'suggest-fix-approach',
    name: 'Suggest Fix Approach',
    description: 'Suggest an approach to fix the bug',
    requiredCapabilities: ['bugInvestigation'],
    
    async execute(input: WorkflowActionInput): Promise<WorkflowActionOutput> {
      const { ticket, agent, context } = input;
      
      try {
        logger.info(`Agent ${agent.name} suggesting fix approach for ticket ${ticket.id}`);
        
        // Get root cause from previous state
        const rootCauseResults = context.stateData[WorkflowState.PLANNING] || {};
        
        // Add a comment to the ticket
        await CommentModel.create({
          ticketId: ticket.id,
          userId: agent.id,
          content: `Based on my investigation of the root cause, I'm proposing a fix approach.`
        });
        
        // Simulate fix development
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Add fix suggestion
        await CommentModel.create({
          ticketId: ticket.id,
          userId: agent.id,
          content: `Here's my suggested fix for this bug:

1. In middleware/validateUserProfile.js, update the email validation condition at line 45:

\`\`\`javascript
// Current code
if (req.body.email && req.body.email !== user.email) {
  validations.push(validateEmail(req.body.email));
}

// Updated code
if (req.body.email && req.body.email !== user.email) {
  validations.push(validateEmail(req.body.email));
  // Add confirmation validation
  if (!req.body.emailConfirmation || req.body.email !== req.body.emailConfirmation) {
    return res.status(400).json({ error: 'Email confirmation is required and must match the new email' });
  }
}
\`\`\`

2. Add a unit test in test/middleware/validateUserProfile.test.js to verify this validation

3. Estimated time to implement: 1 hour
4. Risk assessment: Low - This is a contained change to the validation logic`
        });
        
        // Success result
        return {
          success: true,
          nextState: WorkflowState.COMPLETED,
          result: {
            fixApproachDeveloped: true,
            approach: {
              files: ['middleware/validateUserProfile.js', 'test/middleware/validateUserProfile.test.js'],
              complexity: 'low',
              estimatedTime: '1 hour'
            }
          },
          notes: 'Successfully suggested fix approach'
        };
      } catch (error) {
        logger.error(`Error in suggest fix approach action for ticket ${ticket.id}:`, error);
        
        // Failure result
        return {
          success: false,
          result: {
            fixApproachDeveloped: false,
            error: error.message
          },
          error: error,
          notes: `Failed to suggest fix approach: ${error.message}`
        };
      }
    }
  };
}

/**
 * Create the document investigation results action
 */
function createDocumentInvestigationResultsAction(agentManager: AgentManager): WorkflowAction {
  return {
    id: 'document-investigation-results',
    name: 'Document Investigation Results',
    description: 'Document the results of the bug investigation',
    requiredCapabilities: ['bugInvestigation'],
    
    async execute(input: WorkflowActionInput): Promise<WorkflowActionOutput> {
      const { ticket, agent, context } = input;
      
      try {
        logger.info(`Agent ${agent.name} documenting investigation results for ticket ${ticket.id}`);
        
        // Get all previous state data
        const analysisData = context.stateData[WorkflowState.ANALYSIS] || {};
        const planningData = context.stateData[WorkflowState.PLANNING] || {};
        const reviewData = context.stateData[WorkflowState.REVIEW] || {};
        
        // Add a final summary comment
        await CommentModel.create({
          ticketId: ticket.id,
          userId: agent.id,
          content: `# Bug Investigation Summary

## Bug Details
- **Status**: Reproducible
- **Severity**: ${planningData.rootCause?.severity || 'Medium'}
- **Impacted Areas**: ${planningData.rootCause?.impactedAreas?.join(', ') || 'User profile management'}

## Root Cause
${planningData.rootCause?.issue || 'Missing email confirmation validation in API middleware'}

## Fix Approach
${reviewData.approach?.complexity || 'Low'} complexity fix involving changes to ${reviewData.approach?.files?.length || 1} files.
Estimated time: ${reviewData.approach?.estimatedTime || '1 hour'}

## Next Steps
1. Implement the suggested fix
2. Add unit tests to prevent regression
3. Consider adding similar validation checks in other profile-related API endpoints

I've assigned this ticket to our backend team for implementation.`
        });
        
        // Update ticket with additional information if needed
        await TicketModel.update(ticket.id, {
          description: ticket.description + '\n\n---\n\n**Investigation Results**: Bug confirmed and root cause identified. See comments for details.'
        });
        
        // Success result
        return {
          success: true,
          result: {
            documentationComplete: true,
            investigationComplete: true
          },
          notes: 'Successfully documented investigation results'
        };
      } catch (error) {
        logger.error(`Error in document investigation results action for ticket ${ticket.id}:`, error);
        
        // Failure result - but we still want to complete the workflow
        return {
          success: true, // Still mark as success to complete the workflow
          result: {
            documentationComplete: true,
            error: error.message
          },
          notes: `Documented with errors: ${error.message}`
        };
      }
    }
  };
}