// Chat and Antigravity Agent interaction module

class ChatManager {
  constructor() {
    this.messagesList = document.getElementById('messagesList');
    this.viewport = document.getElementById('messagesViewport');
    this.promptInput = document.getElementById('promptTextarea');
    this.sendBtn = document.getElementById('sendPromptBtn');
    this.cancelBtn = document.getElementById('cancelAgentBtn');
    this.clearBtn = document.getElementById('clearChatBtn');
    this.statusIndicator = document.getElementById('agentActiveStatus');
    this.busyPulse = document.getElementById('agentBusyIndicator');

    this.currentStreamingMsgId = null;
    this.currentStreamingText = '';

    this.init();
  }

  init() {
    // Send on click
    this.sendBtn.addEventListener('click', () => this.sendPrompt());

    // Send on Ctrl+Enter
    this.promptInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.sendPrompt();
      }
    });

    // Cancel execution
    this.cancelBtn.addEventListener('click', () => this.cancelTask());

    // Clear chat
    this.clearBtn.addEventListener('click', () => {
      this.messagesList.innerHTML = '';
    });

    // Quick chips
    document.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-prompt');
        this.promptInput.value = text;
        this.promptInput.focus();
      });
    });
  }

  setBusy(isBusy, text = 'Agent sedang bekerja...') {
    if (isBusy) {
      this.statusIndicator.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-amber"></i> ${text}`;
      this.busyPulse.style.display = 'inline-block';
      this.cancelBtn.classList.remove('hidden');
      this.sendBtn.disabled = true;
    } else {
      this.statusIndicator.innerHTML = `<i class="fa-solid fa-circle-check text-success"></i> Standby & Ready`;
      this.busyPulse.style.display = 'none';
      this.cancelBtn.classList.add('hidden');
      this.sendBtn.disabled = false;
    }
  }

  appendUserMessage(text) {
    const msgWrapper = document.createElement('div');
    msgWrapper.className = 'msg-wrapper user';
    msgWrapper.innerHTML = `
      <div class="msg-bubble">
        <p>${this.escapeHtml(text)}</p>
      </div>
    `;
    this.messagesList.appendChild(msgWrapper);
    this.scrollToBottom();
  }

  createAgentMessage() {
    const msgId = 'msg_' + Date.now();
    const msgWrapper = document.createElement('div');
    msgWrapper.className = 'msg-wrapper agent';
    msgWrapper.id = msgId;

    msgWrapper.innerHTML = `
      <div class="msg-bubble">
        <div class="tool-calls-box" id="${msgId}_tools"></div>
        <div class="markdown-body" id="${msgId}_body">
          <span class="typing-dots"><i class="fa-solid fa-circle-notch fa-spin"></i> Antigravity sedang berpikir...</span>
        </div>
      </div>
    `;

    this.messagesList.appendChild(msgWrapper);
    this.scrollToBottom();

    this.currentStreamingMsgId = msgId;
    this.currentStreamingText = '';
    return msgId;
  }

  handleToolStep(step) {
    if (!this.currentStreamingMsgId) return;
    const toolsBox = document.getElementById(`${this.currentStreamingMsgId}_tools`);
    if (!toolsBox) return;

    if (step.stepType === 'tool_execution' || step.stepType === 'tool_call') {
      const pill = document.createElement('span');
      pill.className = 'tool-pill';
      pill.innerHTML = `<i class="fa-solid fa-wrench"></i> ${step.stepType}: ${step.state || 'running'}`;
      toolsBox.appendChild(pill);
      this.scrollToBottom();
    }
  }

  handleDelta(delta, accumulated) {
    if (!this.currentStreamingMsgId) {
      this.createAgentMessage();
    }
    this.currentStreamingText = accumulated || (this.currentStreamingText + delta);
    const bodyEl = document.getElementById(`${this.currentStreamingMsgId}_body`);
    if (bodyEl) {
      bodyEl.innerHTML = marked.parse(this.currentStreamingText);
      // Syntax highlight code blocks
      bodyEl.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    }
    this.scrollToBottom();
  }

  finalizeAgentMessage(response) {
    if (this.currentStreamingMsgId) {
      const bodyEl = document.getElementById(`${this.currentStreamingMsgId}_body`);
      if (bodyEl) {
        const text = response || this.currentStreamingText || '(Selesai tanpa respon teks)';
        bodyEl.innerHTML = marked.parse(text);
        bodyEl.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightElement(block);
        });
      }
    }
    this.currentStreamingMsgId = null;
    this.currentStreamingText = '';
    this.setBusy(false);
  }

  async sendPrompt() {
    const prompt = this.promptInput.value.trim();
    if (!prompt) return;

    const modelSelector = document.getElementById('modelSelector');
    const selectedModel = modelSelector ? modelSelector.value : 'gemini-3.8-flash-high';

    this.appendUserMessage(prompt);
    this.promptInput.value = '';
    this.setBusy(true, 'Antigravity sedang memproses instruksi...');
    this.createAgentMessage();

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-security-pin': window.localStorage.getItem('zhiend_pin') || ''
        },
        body: JSON.stringify({
          prompt,
          model: selectedModel
        })
      });

      const data = await res.json();
      if (!res.ok) {
        this.finalizeAgentMessage(`⚠️ Error: ${data.error || 'Gagal memulai tugas'}`);
      }
    } catch (err) {
      this.finalizeAgentMessage(`⚠️ Gagal menghubungi server: ${err.message}`);
    }
  }

  async cancelTask() {
    try {
      await fetch('/api/agent/cancel', {
        method: 'POST',
        headers: {
          'x-security-pin': window.localStorage.getItem('zhiend_pin') || ''
        }
      });
      this.finalizeAgentMessage('🛑 Tugas dibatalkan oleh pengguna.');
    } catch (err) {
      console.error(err);
    }
  }

  scrollToBottom() {
    this.viewport.scrollTop = this.viewport.scrollHeight;
  }

  escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }
}

window.chatManager = new ChatManager();
