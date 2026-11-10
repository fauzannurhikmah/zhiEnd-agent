import { ConnectorRecord, ConnectorActionResult } from '../types';

export interface ConnectorExecutor {
  testConnection(connector: ConnectorRecord): Promise<{ success: boolean; message: string; latencyMs: number; details?: any }>;
  executeAction(connector: ConnectorRecord, action: string, params: Record<string, any>): Promise<ConnectorActionResult>;
}

export interface KanbanTaskItem {
  id: string;
  title: string;
  description?: string;
  status: string; // 'Todo' | 'In Progress' | 'Testing' | 'Done' | etc.
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  tags?: string[];
  url?: string;
  createdAt?: string;
  updatedAt?: string;
}

