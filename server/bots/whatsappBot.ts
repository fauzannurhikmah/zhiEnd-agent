import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  WASocket
} from '@whiskeysockets/baileys';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import { EventEmitter } from 'events';
import { AppConfig, WhatsAppStatus } from '../types';
import { AgentRunner } from '../agentRunner';
import { GitManager } from '../gitManager';
import { getPersonas, getPersonaById, saveConfigToDb } from '../db/database';

export interface WhatsAppBotOptions {
  config: AppConfig;
  agentRunner: AgentRunner;
  gitManager: GitManager;
  onProjectChange?: (newPath: string) => Promise<{ success: boolean; activeProject?: string; error?: string }>;
}

export class WhatsAppBotManager extends EventEmitter {
  private config: AppConfig;
  private agentRunner: AgentRunner;
  private gitManager: GitManager;
  private onProjectChange?: (newPath: string) => Promise<{ success: boolean; activeProject?: string; error?: string }>;

  private sock: WASocket | null = null;
  public status: WhatsAppStatus['status'] = 'stopped';
  public qrCodeDataUrl: string | null = null;
  public user: any = null;
  public errorMessage: string | null = null;
  private authPath: string;
  private isStarting: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(options: WhatsAppBotOptions) {
    super();
    this.config = options.config;
    this.agentRunner = options.agentRunner;
    this.gitManager = options.gitManager;
    this.onProjectChange = options.onProjectChange;
    this.authPath = path.join(__dirname, '..', '..', 'data', 'baileys_auth');
  }

  public updateConfig(config: AppConfig): void {
    this.config = config;
  }

  private isAuthorized(senderJid: string): boolean {
    const allowed = this.config.whatsapp?.allowedNumbers || [];
    if (!allowed || allowed.length === 0) {
      return true;
    }
    const cleanSender = senderJid.replace(/[^0-9]/g, '');
    return allowed.some(num => {
      const cleanAllowed = String(num).replace(/[^0-9]/g, '');
      return cleanSender.includes(cleanAllowed) || cleanAllowed.includes(cleanSender);
    });
  }

  public async start(): Promise<{ success: boolean; message?: string; error?: string }> {
    if (this.sock && this.status === 'connected') {
      return { success: true, message: 'Already connected' };
    }

    if (this.isStarting) {
      return { success: true, message: 'Connection already in progress' };
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    try {
      this.isStarting = true;
      this.status = 'connecting';
      this.errorMessage = null;
      this.emit('status_change', this.getStatus());

      // Clean up previous socket if any
      if (this.sock) {
        try {
          this.sock.ev.removeAllListeners('connection.update');
          this.sock.ev.removeAllListeners('creds.update');
          this.sock.ev.removeAllListeners('messages.upsert');
          this.sock.end(undefined);
        } catch {}
        this.sock = null;
      }

      if (!fs.existsSync(this.authPath)) {
        fs.mkdirSync(this.authPath, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
      
      let version = [2, 3000, 1015901307] as any;
      try {
        const v = await fetchLatestBaileysVersion();
        if (v && v.version) {
          version = v.version;
        }
      } catch (err) {
        console.warn('Fallback default Baileys version used due to fetch error:', err);
      }

      const logger = pino({ level: 'silent' });

      this.sock = makeWASocket({
        version,
        logger,
        auth: state,
        printQRInTerminal: false,
        browser: ['zhiEnd-Agent', 'Chrome', '1.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrCodeDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
            this.status = 'qr_ready';
            this.emit('qr', { qrDataUrl: this.qrCodeDataUrl, qrCodeDataUrl: this.qrCodeDataUrl });
            this.emit('status_change', this.getStatus());
          } catch (e) {
            console.error('Failed to generate WhatsApp QR code:', e);
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          this.qrCodeDataUrl = null;
          if (shouldReconnect) {
            this.status = 'connecting';
            this.emit('status_change', this.getStatus());
            if (!this.reconnectTimeout) {
              this.reconnectTimeout = setTimeout(() => {
                this.reconnectTimeout = null;
                this.start().catch(e => console.error('Auto reconnect WhatsApp failed:', e));
              }, 4000);
            }
          } else {
            this.status = 'stopped';
            this.user = null;
            this.emit('status_change', this.getStatus());
          }
        } else if (connection === 'open') {
          this.status = 'connected';
          this.qrCodeDataUrl = null;
          this.user = this.sock?.user;
          this.errorMessage = null;
          this.emit('status_change', this.getStatus());
        }
      });

      this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
          if (!msg.message || msg.key.fromMe) continue;

          const sender = msg.key.remoteJid;
          if (!sender) continue;

          const messageText = 
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            '';

          const text = messageText.trim();
          if (!text) continue;

          if (!this.isAuthorized(sender)) {
            const senderClean = sender.replace(/[^0-9]/g, '');
            await this.sock?.sendMessage(sender, {
              text: `⚠️ *Akses Ditolak*\nNomor Anda: ${senderClean}\nSilakan daftarkan nomor ini di Web UI zhiEnd Agent > Remote Hub / Settings.`
            });
            continue;
          }

          await this.handleCommand(sender, text);
        }
      });

      this.isStarting = false;
      return { success: true };
    } catch (err: any) {
      this.isStarting = false;
      console.error('Error starting WhatsApp bot:', err);
      this.status = 'error';
      this.errorMessage = err.message;
      this.emit('status_change', { status: this.status, error: err.message });
      return { success: false, error: err.message };
    }
  }

  private async handleCommand(sender: string, text: string): Promise<void> {
    if (!this.sock) return;
    const activeProj = this.config.activeProject || 'Belum dipilih';

    const activePersonaId = this.config.whatsapp?.personaId || 'persona-default';
    const activePersona = getPersonaById(activePersonaId) || getPersonaById('persona-default');
    const personaDisplay = activePersona ? `${activePersona.avatar} ${activePersona.name}` : '⚡ Standard';

    if (text === '!help' || text === '!start') {
      const helpMsg = 
`🤖 *zhiEnd AI Coding Agent (WhatsApp Remote)*

📁 *Project Aktif:* \`${activeProj}\`
🎭 *Persona AI:* ${personaDisplay}
⚡ *Model:* \`${activePersona?.preferred_model || this.config.antigravity?.defaultModel || 'gemini-3.8-flash'}\`

*Daftar Perintah:*
• *!code <instruksi>* : Jalankan coding agent (atau ketik langsung)
• *!persona* : Cek & ganti Persona AI bot
• *!git* : Cek status git repository
• *!diff* : Cek diff perubahan kode
• *!commit <pesan>* : Stage & commit perubahan
• *!push* : Push ke GitHub
• *!project <path>* : Ganti project aktif
• *!cancel* : Batalkan tugas agent yang sedang jalan
• *!status* : Status sistem & agent`;
      await this.sock.sendMessage(sender, { text: helpMsg });
      return;
    }

    if (text === '!status') {
      const busy = this.agentRunner.isBusy();
      const statusText = busy 
        ? `⏳ *Agent Status:* Sedang menjalankan tugas di \`${activeProj}\`...\n🎭 Persona: ${personaDisplay}` 
        : `✅ *Agent Status:* Standby & Siap menerima instruksi.\n📁 Project: \`${activeProj}\`\n🎭 Persona: ${personaDisplay}`;
      await this.sock.sendMessage(sender, { text: statusText });
      return;
    }

    // Persona Management Command
    if (text === '!persona' || text === '!persona list') {
      const allPersonas = getPersonas();
      let personaMsg = `🎭 *Daftar Persona AI zhiEnd:*\n\n`;
      allPersonas.forEach((p, idx) => {
        const isCurrent = p.id === activePersonaId;
        personaMsg += `${idx + 1}. ${p.avatar} *${p.name}* ${isCurrent ? '*(AKTIF)*' : ''}\n`;
        personaMsg += `   • Model: \`${p.preferred_model || 'default'}\`\n`;
        if (p.traits) personaMsg += `   • Sifat: _${p.traits}_\n`;
        personaMsg += `\n`;
      });
      personaMsg += `*Untuk mengganti persona:*\nKetik *!persona <nomor atau nama>*\nContoh: *!persona 2* atau *!persona Reviewer*`;
      await this.sock.sendMessage(sender, { text: personaMsg });
      return;
    }

    if (text.startsWith('!persona')) {
      const query = text.replace('!persona', '').trim().toLowerCase();
      if (!query) {
        await this.sock.sendMessage(sender, { text: '⚠️ Masukkan nomor atau nama persona. Ketik *!persona* untuk melihat daftar.' });
        return;
      }

      const allPersonas = getPersonas();
      let matchedPersona = null;

      // Check by index number (1-based)
      const num = parseInt(query, 10);
      if (!isNaN(num) && num >= 1 && num <= allPersonas.length) {
        matchedPersona = allPersonas[num - 1];
      } else {
        // Check by ID or Name
        matchedPersona = allPersonas.find(p => 
          p.id.toLowerCase() === query || 
          p.name.toLowerCase().includes(query)
        );
      }

      if (matchedPersona) {
        if (!this.config.whatsapp) {
          this.config.whatsapp = { enabled: true, allowedNumbers: [], personaId: matchedPersona.id };
        } else {
          this.config.whatsapp.personaId = matchedPersona.id;
        }
        saveConfigToDb(this.config);

        await this.sock.sendMessage(sender, {
          text: `✅ *Persona WhatsApp berhasil diubah!*\n\n${matchedPersona.avatar} *${matchedPersona.name}*\n⚡ Model: \`${matchedPersona.preferred_model}\`\n🎭 Karakter: _${matchedPersona.traits || 'Adaptif'}_`
        });
      } else {
        await this.sock.sendMessage(sender, {
          text: `❌ Persona "${query}" tidak ditemukan.\nKetik *!persona* untuk melihat daftar nomor & nama persona.`
        });
      }
      return;
    }

    if (text === '!git') {
      const status = await this.gitManager.getStatus(activeProj);
      if (!status.isRepo) {
        await this.sock.sendMessage(sender, { text: `⚠️ Bukan git repository:\n${activeProj}` });
        return;
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

      await this.sock.sendMessage(sender, { text: reply });
      return;
    }

    if (text === '!diff') {
      const diff = await this.gitManager.getDiff(activeProj);
      if (!diff || !diff.trim()) {
        await this.sock.sendMessage(sender, { text: '✨ Tidak ada diff / perubahan aktif.' });
        return;
      }
      const snippet = diff.length > 3500 ? diff.slice(0, 3500) + '\n\n...(truncated)' : diff;
      await this.sock.sendMessage(sender, { text: `*Git Diff:*\n\`\`\`\n${snippet}\n\`\`\`` });
      return;
    }

    if (text.startsWith('!commit')) {
      const msg = text.replace('!commit', '').trim();
      if (!msg) {
        await this.sock.sendMessage(sender, { text: '⚠️ Harap sertakan pesan commit. Contoh:\n!commit fix: styling navbar' });
        return;
      }

      await this.sock.sendMessage(sender, { text: '🔄 Memproses commit...' });
      await this.gitManager.stage(activeProj, ['.']);
      const res = await this.gitManager.commit(activeProj, msg);

      if (res.success) {
        await this.sock.sendMessage(sender, { text: `✅ *Commit Berhasil!*\n📝 Pesan: "${msg}"\n\nKetik *!push* untuk push ke GitHub.` });
      } else {
        await this.sock.sendMessage(sender, { text: `❌ Commit gagal: ${res.error || res.stdout}` });
      }
      return;
    }

    if (text === '!push') {
      await this.sock.sendMessage(sender, { text: '🚀 Menjalankan git push ke GitHub...' });
      const res = await this.gitManager.push(activeProj);
      if (res.success) {
        await this.sock.sendMessage(sender, { text: `🎉 *Push Berhasil!*\n\`\`\`\n${res.stdout || res.stderr || 'Pushed successfully'}\n\`\`\`` });
      } else {
        await this.sock.sendMessage(sender, { text: `❌ Push gagal:\n\`\`\`\n${res.error || res.stderr}\n\`\`\`` });
      }
      return;
    }

    if (text.startsWith('!project')) {
      const newPath = text.replace('!project', '').trim();
      if (!newPath) {
        await this.sock.sendMessage(sender, { text: `📁 Project aktif saat ini:\n${activeProj}\n\nUntuk ganti: !project D:/Path/Ke/Project` });
        return;
      }

      if (this.onProjectChange) {
        const res = await this.onProjectChange(newPath);
        if (res.success) {
          await this.sock.sendMessage(sender, { text: `✅ *Project aktif diubah ke:*\n${newPath}` });
        } else {
          await this.sock.sendMessage(sender, { text: `❌ Gagal: ${res.error || 'Path tidak valid'}` });
        }
      }
      return;
    }

    if (text === '!cancel') {
      if (this.agentRunner.isBusy()) {
        this.agentRunner.cancel();
        await this.sock.sendMessage(sender, { text: '🛑 Proses Antigravity agent telah dibatalkan.' });
      } else {
        await this.sock.sendMessage(sender, { text: 'ℹ️ Tidak ada tugas agent yang berjalan.' });
      }
      return;
    }

    let codingPrompt = text;
    if (text.startsWith('!code')) {
      codingPrompt = text.replace('!code', '').trim();
    }

    if (this.agentRunner.isBusy()) {
      await this.sock.sendMessage(sender, { text: '⏳ Agent sedang sibuk dengan tugas lain. Ketik *!cancel* untuk batalkan.' });
      return;
    }

    await this.sock.sendMessage(sender, {
      text: `🤖 *${personaDisplay} Memproses...*\n📁 Project: \`${activeProj}\`\n💬 Instruksi: "${codingPrompt.slice(0, 100)}..."\n_Mohon tunggu sebentar..._`
    });

    try {
      const result = await this.agentRunner.run({
        prompt: codingPrompt,
        cwd: activeProj,
        personaId: activePersonaId,
        model: activePersona?.preferred_model || this.config.antigravity?.defaultModel
      });

      const resp = result.response || '(Tugas selesai tanpa respon teks)';
      const chunkSize = 3500;
      for (let i = 0; i < resp.length; i += chunkSize) {
        await this.sock.sendMessage(sender, { text: resp.slice(i, i + chunkSize) });
      }

      if (result.status === 'completed') {
        await this.sock.sendMessage(sender, { text: `✅ *Selesai* dalam ${result.duration}. Ketik *!git* untuk cek file yang berubah.` });
      }
    } catch (err: any) {
      await this.sock.sendMessage(sender, { text: `❌ Error: ${err.message}` });
    }
  }

  public async logout(): Promise<{ success: boolean }> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (e) {
        console.error('Error logging out WhatsApp:', e);
      }
      try {
        this.sock.ev.removeAllListeners('connection.update');
        this.sock.ev.removeAllListeners('creds.update');
        this.sock.ev.removeAllListeners('messages.upsert');
        this.sock.end(undefined);
      } catch {}
      this.sock = null;
    }

    this.status = 'stopped';
    this.qrCodeDataUrl = null;
    this.user = null;

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

  public getStatus(): WhatsAppStatus {
    return {
      status: this.status,
      user: this.user,
      qrCodeDataUrl: this.qrCodeDataUrl,
      error: this.errorMessage
    };
  }
}
