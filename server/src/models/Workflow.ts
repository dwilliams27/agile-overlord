import db from '../utils/db';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { 
  WorkflowInstance, 
  WorkflowState,
  WorkflowContext,
  WorkflowDbModel 
} from '../services/workflow/workflow.types';

// Wrap db methods in promises
const dbAll = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const dbGet = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const dbRun = (sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

/**
 * Model for handling workflow persistence in the database
 */
class WorkflowModel {
  /**
   * Initialize the workflows table in the database
   */
  async initTable(): Promise<void> {
    try {
      await dbRun(`
        CREATE TABLE IF NOT EXISTS workflows (
          id TEXT PRIMARY KEY,
          definition_id TEXT NOT NULL,
          agent_id INTEGER NOT NULL,
          ticket_id INTEGER NOT NULL,
          status TEXT NOT NULL,
          current_state TEXT NOT NULL,
          context TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (agent_id) REFERENCES users (id),
          FOREIGN KEY (ticket_id) REFERENCES tickets (id)
        )
      `);
      logger.info('Workflows table initialized');
    } catch (error) {
      logger.error('Error initializing workflows table:', error);
      throw error;
    }
  }

  /**
   * Get all workflows
   */
  async getAll(): Promise<WorkflowInstance[]> {
    try {
      const workflowsData = await dbAll('SELECT * FROM workflows ORDER BY updated_at DESC');
      return workflowsData.map(this.mapWorkflowFromDB);
    } catch (error) {
      logger.error('Error fetching workflows:', error);
      throw error;
    }
  }

  /**
   * Get a workflow by ID
   */
  async getById(id: string): Promise<WorkflowInstance | null> {
    try {
      const workflow = await dbGet('SELECT * FROM workflows WHERE id = ?', [id]);
      return workflow ? this.mapWorkflowFromDB(workflow) : null;
    } catch (error) {
      logger.error(`Error fetching workflow ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get workflows by ticket ID
   */
  async getByTicketId(ticketId: number): Promise<WorkflowInstance[]> {
    try {
      const workflowsData = await dbAll(
        'SELECT * FROM workflows WHERE ticket_id = ? ORDER BY updated_at DESC',
        [ticketId]
      );
      return workflowsData.map(this.mapWorkflowFromDB);
    } catch (error) {
      logger.error(`Error fetching workflows for ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Get active workflow by ticket ID and agent ID
   */
  async getActiveByTicketAndAgent(ticketId: number, agentId: number): Promise<WorkflowInstance | null> {
    try {
      const workflow = await dbGet(
        'SELECT * FROM workflows WHERE ticket_id = ? AND agent_id = ? AND status = "active"',
        [ticketId, agentId]
      );
      return workflow ? this.mapWorkflowFromDB(workflow) : null;
    } catch (error) {
      logger.error(`Error fetching active workflow for ticket ${ticketId} and agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Get workflows by agent ID
   */
  async getByAgentId(agentId: number): Promise<WorkflowInstance[]> {
    try {
      const workflowsData = await dbAll(
        'SELECT * FROM workflows WHERE agent_id = ? ORDER BY updated_at DESC',
        [agentId]
      );
      return workflowsData.map(this.mapWorkflowFromDB);
    } catch (error) {
      logger.error(`Error fetching workflows for agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new workflow
   */
  async create(workflow: Omit<WorkflowInstance, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkflowInstance> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      await dbRun(
        `INSERT INTO workflows (
          id, definition_id, agent_id, ticket_id, status, current_state, context, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          workflow.definitionId,
          workflow.agentId,
          workflow.ticketId,
          workflow.status,
          workflow.currentState,
          JSON.stringify(workflow.context),
          now,
          now
        ]
      );
      
      const created = await this.getById(id);
      if (!created) {
        throw new Error(`Failed to retrieve created workflow with ID: ${id}`);
      }
      
      return created;
    } catch (error) {
      logger.error('Error creating workflow:', error);
      throw error;
    }
  }

  /**
   * Update a workflow
   */
  async update(id: string, updates: Partial<Omit<WorkflowInstance, 'id' | 'createdAt' | 'updatedAt'>>): Promise<WorkflowInstance | null> {
    try {
      const workflow = await this.getById(id);
      if (!workflow) {
        return null;
      }
      
      const updateFields = [];
      const values = [];
      
      if (updates.definitionId !== undefined) {
        updateFields.push('definition_id = ?');
        values.push(updates.definitionId);
      }
      
      if (updates.agentId !== undefined) {
        updateFields.push('agent_id = ?');
        values.push(updates.agentId);
      }
      
      if (updates.ticketId !== undefined) {
        updateFields.push('ticket_id = ?');
        values.push(updates.ticketId);
      }
      
      if (updates.status !== undefined) {
        updateFields.push('status = ?');
        values.push(updates.status);
      }
      
      if (updates.currentState !== undefined) {
        updateFields.push('current_state = ?');
        values.push(updates.currentState);
      }
      
      if (updates.context !== undefined) {
        updateFields.push('context = ?');
        values.push(JSON.stringify(updates.context));
      }
      
      // Always update the updated_at timestamp
      updateFields.push('updated_at = ?');
      values.push(new Date().toISOString());
      
      // Add ID at the end for WHERE clause
      values.push(id);
      
      await dbRun(
        `UPDATE workflows SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );
      
      return this.getById(id);
    } catch (error) {
      logger.error(`Error updating workflow ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update workflow state
   */
  async updateState(id: string, newState: WorkflowState, contextUpdates: Partial<WorkflowContext> = {}): Promise<WorkflowInstance | null> {
    try {
      const workflow = await this.getById(id);
      if (!workflow) {
        return null;
      }
      
      // Update context with the new state and provided updates
      const updatedContext = {
        ...workflow.context,
        ...contextUpdates,
        currentState: newState,
        previousState: workflow.context.currentState,
        updatedAt: new Date()
      };
      
      await dbRun(
        'UPDATE workflows SET current_state = ?, context = ?, updated_at = ? WHERE id = ?',
        [newState, JSON.stringify(updatedContext), new Date().toISOString(), id]
      );
      
      return this.getById(id);
    } catch (error) {
      logger.error(`Error updating workflow state ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a workflow
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await dbRun(
        'DELETE FROM workflows WHERE id = ?',
        [id]
      );
      
      return result.changes > 0;
    } catch (error) {
      logger.error(`Error deleting workflow ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete workflows by ticket ID
   */
  async deleteByTicketId(ticketId: number): Promise<number> {
    try {
      const result = await dbRun(
        'DELETE FROM workflows WHERE ticket_id = ?',
        [ticketId]
      );
      
      return result.changes;
    } catch (error) {
      logger.error(`Error deleting workflows for ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Map database workflow to WorkflowInstance
   */
  private mapWorkflowFromDB(dbWorkflow: WorkflowDbModel): WorkflowInstance {
    return {
      id: dbWorkflow.id,
      definitionId: dbWorkflow.definition_id,
      agentId: dbWorkflow.agent_id,
      ticketId: dbWorkflow.ticket_id,
      status: dbWorkflow.status as 'active' | 'paused' | 'completed' | 'failed',
      currentState: dbWorkflow.current_state as WorkflowState,
      context: JSON.parse(dbWorkflow.context),
      createdAt: new Date(dbWorkflow.created_at),
      updatedAt: new Date(dbWorkflow.updated_at)
    };
  }
}

export default new WorkflowModel();