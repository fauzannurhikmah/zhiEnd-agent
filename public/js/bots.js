// Remote Hub: WhatsApp, Telegram, Public Tunnel & Security PIN

class RemoteHubManager {
  constructor() {
    // WhatsApp elements
    this.waBadge = document.getElementById('waStatusBadge');
    this.waQrContainer = document.getElementById('waQrContainer');
    this.waQrImage = document.getElementById('waQrImage');
    this.waConnectedBox = document.getElementById('waConnectedBox');
    this.waUserName = document.getElementById('waUserName');
    this.waUserNumber = document.getElementById('waUserNumber');
    this.waLogoutBtn = document.getElementById('waLogoutBtn');
    this.waStartBox = document.getElementById('waStartBox');
    this.waConnectBtn = document.getElementById('waConnectBtn');

    // Telegram elements
    this.tgBadge = document.getElementById('tgStatusBadge');
    this.tgBotTokenInput = document.getElementById('tgBotToken');
    this.tgSaveTokenBtn = document.getElementById('tgSaveTokenBtn');
    this.tgAllowedUsersInput = document.getElementById('tgAllowedUsers');
    this.tgStartBtn = document.getElementById('tgStartBtn');
    this.tgStopBtn = document.getElementById('tgStopBtn');
    this.tgOpenLink = document.getElementById('tgOpenLink');

    // Tunnel & Network elements
    this.tunnelBadge = document.getElementById('tunnelStatusBadge');
    this.localUrlText = document.getElementById('localUrlText');
    this.copyLocalUrlBtn = document.getElementById('copyLocalUrlBtn');
    this.localQrImg = document.getElementById('localQrImg');
    this.tunnelSubdomain = document.getElementById('tunnelSubdomain');
    this.startTunnelBtn = document.getElementById('startTunnelBtn');
    this.stopTunnelBtn = document.getElementById('stopTunnelBtn');
    this.publicUrlBox = document.getElementById('publicUrlBox');
    this.publicUrlText = document.getElementById('publicUrlText');
    this.copyPublicUrlBtn = document.getElementById('copyPublicUrlBtn');
    this.publicQrWrapper = document.getElementById('publicQrWrapper');
    this.publicQrImg = document.getElementById('publicQrImg');

    // Security PIN elements
    this.settingPinInput = document.getElementById('settingPinInput');
    this.savePinBtn = document.getElementById('savePinBtn');

    // Header pills
    this.headerTgPill = document.getElementById('statusPillTelegram');
    this.headerWaPill = document.getElementById('statusPillWhatsapp');
    this.headerTunnelPill = document.getElementById('statusPillTunnel');

    this.init();
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-security-pin': window.localStorage.getItem('zhiend_pin') || ''
    };
  }

  init() {
    // WhatsApp listeners
    this.waConnectBtn?.addEventListener('click', () => this.startWhatsApp());
    this.waLogoutBtn?.addEventListener('click', () => this.logoutWhatsApp());

    // Telegram listeners
    this.tgSaveTokenBtn?.addEventListener('click', () => this.saveTelegramConfig());
    this.tgStartBtn?.addEventListener('click', () => this.startTelegram());
    this.tgStopBtn?.addEventListener('click', () => this.stopTelegram());

    // Tunnel listeners
    this.copyLocalUrlBtn?.addEventListener('click', () => this.copyToClipboard(this.localUrlText.textContent));
    this.copyPublicUrlBtn?.addEventListener('click', () => this.copyToClipboard(this.publicUrlText.textContent));
    this.startTunnelBtn?.addEventListener('click', () => this.startTunnel());
    this.stopTunnelBtn?.addEventListener('click', () => this.stopTunnel());

    // PIN listener
    this.savePinBtn?.addEventListener('click', () => this.saveSecurityPin());

    // Initial fetch
    this.fetchWhatsAppStatus();
    this.fetchTelegramStatus();
    this.fetchNetworkInfo();
  }

  // --- WHATSAPP LOGIC ---
  async fetchWhatsAppStatus() {
    try {
      const res = await fetch('/api/bots/whatsapp/status', { headers: this.getHeaders() });
      const data = await res.json();
      this.updateWhatsAppUI(data);
    } catch (e) {
      console.error(e);
    }
  }

  updateWhatsAppUI(data) {
    const status = data.status || 'stopped';

    if (status === 'connected') {
      this.waBadge.className = 'badge badge-emerald';
      this.waBadge.textContent = 'Connected';
      this.headerWaPill.classList.add('online');

      this.waQrContainer.classList.add('hidden');
      this.waStartBox.classList.add('hidden');
      this.waConnectedBox.classList.remove('hidden');

      const name = data.user?.name || data.user?.notify || 'Akun WhatsApp';
      const number = data.user?.id?.split(':')[0] || '';
      this.waUserName.textContent = name;
      this.waUserNumber.textContent = '+' + number;

    } else if (status === 'qr_ready') {
      this.waBadge.className = 'badge badge-amber';
      this.waBadge.textContent = 'Scan QR Code';
      this.headerWaPill.classList.remove('online');

      this.waConnectedBox.classList.add('hidden');
      this.waStartBox.classList.add('hidden');
      this.waQrContainer.classList.remove('hidden');

      if (data.qrCodeDataUrl) {
        this.waQrImage.src = data.qrCodeDataUrl;
      }

    } else if (status === 'connecting') {
      this.waBadge.className = 'badge badge-amber';
      this.waBadge.textContent = 'Connecting...';
      this.headerWaPill.classList.remove('online');

    } else {
      this.waBadge.className = 'badge badge-neutral';
      this.waBadge.textContent = 'Disconnected';
      this.headerWaPill.classList.remove('online');

      this.waQrContainer.classList.add('hidden');
      this.waConnectedBox.classList.add('hidden');
      this.waStartBox.classList.remove('hidden');
    }
  }

  async startWhatsApp() {
    this.waConnectBtn.disabled = true;
    this.waConnectBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan WhatsApp...`;

    try {
      const res = await fetch('/api/bots/whatsapp/start', {
        method: 'POST',
        headers: this.getHeaders()
      });
      const data = await res.json();
      this.fetchWhatsAppStatus();
    } catch (e) {
      alert('Gagal memulai WhatsApp: ' + e.message);
    } finally {
      this.waConnectBtn.disabled = false;
      this.waConnectBtn.innerHTML = `<i class="fa-solid fa-link"></i> Hubungkan WhatsApp`;
    }
  }

  async logoutWhatsApp() {
    if (!confirm('Apakah Anda yakin ingin memutuskan hubungan WhatsApp?')) return;
    try {
      await fetch('/api/bots/whatsapp/logout', {
        method: 'POST',
        headers: this.getHeaders()
      });
      this.fetchWhatsAppStatus();
    } catch (e) {
      console.error(e);
    }
  }

  // --- TELEGRAM LOGIC ---
  async fetchTelegramStatus() {
    try {
      const res = await fetch('/api/bots/telegram/status', { headers: this.getHeaders() });
      const data = await res.json();
      this.updateTelegramUI(data);
    } catch (e) {
      console.error(e);
    }
  }

  updateTelegramUI(data) {
    const isRunning = data.status === 'running';

    if (isRunning) {
      this.tgBadge.className = 'badge badge-emerald';
      this.tgBadge.textContent = 'Online (@' + (data.botInfo?.username || 'bot') + ')';
      this.headerTgPill.classList.add('online');

      this.tgStartBtn.classList.add('hidden');
      this.tgStopBtn.classList.remove('hidden');

      if (data.botInfo?.username) {
        this.tgOpenLink.href = `https://t.me/${data.botInfo.username}`;
        this.tgOpenLink.classList.remove('hidden');
      }
    } else {
      this.tgBadge.className = 'badge badge-neutral';
      this.tgBadge.textContent = data.error ? 'Error' : 'Stopped';
      this.headerTgPill.classList.remove('online');

      this.tgStartBtn.classList.remove('hidden');
      this.tgStopBtn.classList.add('hidden');
      this.tgOpenLink.classList.add('hidden');
    }
  }

  async saveTelegramConfig() {
    const token = this.tgBotTokenInput.value.trim();
    const usersStr = this.tgAllowedUsersInput.value.trim();
    const allowedUsers = usersStr ? usersStr.split(',').map(s => s.trim()).filter(Boolean) : [];

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          telegram: {
            botToken: token,
            allowedUsers
          }
        })
      });
      alert('Pengaturan Telegram berhasil disimpan.');
    } catch (e) {
      alert('Gagal menyimpan: ' + e.message);
    }
  }

  async startTelegram() {
    const token = this.tgBotTokenInput.value.trim();
    this.tgStartBtn.disabled = true;
    this.tgStartBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menghubungkan...`;

    try {
      const res = await fetch('/api/bots/telegram/start', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (!data.success) {
        alert('Gagal: ' + (data.error || 'Token tidak valid'));
      }
      this.fetchTelegramStatus();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      this.tgStartBtn.disabled = false;
      this.tgStartBtn.innerHTML = `<i class="fa-solid fa-play"></i> Jalankan Bot`;
    }
  }

  async stopTelegram() {
    try {
      await fetch('/api/bots/telegram/stop', {
        method: 'POST',
        headers: this.getHeaders()
      });
      this.fetchTelegramStatus();
    } catch (e) {
      console.error(e);
    }
  }

  // --- NETWORK & TUNNEL LOGIC ---
  async fetchNetworkInfo() {
    try {
      const res = await fetch('/api/network/info', { headers: this.getHeaders() });
      const data = await res.json();

      this.localUrlText.textContent = data.localUrl || 'http://localhost:3888';
      if (data.localQr) {
        this.localQrImg.src = data.localQr;
      }

      this.updateTunnelUI(data);
    } catch (e) {
      console.error(e);
    }
  }

  updateTunnelUI(data) {
    const isConnected = data.status === 'connected' && !!data.publicUrl;

    if (isConnected) {
      this.tunnelBadge.className = 'badge badge-emerald';
      this.tunnelBadge.textContent = 'Public Live';
      this.headerTunnelPill.classList.add('online');

      this.startTunnelBtn.classList.add('hidden');
      this.stopTunnelBtn.classList.remove('hidden');

      this.publicUrlBox.classList.remove('hidden');
      this.publicUrlText.textContent = data.publicUrl;

      if (data.publicQr) {
        this.publicQrWrapper.classList.remove('hidden');
        this.publicQrImg.src = data.publicQr;
      }
    } else if (data.status === 'connecting') {
      this.tunnelBadge.className = 'badge badge-amber';
      this.tunnelBadge.textContent = 'Opening Tunnel...';
      this.headerTunnelPill.classList.remove('online');
    } else {
      this.tunnelBadge.className = 'badge badge-neutral';
      this.tunnelBadge.textContent = 'Local Only';
      this.headerTunnelPill.classList.remove('online');

      this.startTunnelBtn.classList.remove('hidden');
      this.stopTunnelBtn.classList.add('hidden');
      this.publicUrlBox.classList.add('hidden');
      this.publicQrWrapper.classList.add('hidden');
    }
  }

  async startTunnel() {
    const subdomain = this.tunnelSubdomain.value.trim();
    this.startTunnelBtn.disabled = true;
    this.startTunnelBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menghubungkan Tunnel...`;

    try {
      const res = await fetch('/api/tunnel/start', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ subdomain })
      });
      const data = await res.json();
      if (!data.success) {
        alert('Gagal membuka tunnel: ' + (data.error || 'Server sibuk'));
      }
      this.fetchNetworkInfo();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      this.startTunnelBtn.disabled = false;
      this.startTunnelBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Buka Akses Publik (Start Tunnel)`;
    }
  }

  async stopTunnel() {
    try {
      await fetch('/api/tunnel/stop', {
        method: 'POST',
        headers: this.getHeaders()
      });
      this.fetchNetworkInfo();
    } catch (e) {
      console.error(e);
    }
  }

  async saveSecurityPin() {
    const pin = this.settingPinInput.value.trim();
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ securityPin: pin })
      });
      window.localStorage.setItem('zhiend_pin', pin);
      alert('Security PIN berhasil disimpan!');
    } catch (e) {
      alert('Gagal menyimpan PIN: ' + e.message);
    }
  }

  copyToClipboard(text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      alert('Tautan disalin ke clipboard:\n' + text);
    }).catch(e => {
      prompt('Salin link ini:', text);
    });
  }
}

window.remoteHub = new RemoteHubManager();
