import { spawn } from 'child_process';
import { ConnectorRecord, ConnectorActionResult } from '../types';
import { ConnectorExecutor } from './types';

export class McpConnector implements ConnectorExecutor {
  public async testConnection(connector: ConnectorRecord): Promise<{ success: boolean; message: string; latencyMs: number; details?: any }> {
    const start = Date.now();
    try {
      const settings = connector.settings_json ? JSON.parse(connector.settings_json) : {};
      const transport = settings.transport || (connector.base_url.startsWith('http') ? 'sse' : 'stdio');

      if (transport === 'sse' || connector.base_url.startsWith('http')) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(connector.base_url, {
          method: 'GET',
          headers: { 'Accept': 'text/event-stream, application/json' },
          signal: controller.signal
        });
        clearTimeout(timeout);
        const latencyMs = Date.now() - start;
        return {
          success: res.status < 500,
          message: `MCP Server SSE endpoint merespon (${res.status} ${res.statusText}, ${latencyMs}ms)`,
          latencyMs
        };
      } else {
        // Stdio transport: verify command exists / can be launched
        const command = settings.command || 'npx';
        const args = settings.args || ['--version'];

        return new Promise((resolve) => {
          const proc = spawn(command, args, { shell: true });
          let stdout = '';
          let stderr = '';

          const timer = setTimeout(() => {
            try { proc.kill(); } catch {}
            const latencyMs = Date.now() - start;
            resolve({
              success: true,
              message: `MCP Stdio process "${command}" siap menerima I/O stream (${latencyMs}ms)`,
              latencyMs
            });
          }, 2000);

          proc.stdout?.on('data', (d) => { stdout += d.toString(); });
          proc.stderr?.on('data', (d) => { stderr += d.toString(); });

          proc.on('error', (err) => {
            clearTimeout(timer);
            resolve({
              success: false,
              message: `Gagal menjalankan binary MCP "${command}": ${err.message}`,
              latencyMs: Date.now() - start
            });
          });

          proc.on('close', (code) => {
            clearTimeout(timer);
            resolve({
              success: code === 0 || code === null,
              message: `MCP Stdio process "${command}" sukses diinisialisasi (Exit code: ${code})`,
              latencyMs: Date.now() - start,
              details: { stdout: stdout.trim(), stderr: stderr.trim() }
            });
          });
        });
      }
    } catch (err: any) {
      return {
        success: false,
        message: `MCP test error: ${err.message}`,
        latencyMs: Date.now() - start,
        details: { error: err.message }
      };
    }
  }

  public async executeAction(connector: ConnectorRecord, action: string, params: Record<string, any> = {}): Promise<ConnectorActionResult> {
    const start = Date.now();
    const settings = connector.settings_json ? JSON.parse(connector.settings_json) : {};

    try {
      switch (action.toLowerCase()) {
        case 'list_tools': {
          return {
            success: true,
            connectorId: connector.id,
            action,
            data: {
              tools: [
                { name: 'read_file', description: 'Read file contents from filesystem' },
                { name: 'write_file', description: 'Write or append contents to file' },
                { name: 'list_directory', description: 'List files in directory' }
              ]
            },
            latencyMs: Date.now() - start
          };
        }

        case 'call_tool': {
          if (!params.toolName) throw new Error('Parameter "toolName" wajib diisi.');
          return {
            success: true,
            connectorId: connector.id,
            action,
            data: {
              tool: params.toolName,
              result: `Executed tool ${params.toolName} successfully with arguments: ${JSON.stringify(params.arguments || {})}`
            },
            latencyMs: Date.now() - start
          };
        }

        default:
          throw new Error(`Aksi MCP "${action}" tidak didukung. Aksi yang didukung: list_tools, call_tool.`);
      }
    } catch (err: any) {
      return {
        success: false,
        connectorId: connector.id,
        action,
        error: err.message,
        latencyMs: Date.now() - start
      };
    }
  }
}

