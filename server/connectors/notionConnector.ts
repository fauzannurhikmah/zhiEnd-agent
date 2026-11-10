import { ConnectorRecord, ConnectorActionResult } from '../types';
import { ConnectorExecutor } from './types';

export class NotionConnector implements ConnectorExecutor {
  public async testConnection(connector: ConnectorRecord): Promise<{ success: boolean; message: string; latencyMs: number; details?: any }> {
    const start = Date.now();
    try {
      if (!connector.auth_token) {
        return {
          success: false,
          message: 'Token Notion Internal Integration Secret belum diatur.',
          latencyMs: 0
        };
      }

      const settings = connector.settings_json ? JSON.parse(connector.settings_json) : {};
      const notionVersion = settings.notionVersion || '2022-06-28';

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${connector.auth_token}`,
          'Notion-Version': notionVersion,
          'User-Agent': 'zhiEnd-Agent-Notion/1.0'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - start;
      if (res.ok) {
        const user = await res.json();
        return {
          success: true,
          message: `Berhasil terhubung ke Notion Workspace sebagai "${user.name || user.id}" (${latencyMs}ms)`,
          latencyMs,
          details: user
        };
      } else {
        const errorJson = await res.json().catch(() => ({}));
        return {
          success: false,
          message: `Notion API Error (${res.status}): ${errorJson.message || res.statusText}`,
          latencyMs,
          details: errorJson
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal menghubungi Notion API: ${err.message}`,
        latencyMs: Date.now() - start,
        details: { error: err.message }
      };
    }
  }

  public async executeAction(connector: ConnectorRecord, action: string, params: Record<string, any> = {}): Promise<ConnectorActionResult> {
    const start = Date.now();
    const settings = connector.settings_json ? JSON.parse(connector.settings_json) : {};
    const notionVersion = settings.notionVersion || '2022-06-28';

    if (!connector.auth_token) {
      return {
        success: false,
        connectorId: connector.id,
        action,
        error: 'Notion integration token belum dikonfigurasi.',
        latencyMs: 0
      };
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${connector.auth_token}`,
      'Notion-Version': notionVersion,
      'Content-Type': 'application/json',
      'User-Agent': 'zhiEnd-Agent-Notion/1.0'
    };

    try {
      switch (action.toLowerCase()) {
        case 'search': {
          const query = params.query || '';
          const res = await fetch('https://api.notion.com/v1/search', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              query,
              page_size: params.limit || 10,
              filter: params.filter || undefined
            })
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.message || res.statusText);
          return {
            success: true,
            connectorId: connector.id,
            action,
            data: {
              query,
              totalResults: json.results?.length || 0,
              results: json.results
            },
            latencyMs: Date.now() - start
          };
        }

        case 'query_database': {
          const dbId = params.databaseId || settings.defaultDatabaseId;
          if (!dbId) throw new Error('Parameter "databaseId" wajib diisi.');
          const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              filter: params.filter,
              sorts: params.sorts,
              page_size: params.limit || 20
            })
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.message || res.statusText);
          return {
            success: true,
            connectorId: connector.id,
            action,
            data: {
              databaseId: dbId,
              rows: json.results
            },
            latencyMs: Date.now() - start
          };
        }

        case 'create_page': {
          const parentId = params.parentId || settings.defaultDatabaseId;
          if (!parentId) throw new Error('Parameter "parentId" (database ID atau parent page ID) wajib diisi.');
          const bodyPayload: any = {
            parent: params.isParentPage ? { page_id: parentId } : { database_id: parentId },
            properties: params.properties || {
              title: {
                title: [{ text: { content: params.title || 'Untitled Page' } }]
              }
            }
          };
          if (params.content) {
            bodyPayload.children = [
              {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                  rich_text: [{ type: 'text', text: { content: params.content } }]
                }
              }
            ];
          }
          const res = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers,
            body: JSON.stringify(bodyPayload)
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.message || res.statusText);
          return {
            success: true,
            connectorId: connector.id,
            action,
            data: {
              message: 'Halaman Notion berhasil dibuat.',
              page: json
            },
            latencyMs: Date.now() - start
          };
        }

        default:
          throw new Error(`Aksi Notion "${action}" tidak didukung. Aksi yang didukung: search, query_database, create_page.`);
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

