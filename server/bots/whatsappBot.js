const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const EventEmitter = require('events');

class WhatsAppBotManager extends EventEmitter {
  constructor({ config, agentRunner, gitManager, onProjectChange }) {
    super();
    this.config = config;
    this.agentRunner = agentRunner;
    this.gitManager = gitManager;
    this.onProjectChange = onProjectChange;
    this.sock = null;
    this.status = 'stopped'; // 'stopped' | 'connecting' | 'qr_ready' | 'connected' | 'error'
    this.qrCodeDataUrl = null;
    this.user = null;
    this.errorMessage = null;
    this.authPath = path.join(__dirname, '..', '..', 'data', 'baileys_auth');
  }

  isAuthorized(senderJid) {
    const allowed = this.config.whatsapp?.allowedNumbers || [];
    if (!allowed || allowed.length === 0) {
      return true; // allow all if no restriction configured
    }
    const cleanSender = senderJid.replace(/[^0-9]/g, '');
    return allowed.some(num => {
      const cleanAllowed = String(num).replace(/[^0-9]/g, '');
      return cleanSender.includes(cleanAllowed) || cleanAllowed.includes(cleanSender);
    });
  }

  async start() {
    if (this.sock && this.status === 'connected') {
      return { success: true, message: 'Already connected' };
    }

    try {
      this.status = 'connecting';
      this.errorMessage = null;
      this.emit('status_change', { status: this.status });

      if (!fs.existsSync(this.authPath)) {
        fs.mkdirSync(this.authPath, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
      const { version } = await fetchLatestBaileysVersion();

      const logger = pino({ level: 'silent' });

      this.sock = makeWASocket({
        version,
        logger,
        auth: state,
        printQRInTerminal: false,
        browser: ['zhiEnd-Agent', 'Chrome', '1.0.0']
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrCodeDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
            this.status = 'qr_ready';
            this.emit('qr', { qrDataUrl: this.qrCodeDataUrl });
            this.emit('status_change', { status: this.status, qrDataUrl: this.qrCodeDataUrl });
          } catch (e) {
            console.error('Failed to generate WhatsApp QR code:', e);
          }
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          this.qrCodeDataUrl = null;
          if (shouldReconnect) {
            this.status = 'connecting';
            this.emit('status_change', { status: this.status });
            setTimeout(() => this.start(), 3000);
          } else {
            this.status = 'stopped';
            this.user = null;
            this.emit('status_change', { status: this.status });
          }
        } else if (connection === 'open') {
          this.status = 'connected';
          this.qrCodeDataUrl = null;
          this.user = this.sock.user;
          this.errorMessage = null;
          this.emit('status_change', { status: this.status, user: this.user });
          console.log('WhatsApp Bot successfully connected as', this.user?.id);
        }
      });

      // Handle incoming messages
      this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
          if (!msg.message || msg.key.fromMe) continue;

          const sender = msg.key.remoteJid;
          const isGroup = sender.endsWith('@g.us');

          // Message text extractor
          const messageText = 
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            '';

          const text = messageText.trim();
          if (!text) continue;

          // Check authorization
          if (!this.isAuthorized(sender)) {
            const senderClean = sender.replace(/[^0-9]/g, '');
            await this.sock.sendMessage(sender, {
              text: `⚠️ *Akses Ditolak*\nNomor Anda: ${senderClean}\nSilakan daftarkan nomor ini di Web UI zhiEnd Agent > Remote Hub.`
            });
            continue;
          }

          await this.handleCommand(sender, text);
        }
      });

      return { success: true };
    } catch (err) {
      console.error('Error starting WhatsApp bot:', err);
      this.status = 'error';
      this.errorMessage = err.message;
      this.emit('status_change', { status: this.status, error: err.message });
      return { success: false, error: err.message };
    }
  }

  async handleCommand(sender, text) {
    const activeProj = this.config.activeProject || 'Belum dipilih';

    // Help
    if (text === '!help' || text === '!start') {
      const helpMsg = 
`🤖 *zhiEnd AI Coding Agent (WhatsApp)*

📁 *Project Aktif:*
\`${activeProj}\`
⚡ *Model:* \`${this.config.antigravity?.defaultModel || 'gemini-3.8-flash'}\`

*Perintah Remote:*
• *!code <instruksi>* : Jalankan coding agent (atau ketik langsung instruksi)
• *!git* : Cek status git repo
• *!diff* : Cek diff perubahan kode
• *!commit <pesan>* : Stage & commit perubahan
• *!push* : Push ke GitHub
• *!project <path>* : Ganti project aktif
• *!cancel* : Batalkan agent yang sedang jalan
• *!status* : Status sistem & agent`;
      return await this.sock.sendMessage(sender, { text: helpMsg });
    }

    // Status
    if (text === '!status') {
      const busy = this.agentRunner.isBusy();
      const statusText = busy 
        ? `⏳ *Agent Status:* Sedang menjalankan tugas di \`${activeProj}\`...` 
        : `✅ *Agent Status:* Standby & Siap menerima instruksi.\n📁 Project: \`${activeProj}\``;
      return await this.sock.sendMessage(sender, { text: statusText });
    }

    // Git Status
    if (text === '!git') {
      const status = await this.gitManager.getStatus(activeProj);
      if (!status.isRepo) {
        return await this.sock.sendMessage(sender, { text: `⚠️ Bukan git repository:\n${activeProj}` });
      }

      let reply = `🌿 *Git Status:* ${status.branch}\n`;
      if (status.remoteUrl) reply += `🔗 Remote: ${status.remoteUrl}\n`;
      reply += `⬆️ Ahead: ${status.ahead} | ⬇️ Behind: ${status.behind}\n\n`;

      if (status.clean) {
        reply += `✨ *Working tree bersih (no changes).*`;
      } else {
        reply += `*File berubah (${status.files.length}):*\n`;
        status.files.slice(0, 15).forEach(f => {
          const icon = f.status === 'untracked' ? '❓' : (f.status === 'added' ? '➕' : (f.status === 'deleted' ? '❌' : '✏️'));
          reply += `${icon} ${f.path} (${f.staged ? 'staged' : 'unstaged'})\n`;
        });
        if (status.files.length > 15) {
          reply += `... dan ${status.files.length - 15} file lainnya.\n`;
        }
        reply += `\nKetik *!commit <pesan>* lalu *!push* untuk kirim ke GitHub.`;
      }

      return await this.sock.sendMessage(sender, { text: reply });
    }

    // Git Diff
    if (text === '!diff') {
      const diff = await this.gitManager.getDiff(activeProj);
      if (!diff || !diff.trim()) {
        return await this.sock.sendMessage(sender, { text: '✨ Tidak ada diff / perubahan aktif.' });
      }
      const snippet = diff.length > 3500 ? diff.slice(0, 3500) + '\n\n...(truncated)' : diff;
      return await this.sock.sendMessage(sender, { text: `*Git Diff:*\n\`\`\`\n${snippet}\n\`\`\`` });
    }

    // Commit
    if (text.startsWith('!commit')) {
      const msg = text.replace('!commit', '').trim();
      if (!msg) {
        return await this.sock.sendMessage(sender, { text: '⚠️ Harap sertakan pesan commit. Contoh:\n!commit fix: styling navbar' });
      }

      await this.sock.sendMessage(sender, { text: '🔄 Memproses commit...' });
      await this.gitManager.stage(activeProj, ['.']);
      const res = await this.gitManager.commit(activeProj, msg);

      if (res.success) {
        return await this.sock.sendMessage(sender, { text: `✅ *Commit Berhasil!*\n📝 Pesan: "${msg}"\n\nKetik *!push* untuk push ke GitHub.` });
      } else {
        return await this.sock.sendMessage(sender, { text: `❌ Commit gagal: ${res.error || res.stdout}` });
      }
    }

    // Push
    if (text === '!push') {
      await this.sock.sendMessage(sender, { text: '🚀 Menjalankan git push ke GitHub...' });
      const res = await this.gitManager.push(activeProj);
      if (res.success) {
        return await this.sock.sendMessage(sender, { text: `🎉 *Push Berhasil!*\n\`\`\`\n${res.stdout || res.stderr || 'Pushed successfully'}\n\`\`\`` });
      } else {
        return await this.sock.sendMessage(sender, { text: `❌ Push gagal:\n\`\`\`\n${res.error || res.stderr}\n\`\`\`` });
      }
    }

    // Project change
    if (text.startsWith('!project')) {
      const newPath = text.replace('!project', '').trim();
      if (!newPath) {
        return await this.sock.sendMessage(sender, { text: `📁 Project aktif saat ini:\n${activeProj}\n\nUntuk ganti: !project D:/Path/Ke/Project` });
      }

      if (this.onProjectChange) {
        const res = await this.onProjectChange(newPath);
        if (res.success) {
          return await this.sock.sendMessage(sender, { text: `✅ *Project aktif diubah ke:*\n${newPath}` });
        } else {
          return await this.sock.sendMessage(sender, { text: `❌ Gagal: ${res.error || 'Path tidak valid'}` });
        }
      }
    }

    // Cancel
    if (text === '!cancel') {
      if (this.agentRunner.isBusy()) {
        this.agentRunner.cancel();
        return await this.sock.sendMessage(sender, { text: '🛑 Proses Antigravity agent telah dibatalkan.' });
      } else {
        return await this.sock.sendMessage(sender, { text: 'ℹ️ Tidak ada tugas agent yang berjalan.' });
      }
    }

    // Coding instruction
    let codingPrompt = text;
    if (text.startsWith('!code')) {
      codingPrompt = text.replace('!code', '').trim();
    }

    if (this.agentRunner.isBusy()) {
      return await this.sock.sendMessage(sender, { text: '⏳ Agent sedang sibuk dengan tugas lain. Ketik *!cancel* untuk batalkan.' });
    }

    await this.sock.sendMessage(sender, {
      text: `🤖 *Antigravity Agent Memproses...*\n📁 Project: \`${activeProj}\`\n💬 Instruksi: "${codingPrompt.slice(0, 100)}..."\n_Mohon tunggu sebentar..._`
    });

    try {
      const result = await this.agentRunner.run({
        prompt: codingPrompt,
        cwd: activeProj,
        model: this.config.antigravity?.defaultModel
      });

      const resp = result.response || '(Tugas selesai tanpa respon teks)';
      const chunkSize = 3500;
      for (let i = 0; i < resp.length; i += chunkSize) {
        await this.sock.sendMessage(sender, { text: resp.slice(i, i + chunkSize) });
      }

      if (result.status === 'completed') {
        await this.sock.sendMessage(sender, { text: `✅ *Selesai* dalam ${result.duration}. Ketik *!git* untuk cek file yang berubah.` });
      }
    } catch (err) {
      await this.sock.sendMessage(sender, { text: `❌ Error: ${err.message}` });
    }
  }

  async logout() {
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (e) {
        console.error('Error logging out WhatsApp:', e);
      }
    }
    this.status = 'stopped';
    this.qrCodeDataUrl = null;
    this.user = null;

    // Delete session files
    try {
      if (fs.existsSync(this.authPath)) {
        fs.rmSync(this.authPath, { recursive: true, force: true });
      }
    } catch (e) {
      console.error('Error deleting auth folder:', e);
    }

    this.emit('status_change', { status: this.status });
    return { success: true };
  }

  getStatus() {
    return {
      status: this.status,
      user: this.user,
      qrCodeDataUrl: this.qrCodeDataUrl,
      error: this.errorMessage
    };
  }
}

module.exports = WhatsAppBotManager;
