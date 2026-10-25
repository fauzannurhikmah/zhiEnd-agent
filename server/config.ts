import { AppConfig } from './types';
import { loadConfigFromDb, saveConfigToDb } from './db/database';

export const DEFAULT_CONFIG: AppConfig = {
  port: 3888,
  securityPin: '',
  activeProject: 'D:\\Works',
  recentProjects: [
    'D:\\Works'
  ],
  antigravity: {
    cliPath: 'C:\\Users\\zhien\\AppData\\Local\\agy\\bin\\agy.exe',
    defaultModel: 'gemini-3.8-flash-high',
    availableModels: [
      { id: 'gemini-3.8-flash-high', name: 'Gemini 3.8 Flash (High Reasoning)' },
      { id: 'gemini-3.8-flash-medium', name: 'Gemini 3.8 Flash (Medium Reasoning)' },
      { id: 'gemini-3.8-flash-low', name: 'Gemini 3.8 Flash (Fast / Low Reasoning)' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6 (Thinking)' },
      { id: 'claude-opus-4-6-thinking', name: 'Claude Opus 4.6 (Thinking)' }
    ]
  },
  telegram: {
    enabled: false,
    botToken: '',
    allowedUsers: []
  },
  whatsapp: {
    enabled: false,
    allowedNumbers: []
  },
  tunnel: {
    enabled: false,
    provider: 'localtunnel',
    subdomain: '',
    publicUrl: ''
  }
};

export function loadConfig(): AppConfig {
  try {
    return loadConfigFromDb();
  } catch (err) {
    console.error('Error loading config from SQLite db, fallback:', err);
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(newConfig: Partial<AppConfig>): void {
  try {
    saveConfigToDb(newConfig);
  } catch (err) {
    console.error('Error saving config to SQLite db:', err);
  }
}
