// Main Application Controller & Socket.io Integration

class App {
  constructor() {
    this.socket = null;
    this.activeProjectPathEl = document.getElementById('activeProjectPath');
    this.projectPickerBtn = document.getElementById('projectPickerBtn');
    this.projectModal = document.getElementById('projectModal');
    this.closeProjectModalBtn = document.getElementById('closeProjectModalBtn');
    this.newProjectPathInput = document.getElementById('newProjectPathInput');
    this.selectCustomPathBtn = document.getElementById('selectCustomPathBtn');
    this.recentProjectsList = document.getElementById('recentProjectsList');

    this.modelSelector = document.getElementById('modelSelector');
    this.fileTreeContainer = document.getElementById('fileTreeContainer');
    this.refreshFilesBtn = document.getElementById('refreshFilesBtn');
    this.terminalLogs = document.getElementById('terminalLogs');
    this.clearLogsBtn = document.getElementById('clearLogsBtn');

    // PIN Overlay
    this.pinOverlay = document.getElementById('pinOverlay');
    this.pinInput = document.getElementById('pinInput');
    this.pinSubmitBtn = document.getElementById('pinSubmitBtn');
    this.pinError = document.getElementById('pinError');

    this.init();
  }

  async init() {
    this.setupTabs();
    this.setupProjectModal();
    this.setupLogs();
    this.checkPinAuth();
    this.initSocket();
    await this.loadConfig();
    await this.loadFiles();
    window.gitUI?.loadStatus();
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-security-pin': window.localStorage.getItem('zhiend_pin') || ''
    };
  }

  // --- PIN AUTH ---
  async checkPinAuth() {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      if (data.hasPin) {
        const savedPin = window.localStorage.getItem('zhiend_pin');
        if (!savedPin) {
          this.pinOverlay.classList.remove('hidden');
        } else {
          // verify
          const authRes = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: savedPin })
          });
          if (!authRes.ok) {
            this.pinOverlay.classList.remove('hidden');
          }
        }
      }
    } catch (e) {
      console.error(e);
    }

    this.pinSubmitBtn?.addEventListener('click', () => this.submitPin());
    this.pinInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submitPin();
    });
  }

  async submitPin() {
    const pin = this.pinInput.value.trim();
    if (!pin) return;

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      if (data.success) {
        window.localStorage.setItem('zhiend_pin', pin);
        this.pinOverlay.classList.add('hidden');
        this.loadConfig();
        window.gitUI?.loadStatus();
      } else {
        this.pinError.classList.remove('hidden');
      }
    } catch (e) {
      this.pinError.classList.remove('hidden');
    }
  }

  // --- TABS ---
  setupTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const panes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetId = tab.getAttribute('data-tab');
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');

        if (targetId === 'tab-git') {
          window.gitUI?.loadStatus();
        } else if (targetId === 'tab-files') {
          this.loadFiles();
        }
      });
    });
  }

  // --- SOCKET.IO ---
  initSocket() {
    this.socket = io();

    this.socket.on('connect', () => {
      this.log('Connected to zhiEnd Agent Real-Time Bridge.', 'success');
    });

    this.socket.on('disconnect', () => {
      this.log('Disconnected from agent bridge.', 'warn');
    });

    // Agent Events
    this.socket.on('agent_task_start', (data) => {
      this.log(`[Task Started] ${data.prompt.slice(0, 80)}... (Model: ${data.model})`, 'info');
      window.chatManager?.setBusy(true, 'Antigravity sedang memproses...');
    });

    this.socket.on('agent_init', (data) => {
      this.log(`[Antigravity Init] Session ID: ${data.conversationId} | Active Tools: ${data.tools.length}`, 'info');
    });

    this.socket.on('agent_delta', (data) => {
      window.chatManager?.handleDelta(data.delta, data.accumulated);
    });

    this.socket.on('agent_step', (data) => {
      window.chatManager?.handleToolStep(data);
      if (data.stepType === 'tool_execution') {
        this.log(`[Tool] ${data.stepType} -> ${data.state}`, 'info');
      }
    });

    this.socket.on('agent_task_end', (data) => {
      this.log(`[Task Completed] Status: ${data.status} in ${data.duration}`, 'success');
      window.chatManager?.finalizeAgentMessage(data.response);
      window.gitUI?.loadStatus();
    });

    this.socket.on('agent_task_cancelled', () => {
      this.log('[Task Cancelled by user]', 'warn');
      window.chatManager?.finalizeAgentMessage('🛑 Tugas dibatalkan.');
    });

    this.socket.on('agent_task_error', (data) => {
      this.log(`[Agent Error] ${data.error}`, 'error');
      window.chatManager?.finalizeAgentMessage(`❌ Error: ${data.error}`);
    });

    // Remote Bots Events
    this.socket.on('whatsapp_qr', (data) => {
      window.remoteHub?.updateWhatsAppUI({ status: 'qr_ready', qrCodeDataUrl: data.qrDataUrl });
    });

    this.socket.on('whatsapp_status', (data) => {
      window.remoteHub?.updateWhatsAppUI(data);
    });

    this.socket.on('tunnel_status', (data) => {
      window.remoteHub?.updateTunnelUI(data);
    });

    this.socket.on('project_changed', (data) => {
      this.activeProjectPathEl.textContent = data.activeProject;
      this.log(`[Project Switched] Active: ${data.activeProject}`, 'success');
      window.gitUI?.loadStatus();
      this.loadFiles();
    });
  }

  // --- CONFIG & PROJECTS ---
  async loadConfig() {
    try {
      const res = await fetch('/api/config', { headers: this.getHeaders() });
      const data = await res.json();

      this.activeProjectPathEl.textContent = data.activeProject || 'None';
      if (data.antigravity?.defaultModel && this.modelSelector) {
        this.modelSelector.value = data.antigravity.defaultModel;
      }

      this.renderRecentProjects(data.recentProjects || []);
    } catch (e) {
      console.error(e);
    }
  }

  setupProjectModal() {
    this.projectPickerBtn?.addEventListener('click', () => {
      this.projectModal.classList.remove('hidden');
    });

    this.closeProjectModalBtn?.addEventListener('click', () => {
      this.projectModal.classList.add('hidden');
    });

    this.selectCustomPathBtn?.addEventListener('click', async () => {
      const customPath = this.newProjectPathInput.value.trim();
      if (!customPath) return;

      try {
        const res = await fetch('/api/projects/select', {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ path: customPath })
        });
        const data = await res.json();
        if (data.success) {
          this.projectModal.classList.add('hidden');
          this.newProjectPathInput.value = '';
          this.loadConfig();
        } else {
          alert('Gagal membuka project: ' + (data.error || 'Direktori tidak ditemukan'));
        }
      } catch (e) {
        alert('Error: ' + e.message);
      }
    });

    this.modelSelector?.addEventListener('change', async (e) => {
      const newModel = e.target.value;
      try {
        await fetch('/api/config', {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ defaultModel: newModel })
        });
        this.log(`Model switched to: ${newModel}`, 'info');
      } catch (err) {
        console.error(err);
      }
    });
  }

  renderRecentProjects(projects) {
    if (!this.recentProjectsList) return;
    this.recentProjectsList.innerHTML = '';

    projects.forEach(p => {
      const item = document.createElement('div');
      item.className = 'recent-project-item';
      item.innerHTML = `<i class="fa-regular fa-folder"></i> ${p}`;
      item.addEventListener('click', async () => {
        try {
          const res = await fetch('/api/projects/select', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ path: p })
          });
          const data = await res.json();
          if (data.success) {
            this.projectModal.classList.add('hidden');
            this.loadConfig();
          }
        } catch (e) {
          console.error(e);
        }
      });
      this.recentProjectsList.appendChild(item);
    });
  }

  // --- FILES EXPLORER ---
  async loadFiles() {
    this.fileTreeContainer.innerHTML = '<div class="loading-state">Memuat struktur file...</div>';
    try {
      const res = await fetch('/api/projects/files', { headers: this.getHeaders() });
      const data = await res.json();

      if (!data.files || data.files.length === 0) {
        this.fileTreeContainer.innerHTML = '<div class="text-muted p-2">Direktori kosong.</div>';
        return;
      }

      this.fileTreeContainer.innerHTML = '';
      this.renderTree(data.files, this.fileTreeContainer);
    } catch (e) {
      this.fileTreeContainer.innerHTML = `<div class="text-rose p-2">Gagal memuat file: ${e.message}</div>`;
    }
  }

  renderTree(items, container) {
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'tree-item';

      if (item.isDirectory) {
        el.innerHTML = `<i class="fa-solid fa-folder text-amber"></i> <span>${item.name}</span>`;
        container.appendChild(el);

        if (item.children && item.children.length > 0) {
          const subContainer = document.createElement('div');
          subContainer.style.paddingLeft = '14px';
          this.renderTree(item.children, subContainer);
          container.appendChild(subContainer);
        }
      } else {
        const ext = item.name.split('.').pop();
        const icon = ext === 'js' || ext === 'ts' ? 'fa-brands fa-js text-amber' : (ext === 'html' ? 'fa-brands fa-html5 text-rose' : (ext === 'css' ? 'fa-brands fa-css3-alt text-sky' : (ext === 'json' ? 'fa-solid fa-code text-violet' : 'fa-regular fa-file text-muted')));
        el.innerHTML = `<i class="${icon}"></i> <span>${item.name}</span>`;
        container.appendChild(el);
      }
    });
  }

  // --- LOGS ---
  setupLogs() {
    this.refreshFilesBtn?.addEventListener('click', () => this.loadFiles());
    this.clearLogsBtn?.addEventListener('click', () => {
      this.terminalLogs.innerHTML = '';
    });
  }

  log(msg, type = 'info') {
    if (!this.terminalLogs) return;
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    const time = new Date().toLocaleTimeString();
    line.textContent = `[${time}] ${msg}`;
    this.terminalLogs.appendChild(line);
    this.terminalLogs.scrollTop = this.terminalLogs.scrollHeight;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
