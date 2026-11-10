import { executeConnectorAction, testConnector } from './index';
import { getConnectorById, getAllConnectors } from '../db/database';

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
=== zhiEnd MCV / MCP Connectors Hub CLI ===
Usage:
  npx tsx server/connectors/cli.ts list
  npx tsx server/connectors/cli.ts test <connectorId>
  npx tsx server/connectors/cli.ts run <connectorId> <action> [paramsJson]

Examples:
  npx tsx server/connectors/cli.ts run conn-sehati-kanban get_tasks
  npx tsx server/connectors/cli.ts run conn-sehati-kanban create_task '{"title":"Perbaiki Server Hot Reload"}'
  npx tsx server/connectors/cli.ts test conn-notion
    `);
    process.exit(0);
  }

  const cmd = args[0];

  if (cmd === 'list') {
    const list = getAllConnectors();
    console.log(JSON.stringify(list.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      baseUrl: c.base_url,
      isEnabled: c.is_enabled,
      status: c.last_status,
      lastTested: c.last_tested_at
    })), null, 2));
    process.exit(0);
  }

  if (cmd === 'test') {
    const id = args[1];
    if (!id) {
      console.error('Error: Masukkan connectorId untuk di-test.');
      process.exit(1);
    }
    const conn = getConnectorById(id);
    if (!conn) {
      console.error(`Error: Connector "${id}" tidak ditemukan.`);
      process.exit(1);
    }
    const res = await testConnector(conn);
    console.log(JSON.stringify(res, null, 2));
    process.exit(res.success ? 0 : 1);
  }

  if (cmd === 'run' || args.length >= 2) {
    const id = cmd === 'run' ? args[1] : args[0];
    const action = cmd === 'run' ? args[2] : args[1];
    const rawParams = (cmd === 'run' ? args.slice(3) : args.slice(2)).join(' ');
    let params: Record<string, any> = {};
    if (rawParams && rawParams.trim()) {
      const trimmed = rawParams.trim();
      if (!trimmed.startsWith('{') && trimmed.includes('=')) {
        // Parse key=value arguments (e.g. title="New Task" status=Todo)
        const kvMatches = trimmed.match(/(\w+)=("[^"]*"|'[^']*'|[^\s]+)/g);
        if (kvMatches && kvMatches.length > 0) {
          for (const kv of kvMatches) {
            const eqIdx = kv.indexOf('=');
            const k = kv.slice(0, eqIdx);
            const v = kv.slice(eqIdx + 1).replace(/^["']|["']$/g, '');
            params[k] = v;
          }
        }
      } else {
        try {
          params = JSON.parse(trimmed);
        } catch {
          try {
            // Fallback parsing for PowerShell single/double quote stripping
            let normalized = trimmed;
            if ((normalized.startsWith("'") && normalized.endsWith("'")) || (normalized.startsWith('"') && normalized.endsWith('"'))) {
              normalized = normalized.slice(1, -1);
            }
            params = JSON.parse(normalized);
          } catch {
            try {
              const fixed = trimmed
                .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
                .replace(/:\s*([^,{}]+)([,}])/g, (m, val, end) => `:"${val.trim().replace(/^["']|["']$/g, '')}"${end}`);
              params = JSON.parse(fixed);
            } catch (e: any) {
              console.error('Error: Parameter JSON / key=value tidak valid:', e.message);
              process.exit(1);
            }
          }
        }
      }
    }

    const res = await executeConnectorAction(id, action, params);
    console.log(JSON.stringify(res, null, 2));
    process.exit(res.success ? 0 : 1);
  }
}

main().catch(err => {
  console.error('Connector CLI Fatal Error:', err);
  process.exit(1);
});
