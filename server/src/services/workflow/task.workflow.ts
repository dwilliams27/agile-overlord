import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger';
import agentLogger from '../../utils/agentLogger';
import CommentModel from '../../models/Comment';
import TicketModel from '../../models/Ticket';
import MessageModel from '../../models/Message';
import { LLMFactory } from '../llm/llm.factory';
import { Agent } from '../agents/agent';
import { 
  Message,
  Tool
} from '../llm/types';

/**
 * Tool interface for agent task execution
 */
interface TaskTool {
  name: string;
  description: string;
  execute: (args: any) => Promise<any>;
}

/**
 * Task execution plan
 */
interface TaskPlan {
  steps: string[];
  estimatedSteps: number;
  requiredTools: string[];
}

/**
 * Task execution step
 */
interface TaskStep {
  index: number;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'retrying';
  toolUsed?: string;
  result?: any;
  error?: string;
  retryCount?: number;
  lastRetryTime?: Date;
  recoveryStrategy?: string;
}

/**
 * Task state
 */
interface TaskState {
  status: 'planning' | 'executing' | 'evaluating' | 'completed' | 'failed';
  ticketId: number;
  agentId: number;
  taskDescription: string;
  plan?: TaskPlan;
  currentStepIndex?: number;
  steps: TaskStep[];
  evaluations: string[];
  startTime: Date;
  lastUpdateTime: Date;
}

/**
 * A workflow implementation that can handle arbitrary tasks described in ticket descriptions
 */
export class TaskWorkflow {
  private llmService: ReturnType<typeof LLMFactory.getLLMService>;
  private agent: Agent;
  private ticket: any;
  private taskState: TaskState;
  private tools: Map<string, TaskTool>;
  
  // Error recovery configuration
  private readonly maxRetries: number = 3;
  private readonly retryBackoffMs: number[] = [1000, 3000, 5000]; // Graduated backoff
  
  constructor(agent: Agent, ticket: any) {
    this.agent = agent;
    this.ticket = ticket;
    this.llmService = LLMFactory.getLLMService({});
    this.tools = new Map();
    
    // Initialize task state
    this.taskState = {
      status: 'planning',
      ticketId: ticket.id,
      agentId: agent.id,
      taskDescription: ticket.description,
      steps: [],
      evaluations: [],
      startTime: new Date(),
      lastUpdateTime: new Date()
    };
    
    // Register default tools
    this.registerDefaultTools();
  }
  
  /**
   * Register default tools available to the agent
   */
  private registerDefaultTools() {
    // Tool for sending messages to channels
    this.registerTool({
      name: 'send_message',
      description: 'Send a message to a channel',
      execute: async (args: { channelId: number, content: string }) => {
        try {
          const { channelId, content } = args;
          
          // Validate arguments
          if (!channelId || !content) {
            throw new Error('channelId and content are required for send_message tool');
          }
          
          // Create the message
          const message = await MessageModel.create({
            channelId,
            userId: this.agent.id,
            content,
            threadParentId: null
          });
          
          return {
            success: true,
            messageId: message.id,
            channelId
          };
        } catch (error) {
          logger.error(`Error executing send_message tool:`, error);
          return {
            success: false,
            error: error.message
          };
        }
      }
    });
    
    // Tool for adding comments to tickets
    this.registerTool({
      name: 'add_ticket_comment',
      description: 'Add a comment to the current ticket',
      execute: async (args: { content: string }) => {
        try {
          const { content } = args;
          
          // Validate arguments
          if (!content) {
            throw new Error('content is required for add_ticket_comment tool');
          }
          
          // Create the comment
          const comment = await CommentModel.create({
            ticketId: this.ticket.id,
            userId: this.agent.id,
            content
          });
          
          return {
            success: true,
            commentId: comment.id
          };
        } catch (error) {
          logger.error(`Error executing add_ticket_comment tool:`, error);
          return {
            success: false,
            error: error.message
          };
        }
      }
    });
    
    // Tool for updating ticket status
    this.registerTool({
      name: 'update_ticket_status',
      description: 'Update the status of the current ticket',
      execute: async (args: { status: string }) => {
        try {
          const { status } = args;
          
          // Validate arguments
          if (!status) {
            throw new Error('status is required for update_ticket_status tool');
          }
          
          // Update the ticket status
          const updatedTicket = await TicketModel.updateStatus(this.ticket.id, status);
          
          return {
            success: true,
            newStatus: status
          };
        } catch (error) {
          logger.error(`Error executing update_ticket_status tool:`, error);
          return {
            success: false,
            error: error.message
          };
        }
      }
    });
  }
  
  /**
   * Register a new tool for the workflow
   */
  registerTool(tool: TaskTool) {
    this.tools.set(tool.name, tool);
  }
  
  /**
   * Get all registered tools
   */
  getTools(): TaskTool[] {
    return Array.from(this.tools.values());
  }
  
  /**
   * Get tools as LLM-compatible format with proper parameter schemas
   */
  getToolsForLLM(): Tool[] {
    return Array.from(this.tools.entries()).map(([name, tool]) => {
      // Define parameter schemas based on tool name
      let parameters;
      
      if (name === 'send_message') {
        parameters = {
          type: 'object',
          properties: {
            channelId: {
              type: 'number',
              description: 'The ID of the channel to send the message to. For general channel, use 1.'
            },
            content: {
              type: 'string',
              description: 'The content of the message to send'
            }
          },
          required: ['channelId', 'content']
        };
      } else if (name === 'add_ticket_comment') {
        parameters = {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The content of the comment to add to the ticket'
            }
          },
          required: ['content']
        };
      } else if (name === 'update_ticket_status') {
        parameters = {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'The new status for the ticket. Valid values: todo, in_progress, in_review, done'
            }
          },
          required: ['status']
        };
      } else {
        // Default empty properties for other tools
        parameters = {
          type: 'object',
          properties: {}
        };
      }
      
      return {
        name,
        description: tool.description,
        parameters
      };
    });
  }
  
  /**
   * Generate a system prompt for task planning
   */
  private getPlanningSystemPrompt(): string {
    const tools = this.getTools();
    const toolDescriptions = tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n');
    
    return `You are ${this.agent.name}, an AI agent tasked with completing a ticket in an agile management system.

TASK DESCRIPTION:
${this.ticket.title}
${this.ticket.description}

Your job is to understand this task and create a concise, actionable plan to accomplish exactly what the ticket is asking for.

You have access to the following tools:
${toolDescriptions}

Create a plan consisting of ONLY a numbered list of concrete, specific steps. For each step:
1. Make it action-oriented and specific (e.g., "Post a message to the general channel about X")
2. Indicate which tool will be used for the step (e.g., "Using send_message")
3. List only necessary steps that directly contribute to completing the task
4. Focus only on what's explicitly required in the ticket description

Example plan format:
1. Create an app idea concept focusing on [specific theme] (no tool needed)
2. Draft a message describing the app idea with key features (no tool needed)
3. Post the message to the general channel (using send_message)
4. Add a comment to the ticket confirming completion (using add_ticket_comment)
5. Update the ticket status to done (using update_ticket_status)

Be concise and pragmatic. Only include steps that are necessary to complete the ticket requirements. Avoid theoretical steps or placeholders.`;
  }
  
  /**
   * Generate a system prompt for task execution
   */
  private getExecutionSystemPrompt(currentStep: TaskStep): string {
    const tools = this.getTools();
    const toolDescriptions = tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n');
    
    // Get the overall plan summary
    const planSteps = this.taskState.plan?.steps.map((step, i) => 
      `${i + 1}. ${step}${i === currentStep.index ? " (CURRENT STEP)" : i < currentStep.index ? " (COMPLETED)" : ""}`
    ).join('\n') || '';
    
    // Get previous steps and their results
    const previousSteps = this.taskState.steps
      .filter(step => step.index < currentStep.index)
      .map(step => {
        let resultText = '';
        if (step.status === 'completed') {
          resultText = `Result: Success - ${JSON.stringify(step.result)}`;
        } else if (step.status === 'failed') {
          resultText = `Result: Failed - ${step.error}`;
        }
        return `Step ${step.index + 1}: ${step.description}\nTool Used: ${step.toolUsed}\n${resultText}`;
      })
      .join('\n\n');
    
    return `You are ${this.agent.name}, an AI agent executing a task according to a plan. Your goal is to complete the current step in your plan while maintaining continuity with previous steps.

TASK DESCRIPTION:
${this.ticket.title}
${this.ticket.description}

PLAN:
${planSteps}

PREVIOUS STEPS:
${previousSteps}

CURRENT STEP TO EXECUTE:
Step ${currentStep.index + 1}: ${currentStep.description}

You have access to the following tools:
${toolDescriptions}

Your job is to:
1. Decide which tool is appropriate for this step
2. Invoke that tool with the correct parameters
3. You MUST use one of the available tools to complete this step

CONTEXT CONTINUITY GUIDELINES:
- Review previous steps to understand the current context
- If this step builds on previous steps, ensure consistency with what was done before
- If posting multiple messages in a series, maintain a consistent tone and format
- Reference previous content when it makes sense (e.g., "As mentioned in my previous message...")
- For related tasks, ensure your approach is consistent across steps

IMPORTANT TOOL USAGE INSTRUCTIONS:
- For send_message tool: You MUST provide both channelId and content parameters
  - If sending to the general channel, use channelId: 1
  - Example: {"channelId": 1, "content": "Your message here"}
- For add_ticket_comment tool: You MUST provide the content parameter
  - Example: {"content": "Your comment here"}
- For update_ticket_status tool: You MUST provide the status parameter
  - Example: {"status": "done"}

Be focused and precise while maintaining context. Only execute the current step, not future steps. If the step requires sending a message, make it professional, clear, and complete while ensuring it flows naturally from any previous messages.`;
  }
  
  /**
   * Generate a system prompt for evaluation
   */
  private getEvaluationSystemPrompt(currentStep: TaskStep): string {
    // Include the step and its result
    let resultText = '';
    if (currentStep.status === 'completed') {
      resultText = `Result: ${JSON.stringify(currentStep.result)}`;
    } else if (currentStep.status === 'failed') {
      resultText = `Error: ${currentStep.error}`;
    }
    
    const planSteps = this.taskState.plan?.steps.map((step, i) => 
      `${i + 1}. ${step}${i === currentStep.index ? " (CURRENT STEP)" : i < currentStep.index ? " (COMPLETED)" : ""}`
    ).join('\n') || '';
    
    // Include recovery strategy if it exists
    const recoveryInfo = currentStep.recoveryStrategy 
      ? `\nRecovery Strategy: ${currentStep.recoveryStrategy}` 
      : '';
    
    // Include retry information if this is a retry
    const retryInfo = currentStep.retryCount 
      ? `\nRetry Attempt: ${currentStep.retryCount} of ${this.maxRetries}` 
      : '';
    
    return `You are ${this.agent.name}, an AI agent evaluating whether a step in your task plan was completed successfully while maintaining overall context continuity.

TASK DESCRIPTION:
${this.ticket.title}
${this.ticket.description}

PLAN:
${planSteps}

STEP BEING EVALUATED:
Step ${currentStep.index + 1}: ${currentStep.description}
Tool Used: ${currentStep.toolUsed}
${resultText}${recoveryInfo}${retryInfo}

Your job is to:
1. Determine if this step was completed successfully based on the result
2. If successful, explain why it meets the requirements of the step
3. If unsuccessful, explain what went wrong and what needs to be fixed
4. Decide if you should proceed to the next step or retry this step
5. Consider how this step fits into the overall task context and previous steps

ERROR RECOVERY EVALUATION:
If this step failed or encountered errors:
- Analyze the specific error message to understand the root cause
- Determine if the suggested recovery strategy is appropriate
- If this is a retry attempt, evaluate if the same error is recurring
- For repeated failures, suggest an alternative approach or tool
- Consider whether to skip this step if it's non-critical and consistently failing

CONTEXT CONTINUITY EVALUATION:
In addition to technical success, evaluate if this step:
- Maintains consistency with previous steps
- Builds appropriately on prior work
- Follows a logical progression in the overall task
- Maintains a consistent tone, format, and approach
- Creates a cohesive experience if there are multiple related communications

Be critical and thorough in your evaluation. The goal is to ensure the task is being completed correctly, completely, and with good continuity throughout the process. For failures, focus on providing actionable guidance for recovery.`;
  }
  
  /**
   * Step 1: Plan the task execution
   */
  async planTask(): Promise<TaskPlan> {
    try {
      // Add initial comment to ticket
      await CommentModel.create({
        ticketId: this.ticket.id,
        userId: this.agent.id,
        content: `I'll work on this ticket now.`
      });
      
      // Generate task planning prompt
      const planningPrompt = this.getPlanningSystemPrompt();
      
      // Log that we're planning
      agentLogger.logAgentActivity('task_planning', {
        agentId: this.agent.id,
        agentName: this.agent.name,
        ticketId: this.ticket.id,
        details: {
          ticketTitle: this.ticket.title,
          taskDescription: this.ticket.description
        }
      });
      
      // Get LLM to create a plan
      const planningMessages: Message[] = [
        { role: 'system', content: planningPrompt },
        { role: 'user', content: 'Please analyze this task and create a detailed plan for completing it.' }
      ];
      
      const planResponse = await this.llmService.requestChat(planningMessages);
      
      // Parse the plan from the response
      // This is simplified - in a real implementation, we would have more structured parsing
      const planLines = planResponse.split('\n').filter(line => line.trim());
      
      // Extract steps - look for numbered lines
      const steps: string[] = [];
      for (const line of planLines) {
        // Look for lines that start with a number and period or parenthesis
        const match = line.match(/^\s*(\d+)[\.\)]+(.*)/);
        if (match) {
          // Clean up the step text and remove any "(using..." suffix since we'll handle that separately
          const stepText = match[2].trim().replace(/\s*\(using [^)]+\)\s*$/, '');
          steps.push(stepText);
        }
      }
      
      // Create task plan
      const plan: TaskPlan = {
        steps,
        estimatedSteps: steps.length,
        requiredTools: ['send_message', 'add_ticket_comment', 'update_ticket_status']
      };
      
      // Update task state
      this.taskState.plan = plan;
      this.taskState.status = 'executing';
      this.taskState.lastUpdateTime = new Date();
      
      // Add comment with the plan
      await CommentModel.create({
        ticketId: this.ticket.id,
        userId: this.agent.id,
        content: `I'll complete this ticket with the following plan:

${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

Starting now.`
      });
      
      // Log the plan
      agentLogger.logAgentActivity('task_plan_created', {
        agentId: this.agent.id,
        agentName: this.agent.name,
        ticketId: this.ticket.id,
        details: {
          plan
        }
      });
      
      return plan;
    } catch (error) {
      logger.error(`Error planning task for ticket ${this.ticket.id}:`, error);
      
      // Update task state to failed
      this.taskState.status = 'failed';
      this.taskState.lastUpdateTime = new Date();
      
      // Add error comment
      await CommentModel.create({
        ticketId: this.ticket.id,
        userId: this.agent.id,
        content: `I encountered an error while planning how to complete this ticket: ${error.message}`
      });
      
      // Log the failure
      agentLogger.logAgentActivity('task_planning_failed', {
        agentId: this.agent.id,
        agentName: this.agent.name,
        ticketId: this.ticket.id,
        details: {
          error: error.message
        }
      });
      
      throw error;
    }
  }
  
  /**
   * Step 2: Execute the next step in the plan
   */
  async executeNextStep(): Promise<TaskStep | null> {
    try {
      // Check if we have a plan
      if (!this.taskState.plan) {
        throw new Error('No plan exists. Please create a plan first.');
      }
      
      // Determine the current step index
      const currentStepIndex = this.taskState.currentStepIndex !== undefined 
        ? this.taskState.currentStepIndex 
        : 0;
      
      // Check if we've completed all steps
      if (currentStepIndex >= this.taskState.plan.steps.length) {
        this.taskState.status = 'completed';
        this.taskState.lastUpdateTime = new Date();
        return null;
      }
      
      // Check if we're retrying a failed step
      const existingStepIndex = this.taskState.steps.findIndex(
        s => s.index === currentStepIndex && (s.status === 'failed' || s.status === 'retrying')
      );
      
      let currentStep: TaskStep;
      
      if (existingStepIndex !== -1) {
        // We're retrying a failed step
        currentStep = this.taskState.steps[existingStepIndex];
        const retryCount = (currentStep.retryCount || 0) + 1;
        
        if (retryCount > this.maxRetries) {
          logger.error(`Maximum retries (${this.maxRetries}) exceeded for step ${currentStepIndex} in ticket ${this.ticket.id}`);
          
          // Add a comment about reaching max retries
          await CommentModel.create({
            ticketId: this.ticket.id,
            userId: this.agent.id,
            content: `I've tried to execute step "${currentStep.description}" ${this.maxRetries} times but keep encountering errors. I'll try a different approach or skip this step if possible.`
          });
          
          // Mark the step as permanently failed and try to continue with the next step
          currentStep.status = 'failed';
          this.taskState.currentStepIndex = currentStepIndex + 1;
          
          // Log the retry failure
          agentLogger.logAgentActivity('task_max_retries_exceeded', {
            agentId: this.agent.id,
            agentName: this.agent.name,
            ticketId: this.ticket.id,
            details: {
              stepIndex: currentStepIndex,
              stepDescription: currentStep.description,
              maxRetries: this.maxRetries,
              lastError: currentStep.error
            }
          });
          
          // Try to get the next step instead
          return this.executeNextStep();
        }
        
        // Update retry information
        currentStep.status = 'retrying';
        currentStep.retryCount = retryCount;
        currentStep.lastRetryTime = new Date();
        
        // Log retry attempt
        logger.info(`Retrying step ${currentStepIndex} (attempt ${retryCount} of ${this.maxRetries}) for ticket ${this.ticket.id}`);
        
        // If we have a backoff strategy, wait before retrying
        if (this.retryBackoffMs.length >= retryCount) {
          const backoffTime = this.retryBackoffMs[retryCount - 1];
          logger.info(`Waiting ${backoffTime}ms before retry attempt ${retryCount}`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      } else {
        // New step
        const stepDescription = this.taskState.plan.steps[currentStepIndex];
        currentStep = {
          index: currentStepIndex,
          description: stepDescription,
          status: 'in_progress',
          retryCount: 0
        };
        
        // Add to task state
        this.taskState.steps.push(currentStep);
      }
      
      this.taskState.currentStepIndex = currentStepIndex;
      this.taskState.lastUpdateTime = new Date();
      
      // Generate execution prompt
      const executionPrompt = this.getExecutionSystemPrompt(currentStep);
      
      // Log that we're executing a step
      agentLogger.logAgentActivity('task_step_execution', {
        agentId: this.agent.id,
        agentName: this.agent.name,
        ticketId: this.ticket.id,
        details: {
          stepIndex: currentStepIndex,
          stepDescription: currentStep.description
        }
      });
      
      // Request LLM to execute the step with tools
      const executionMessages: Message[] = [
        { role: 'system', content: executionPrompt },
        { role: 'user', content: `Execute step ${currentStepIndex + 1}: ${currentStep.description}` }
      ];
      
      const tools = this.getToolsForLLM();
      const toolResponse = await this.llmService.requestWithTools(executionMessages, tools);
      
      // If there are tool calls, execute them
      let toolResult = null;
      let toolError = null;
      let toolName = null;
      
      if (toolResponse.toolCalls && toolResponse.toolCalls.length > 0) {
        const toolCall = toolResponse.toolCalls[0]; // We'll just handle the first tool call for simplicity
        toolName = toolCall.name;
        
        // Find the tool
        const tool = this.tools.get(toolCall.name);
        if (!tool) {
          throw new Error(`Tool "${toolCall.name}" not found`);
        }
        
        try {
          // Execute the tool
          const args = typeof toolCall.arguments === 'string' 
            ? JSON.parse(toolCall.arguments) 
            : toolCall.arguments;
          
          toolResult = await tool.execute(args);
          
          // Log tool execution
          agentLogger.logAgentActivity('task_tool_execution', {
            agentId: this.agent.id,
            agentName: this.agent.name,
            ticketId: this.ticket.id,
            details: {
              stepIndex: currentStepIndex,
              toolName: toolCall.name,
              toolArgs: args,
              toolResult
            }
          });
          
        } catch (error) {
          toolError = error.message;
          
          // Generate recovery strategy based on error type
          let recoveryStrategy = "Try again with corrected parameters";
          
          // Specific error recovery strategies
          if (error.message.includes('channelId and content are required')) {
            recoveryStrategy = "Make sure to include both 'channelId' and 'content' parameters for the send_message tool";
          } else if (error.message.includes('not found')) {
            recoveryStrategy = "The specified resource was not found. Check the ID or name and try again.";
          } else if (error.message.includes('permission') || error.message.includes('access')) {
            recoveryStrategy = "There may be a permissions issue. Try a different approach or tool.";
          } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
            recoveryStrategy = "The operation timed out. Try breaking it into smaller steps or simplify the request.";
          } else if (error.message.includes('syntax') || error.message.includes('format')) {
            recoveryStrategy = "There appears to be a syntax or format error. Check the format of your parameters.";
          }
          
          // Add recovery strategy to step
          currentStep.recoveryStrategy = recoveryStrategy;
          
          // Log tool error with recovery strategy
          agentLogger.logAgentActivity('task_tool_error', {
            agentId: this.agent.id,
            agentName: this.agent.name,
            ticketId: this.ticket.id,
            details: {
              stepIndex: currentStepIndex,
              toolName: toolCall.name,
              error: error.message,
              recoveryStrategy: recoveryStrategy
            }
          });
          
          // Add a comment with diagnostic information for serious errors
          if ((currentStep.retryCount || 0) >= 1) {
            // Only add diagnostic comment after first retry to avoid noise
            await CommentModel.create({
              ticketId: this.ticket.id,
              userId: this.agent.id,
              content: `I encountered an error while executing step ${currentStepIndex + 1}: "${error.message}"\n\nRecovery strategy: ${recoveryStrategy}\n\nI'll try to recover and continue.`
            });
          }
        }
      } else if (toolResponse.completion) {
        // If there's just a text completion, log it
        await CommentModel.create({
          ticketId: this.ticket.id,
          userId: this.agent.id,
          content: `Step ${currentStepIndex + 1} note: ${toolResponse.completion}`
        });
      }
      
      // Update the current step with the result
      const stepIndex = this.taskState.steps.findIndex(s => s.index === currentStepIndex);
      if (stepIndex !== -1) {
        if (toolError) {
          this.taskState.steps[stepIndex].status = 'failed';
          this.taskState.steps[stepIndex].error = toolError;
        } else {
          this.taskState.steps[stepIndex].status = 'completed';
          this.taskState.steps[stepIndex].result = toolResult;
        }
        this.taskState.steps[stepIndex].toolUsed = toolName;
      }
      
      return this.taskState.steps[stepIndex];
    } catch (error) {
      logger.error(`Error executing step for ticket ${this.ticket.id}:`, error);
      
      // Add error comment
      await CommentModel.create({
        ticketId: this.ticket.id,
        userId: this.agent.id,
        content: `I encountered an error while executing the current step: ${error.message}`
      });
      
      // Log the error
      agentLogger.logAgentActivity('task_step_execution_failed', {
        agentId: this.agent.id,
        agentName: this.agent.name,
        ticketId: this.ticket.id,
        details: {
          stepIndex: this.taskState.currentStepIndex,
          error: error.message
        }
      });
      
      // Mark the step as failed
      const currentStepIndex = this.taskState.currentStepIndex !== undefined 
        ? this.taskState.currentStepIndex 
        : 0;
      
      const stepIndex = this.taskState.steps.findIndex(s => s.index === currentStepIndex);
      if (stepIndex !== -1) {
        this.taskState.steps[stepIndex].status = 'failed';
        this.taskState.steps[stepIndex].error = error.message;
      }
      
      throw error;
    }
  }
  
  /**
   * Step 3: Evaluate the result of the current step
   */
  async evaluateStep(step: TaskStep): Promise<boolean> {
    try {
      // Generate evaluation prompt
      const evaluationPrompt = this.getEvaluationSystemPrompt(step);
      
      // Log that we're evaluating a step
      agentLogger.logAgentActivity('task_step_evaluation', {
        agentId: this.agent.id,
        agentName: this.agent.name,
        ticketId: this.ticket.id,
        details: {
          stepIndex: step.index,
          stepDescription: step.description,
          stepStatus: step.status
        }
      });
      
      // Request LLM to evaluate the step
      const evaluationMessages: Message[] = [
        { role: 'system', content: evaluationPrompt },
        { role: 'user', content: `Evaluate the result of step ${step.index + 1}. Should I proceed to the next step?` }
      ];
      
      const evaluationResponse = await this.llmService.requestChat(evaluationMessages);
      
      // Store the evaluation
      this.taskState.evaluations.push(evaluationResponse);
      
      // Determine if we should move to the next step or retry
      const shouldProceed = this.shouldProceedToNextStep(evaluationResponse);
      
      // Log the evaluation decision
      agentLogger.logAgentActivity('task_step_evaluation_complete', {
        agentId: this.agent.id,
        agentName: this.agent.name,
        ticketId: this.ticket.id,
        details: {
          stepIndex: step.index,
          evaluation: evaluationResponse.substring(0, 100) + '...',
          shouldProceed
        }
      });
      
      // Add evaluation comment
      await CommentModel.create({
        ticketId: this.ticket.id,
        userId: this.agent.id,
        content: `Evaluation of step ${step.index + 1}: ${shouldProceed ? 'Successfully completed' : 'Needs to be retried'}\n\n${evaluationResponse}`
      });
      
      if (shouldProceed) {
        // Move to the next step
        this.taskState.currentStepIndex = step.index + 1;
        
        // If this was the last step, log progress but let the execute method handle completion
        if (this.taskState.currentStepIndex >= (this.taskState.plan?.steps.length || 0)) {
          // Log that we're on the last step
          logger.info(`Completing final step for ticket ${this.ticket.id}`);
        }
      } else {
        // Find the step
        const stepIndex = this.taskState.steps.findIndex(s => s.index === step.index);
        if (stepIndex !== -1) {
          // Check if we've already retried too many times
          const retryCount = (this.taskState.steps[stepIndex].retryCount || 0);
          
          if (retryCount >= this.maxRetries - 1) {  // Already tried max_retries-1 times (will be max_retries after next try)
            // Add a warning comment about final retry attempt
            await CommentModel.create({
              ticketId: this.ticket.id,
              userId: this.agent.id,
              content: `I've tried step "${step.description}" ${retryCount} times and will make one final attempt. If it fails again, I'll try to continue with the next steps.`
            });
          }
          
          // Reset the step for retry, but preserve the retry count and error history
          const oldStep = this.taskState.steps[stepIndex];
          this.taskState.steps[stepIndex] = {
            ...oldStep,
            status: 'retrying',
            retryCount: (oldStep.retryCount || 0) + 1,
            lastRetryTime: new Date()
          };
        }
        
        // Log retry
        agentLogger.logAgentActivity('task_step_retry', {
          agentId: this.agent.id,
          agentName: this.agent.name,
          ticketId: this.ticket.id,
          details: {
            stepIndex: step.index,
            stepDescription: step.description,
            retryCount: this.taskState.steps[stepIndex]?.retryCount || 1,
            maxRetries: this.maxRetries,
            error: step.error,
            recoveryStrategy: step.recoveryStrategy
          }
        });
      }
      
      return shouldProceed;
    } catch (error) {
      logger.error(`Error evaluating step for ticket ${this.ticket.id}:`, error);
      
      // Add error comment
      await CommentModel.create({
        ticketId: this.ticket.id,
        userId: this.agent.id,
        content: `I encountered an error while evaluating the current step: ${error.message}`
      });
      
      // Log the error
      agentLogger.logAgentActivity('task_step_evaluation_failed', {
        agentId: this.agent.id,
        agentName: this.agent.name,
        ticketId: this.ticket.id,
        details: {
          stepIndex: step.index,
          error: error.message
        }
      });
      
      // Default to not proceeding on error
      return false;
    }
  }
  
  /**
   * Determine if we should proceed to the next step based on evaluation and retry context
   */
  private shouldProceedToNextStep(evaluation: string): boolean {
    // Look for "force proceed" or "skip step" language which takes highest priority
    if (evaluation.toLowerCase().includes('force proceed') || 
        evaluation.toLowerCase().includes('skip step') || 
        evaluation.toLowerCase().includes('despite error') ||
        evaluation.toLowerCase().includes('continue anyway')) {
      return true;
    }
    
    // This is a weighted heuristic for decision making
    const positiveIndicators = [
      { term: 'proceed', weight: 1 },
      { term: 'next step', weight: 1 },
      { term: 'successfully', weight: 1 },
      { term: 'completed', weight: 1 },
      { term: 'continue', weight: 1 },
      { term: 'sufficient', weight: 0.5 },
      { term: 'adequate', weight: 0.5 },
      { term: 'move forward', weight: 1 }
    ];
    
    const negativeIndicators = [
      { term: 'retry', weight: 1 },
      { term: 'failed', weight: 1 },
      { term: 'error', weight: 0.7 },
      { term: 'try again', weight: 1 },
      { term: 'not successful', weight: 1 },
      { term: 'unsuccessful', weight: 1 },
      { term: 'incorrect', weight: 0.7 },
      { term: 'missing', weight: 0.5 }
    ];
    
    // Calculate weighted scores
    const positiveScore = positiveIndicators.reduce((score, indicator) => 
      score + (evaluation.toLowerCase().includes(indicator.term) ? indicator.weight : 0), 0);
    
    const negativeScore = negativeIndicators.reduce((score, indicator) => 
      score + (evaluation.toLowerCase().includes(indicator.term) ? indicator.weight : 0), 0);
    
    // Check for explicit instructions about maximum retries
    const maxRetriesExceededIndication = 
      evaluation.toLowerCase().includes('maximum retries') ||
      evaluation.toLowerCase().includes('too many attempts') ||
      evaluation.toLowerCase().includes('skip after failure');
    
    if (maxRetriesExceededIndication) {
      // If maximum retries is mentioned, look for advice to proceed or retry
      return evaluation.toLowerCase().includes('proceed') || 
             evaluation.toLowerCase().includes('continue') ||
             evaluation.toLowerCase().includes('skip');
    }
    
    // Weighted decision with a slight bias toward proceeding on tied scores
    return positiveScore >= negativeScore;
  }
  
  /**
   * Execute the complete workflow
   */
  async execute(): Promise<TaskState> {
    try {
      // Step 1: Plan the task
      if (!this.taskState.plan) {
        await this.planTask();
      }
      
      // Step 2-3: Execute and evaluate steps until completion
      while (this.taskState.status === 'executing') {
        // Execute the next step
        const step = await this.executeNextStep();
        if (!step) {
          // No more steps - task is complete
          this.taskState.status = 'completed';
          
          // Add final success comment
          await CommentModel.create({
            ticketId: this.ticket.id,
            userId: this.agent.id,
            content: `I've successfully completed all steps for this ticket.`
          });
          
          // Log the completion
          agentLogger.logAgentActivity('task_completed', {
            agentId: this.agent.id,
            agentName: this.agent.name,
            ticketId: this.ticket.id,
            details: {
              completedSteps: this.taskState.steps.length,
              duration: Date.now() - this.taskState.startTime.getTime()
            }
          });
          
          break;
        }
        
        // Evaluate the step
        await this.evaluateStep(step);
      }
      
      return this.taskState;
    } catch (error) {
      logger.error(`Error executing task workflow for ticket ${this.ticket.id}:`, error);
      
      // Mark as failed
      this.taskState.status = 'failed';
      
      // Add final error comment
      await CommentModel.create({
        ticketId: this.ticket.id,
        userId: this.agent.id,
        content: `I was unable to complete this task due to an error: ${error.message}`
      });
      
      // Log the failure
      agentLogger.logAgentActivity('task_execution_failed', {
        agentId: this.agent.id,
        agentName: this.agent.name,
        ticketId: this.ticket.id,
        details: {
          error: error.message,
          taskState: this.taskState
        }
      });
      
      return this.taskState;
    }
  }
  
  /**
   * Get the current task state
   */
  getTaskState(): TaskState {
    return this.taskState;
  }
}