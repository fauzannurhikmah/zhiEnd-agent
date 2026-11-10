import { ConnectorRecord, ConnectorActionResult } from '../types';
import { ConnectorExecutor } from './types';

export class CalendarConnector implements ConnectorExecutor {
  public async testConnection(connector: ConnectorRecord): Promise<{ success: boolean; message: string; latencyMs: number; details?: any }> {
    const start = Date.now();
    try {
      if (!connector.auth_token) {
        return {
          success: false,
          message: 'OAuth2 Access Token untuk Google Calendar belum diatur.',
          latencyMs: 0
        };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=5', {
        headers: {
          'Authorization': `Bearer ${connector.auth_token}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - start;
      if (res.ok) {
        const list = await res.json();
        return {
          success: true,
          message: `Berhasil terhubung ke Google Calendar (${list.items?.length || 0} kalender terdeteksi, ${latencyMs}ms)`,
          latencyMs,
          details: { calendars: list.items?.map((i: any) => i.summary) }
        };
      } else {
        const err = await res.json().catch(() => ({}));
        return {
          success: false,
          message: `Google Calendar Error (${res.status}): ${err.error?.message || res.statusText}`,
          latencyMs,
          details: err
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal terhubung ke Google Calendar: ${err.message}`,
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
        error: 'Google Calendar auth token belum diatur.',
        latencyMs: 0
      };
    }

    const headers = {
      'Authorization': `Bearer ${connector.auth_token}`,
      'Content-Type': 'application/json'
    };

    try {
      switch (action.toLowerCase()) {
        case 'list_events': {
          const timeMin = params.timeMin || new Date().toISOString();
          const maxResults = params.maxResults || 10;
          const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime&maxResults=${maxResults}`;
          const res = await fetch(url, { headers });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error?.message || res.statusText);
          return {
            success: true,
            connectorId: connector.id,
            action,
            data: {
              events: (json.items || []).map((e: any) => ({
                id: e.id,
                summary: e.summary,
                start: e.start?.dateTime || e.start?.date,
                end: e.end?.dateTime || e.end?.date,
                link: e.htmlLink
              }))
            },
            latencyMs: Date.now() - start
          };
        }

        case 'create_event': {
          if (!params.summary || !params.start || !params.end) {
            throw new Error('Parameter "summary", "start", dan "end" wajib diisi.');
          }
          const eventPayload = {
            summary: params.summary,
            description: params.description || '',
            start: { dateTime: new Date(params.start).toISOString() },
            end: { dateTime: new Date(params.end).toISOString() }
          };
          const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers,
            body: JSON.stringify(eventPayload)
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error?.message || res.statusText);
          return {
            success: true,
            connectorId: connector.id,
            action,
            data: {
              message: `Event "${params.summary}" berhasil dijadwalkan.`,
              event: json
            },
            latencyMs: Date.now() - start
          };
        }

        default:
          throw new Error(`Aksi Calendar "${action}" tidak didukung. Aksi yang didukung: list_events, create_event.`);
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

