import { ConnectorRecord, ConnectorActionResult } from '../types';
import { ConnectorExecutor } from './types';

export class GmailConnector implements ConnectorExecutor {
  public async testConnection(connector: ConnectorRecord): Promise<{ success: boolean; message: string; latencyMs: number; details?: any }> {
    const start = Date.now();
    try {
      if (!connector.auth_token) {
        return {
          success: false,
          message: 'OAuth2 Access Token atau App Password untuk Gmail belum diatur.',
          latencyMs: 0
        };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: {
          'Authorization': `Bearer ${connector.auth_token}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - start;
      if (res.ok) {
        const profile = await res.json();
        return {
          success: true,
          message: `Berhasil terhubung ke akun Gmail: ${profile.emailAddress} (${latencyMs}ms)`,
          latencyMs,
          details: profile
        };
      } else {
        const err = await res.json().catch(() => ({}));
        return {
          success: false,
          message: `Gmail API Error (${res.status}): ${err.error?.message || res.statusText}`,
          latencyMs,
          details: err
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal terhubung ke Gmail API: ${err.message}`,
        latencyMs: Date.now() - start,
        details: { error: err.message }
      };
    }
  }

  public async executeAction(connector: ConnectorRecord, action: string, params: Record<string, any> = {}): Promise<ConnectorActionResult> {
    const start = Date.now();
    if (!connector.auth_token) {
      return {
        success: false,
        connectorId: connector.id,
        action,
        error: 'Gmail auth token belum diisi.',
        latencyMs: 0
      };
    }

    const headers = {
      'Authorization': `Bearer ${connector.auth_token}`,
      'Content-Type': 'application/json'
    };

    try {
      switch (action.toLowerCase()) {
        case 'search_emails':
        case 'list_emails': {
          const q = encodeURIComponent(params.query || 'is:unread');
          const maxResults = params.maxResults || 10;
          const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=${maxResults}`, {
            headers
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error?.message || res.statusText);
          return {
            success: true,
            connectorId: connector.id,
            action,
            data: {
              query: params.query || 'is:unread',
              resultSizeEstimate: json.resultSizeEstimate || 0,
              messages: json.messages || []
            },
            latencyMs: Date.now() - start
          };
        }

        case 'create_draft': {
          if (!params.to || !params.subject) {
            throw new Error('Parameter "to" dan "subject" wajib diisi.');
          }
          const rawMessage = [
            `To: ${params.to}`,
            `Subject: ${params.subject}`,
            'Content-Type: text/plain; charset=utf-8',
            '',
            params.body || ''
          ].join('\r\n');

          const encoded = Buffer.from(rawMessage).toString('base64url');
          const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
            method: 'POST',
            headers,
            body: JSON.stringify({ message: { raw: encoded } })
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error?.message || res.statusText);
          return {
            success: true,
            connectorId: connector.id,
            action,
            data: {
              message: `Draft email ke ${params.to} berhasil dibuat.`,
              draft: json
            },
            latencyMs: Date.now() - start
          };
        }

        default:
          throw new Error(`Aksi Gmail "${action}" tidak didukung. Aksi yang didukung: search_emails, create_draft.`);
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

