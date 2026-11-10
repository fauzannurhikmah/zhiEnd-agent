import { ConnectorRecord, ConnectorActionResult, ConnectorStatus } from '../types';
import { getConnectorById, updateConnectorTestResult } from '../db/database';
import { KanbanConnector } from './kanbanConnector';
import { NotionConnector } from './notionConnector';
import { GmailConnector } from './gmailConnector';
import { CalendarConnector } from './calendarConnector';
import { McpConnector } from './mcpConnector';
import { ConnectorExecutor } from './types';

const executors: Record<string, ConnectorExecutor> = {
  kanban: new KanbanConnector(),
  notion: new NotionConnector(),
  gmail: new GmailConnector(),
  calendar: new CalendarConnector(),
  mcp: new McpConnector()
};

export function getExecutor(type: string): ConnectorExecutor {
  const ex = executors[type.toLowerCase()];
  if (!ex) {
    // Default fallback to Kanban/Generic HTTP
    return executors.kanban;
  }
  return ex;
}

export async function testConnector(connector: ConnectorRecord): Promise<{ success: boolean; message: string; latencyMs: number; details?: any }> {
  const executor = getExecutor(connector.type);
  const result = await executor.testConnection(connector);
  
  const status: ConnectorStatus = result.success ? 'online' : 'error';
  updateConnectorTestResult(connector.id, status);

  return result;
}

export async function executeConnectorAction(
  connectorIdOrRecord: string | ConnectorRecord,
  action: string,
  params: Record<string, any> = {}
): Promise<ConnectorActionResult> {
  const connector = typeof connectorIdOrRecord === 'string'
    ? getConnectorById(connectorIdOrRecord)
    : connectorIdOrRecord;

  if (!connector) {
    return {
      success: false,
      connectorId: typeof connectorIdOrRecord === 'string' ? connectorIdOrRecord : 'unknown',
      action,
      error: `Connector "${connectorIdOrRecord}" tidak ditemukan dalam database.`
    };
  }

  if (!connector.is_enabled) {
    return {
      success: false,
      connectorId: connector.id,
      action,
      error: `Connector "${connector.name}" sedang dinonaktifkan (DISABLED).`
    };
  }

  const executor = getExecutor(connector.type);
  return executor.executeAction(connector, action, params);
}

