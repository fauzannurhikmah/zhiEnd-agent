const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'config.json');

const DEFAULT_CONFIG = {
  port: 3888,
  securityPin: '', // optional PIN to access UI from public URL
  activeProject: 'd:/Works/zhiEnd-agent',
  recentProjects: [
    'd:/Works/zhiEnd-agent'
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
    allowedUsers: [] // list of allowed Telegram user IDs or usernames
  },
  whatsapp: {
    enabled: false,
    allowedNumbers: [] // e.g. ['6281234567890@s.whatsapp.net']
  },
  tunnel: {
    enabled: false,
    provider: 'localtunnel', // localtunnel or custom
    subdomain: '',
    publicUrl: ''
  }
};

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function loadConfig() {
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

function saveConfig(newConfig) {
  try {
    ensureDir(path.dirname(CONFIG_PATH));
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving config:', err);
  }
}

module.exports = {
  loadConfig,
  saveConfig,
  CONFIG_PATH
};
