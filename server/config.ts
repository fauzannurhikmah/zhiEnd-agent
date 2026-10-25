import fs from 'fs';
import path from 'path';
import { AppConfig } from './types';

export const CONFIG_PATH = path.join(__dirname, '..', 'data', 'config.json');

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

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function loadConfig(): AppConfig {
  try {
    ensureDir(path.dirname(CONFIG_PATH));
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error loading config, using default:', err);
  }
  saveConfig(DEFAULT_CONFIG);
  return DEFAULT_CONFIG;
}

export function saveConfig(newConfig: AppConfig): void {
  try {
    ensureDir(path.dirname(CONFIG_PATH));
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving config:', err);
  }
}
