import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
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
import { getPersonas, getPersonaById, saveConfigToDb, saveChatUploadedFile, saveMessageToDb, getOrCreateDefaultSession } from '../db/database';

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
  private mySentMessageIds = new Set<string>();

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

  private isAuthorized(senderJid: string, participantJid?: string): boolean {
    const senderClean = senderJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    const participantClean = (participantJid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    const botPhone = (this.user?.id || '').split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
    const botLid = ((this.user as any)?.lid || '').split(':')[0].split('@')[0].replace(/[^0-9]/g, '');

    // 1. Akun bot itu sendiri (chat ke diri sendiri / Message Yourself) SELALU authorized
    if (
      senderJid.endsWith('@lid') || 
      (botPhone && (senderClean === botPhone || participantClean === botPhone)) || 
      (botLid && (senderClean === botLid || participantClean === botLid))
    ) {
      return true;
    }

    // 2. Cek nomor yang didaftarkan di allowedNumbers
    const allowed = this.config.whatsapp?.allowedNumbers || [];
    if (!allowed || allowed.length === 0) {
      // Jika allowedNumbers kosong, HANYA chat ke diri sendiri yang diizinkan!
      // Nomor lain/orang luar TIDAK diizinkan.
      return false;
    }

    return allowed.some(num => {
      const cleanAllowed = String(num).replace(/[^0-9]/g, '');
      if (!cleanAllowed) return false;
      return (
        (senderClean && (senderClean.includes(cleanAllowed) || cleanAllowed.includes(senderClean))) ||
        (participantClean && (participantClean.includes(cleanAllowed) || cleanAllowed.includes(participantClean)))
      );
    });
  }

  private async sendReply(sender: string, content: any): Promise<any> {
    if (!this.sock) return null;
    try {
      const sent = await this.sock.sendMessage(sender, content);
      if (sent?.key?.id) {
        this.mySentMessageIds.add(sent.key.id);
        if (this.mySentMessageIds.size > 200) {
          const first = this.mySentMessageIds.values().next().value;
          if (first) this.mySentMessageIds.delete(first);
        }
      }
      const preview = typeof content?.text === 'string' ? content.text.slice(0, 100) : 'Pesan Media';
      console.log(`[WhatsApp Outbound] To: ${sender} | Preview: "${preview.replace(/\n/g, ' ')}"`);
      this.emit('log', {
        platform: 'whatsapp',
        type: 'outbound',
        sender,
        text: preview,
        timestamp: Date.now()
      });
      return sent;
    } catch (e) {
      console.error(`Failed to send WhatsApp message to ${sender}:`, e);
      return null;
    }
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
            if (this.config.whatsapp) {
              this.config.whatsapp.enabled = false;
            }
            try {
              saveConfigToDb({ whatsapp: { enabled: false } });
            } catch {}
            this.emit('status_change', this.getStatus());
          }
        } else if (connection === 'open') {
          this.status = 'connected';
          this.qrCodeDataUrl = null;
          this.user = this.sock?.user;
          this.errorMessage = null;
          if (this.config.whatsapp) {
            this.config.whatsapp.enabled = true;
          }
          try {
            saveConfigToDb({ whatsapp: { enabled: true } });
          } catch {}
          this.emit('status_change', this.getStatus());
        }
      });

      this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        for (const msg of messages) {
          if (!msg.message) continue;

          // Abaikan jika pesan ini adalah balasan yang dikirim bot kita sendiri
          if (msg.key.id && this.mySentMessageIds.has(msg.key.id)) {
            continue;
          }

          const sender = msg.key.remoteJid;
          if (!sender) continue;

          // Abaikan status broadcast stories
          if (sender.endsWith('@broadcast') || sender === 'status@broadcast') continue;

          const m = (msg.message as any).ephemeralMessage?.message || 
                    (msg.message as any).viewOnceMessage?.message || 
                    (msg.message as any).viewOnceMessageV2?.message || 
                    msg.message;

          const isImage = !!(
            m?.imageMessage || 
            (m?.documentMessage?.mimetype && m.documentMessage.mimetype.startsWith('image/'))
          );

          const messageText = 
            m?.conversation ||
            m?.extendedTextMessage?.text ||
            m?.imageMessage?.caption ||
            m?.documentMessage?.caption ||
            m?.videoMessage?.caption ||
            '';

          const text = messageText.trim();
          if (!text && !isImage) continue;

          const effectiveText = text || 'Tolong analisis dan periksa gambar terlampir ini.';

          const botPhone = (this.user?.id || '').split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
          const botLid = ((this.user as any)?.lid || '').split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
          const senderClean = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

          // Cek apakah pesan dikirim di ruang obrolan diri sendiri ("Message Yourself")
          const isSelfChat = 
            sender.endsWith('@lid') || 
            (botPhone && senderClean === botPhone) || 
            (botLid && senderClean === botLid);

          const isGroup = sender.endsWith('@g.us');
          const participant = msg.key.participant || (msg as any).participant;
          const isWhiteListed = this.isAuthorized(sender, participant);
          const isCommand = effectiveText.startsWith('!') || effectiveText.startsWith('/') || ['help', 'menu', 'status'].includes(effectiveText.toLowerCase()) || (isImage && isWhiteListed);

          // PROTEKSI TOTAL UNTUK INCOMING CHAT:
          // Jika pesan BUKAN dari ruang obrolan diri sendiri ("Message Yourself"):
          if (!isSelfChat) {
            // 1. Jika nomor pengirim/participant TIDAK terdaftar di allowedNumbers:
            //    DIAM TOTAL! Jangan pernah balas apapun ke nomor/grup tersebut!
            // 2. Jika pengirim terdaftar di allowedNumbers tapi pesannya BUKAN perintah diawali ! atau / (atau gambar):
            //    DIAM TOTAL! Jangan ganggu percakapan biasa!
            if (!isWhiteListed || !isCommand) {
              continue;
            }
          }

          // Jika fromMe === true (pesan dikirim dari akun WA yang sama ke orang/grup lain):
          // Jangan proses jika bukan di Message Yourself dan bukan command eksplisit
          if (msg.key.fromMe && !isSelfChat && !isCommand) {
            continue;
          }

          console.log(`[WhatsApp Inbound] From: ${sender} (self: ${isSelfChat}, fromMe: ${msg.key.fromMe}, group: ${isGroup}, image: ${isImage}) | Text: "${effectiveText}"`);
          this.emit('log', {
            platform: 'whatsapp',
            type: 'inbound',
            sender,
            text: effectiveText,
            timestamp: Date.now()
          });

          // PENTING: Jangan pernah kirim pesan "Akses Ditolak" ke siapapun!
          if (!this.isAuthorized(sender, participant)) {
            continue;
          }

          // Unduh lampiran gambar jika ada
          const attachedImages: string[] = [];
          if (isImage) {
            try {
              const buffer = await downloadMediaMessage(
                msg,
                'buffer',
                {},
                {
                  logger: pino({ level: 'silent' }),
                  reuploadRequest: this.sock?.updateMediaMessage
                }
              );
              if (buffer && buffer.length > 0) {
                const mime = m?.imageMessage?.mimetype || m?.documentMessage?.mimetype || 'image/jpeg';
                const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
                const saved = saveChatUploadedFile(buffer, `wa_${Date.now()}.${ext}`);
                attachedImages.push(saved.url);
              }
            } catch (mediaErr) {
              console.error('[WhatsApp] Gagal mengunduh gambar:', mediaErr);
            }
          }

          await this.handleCommand(sender, effectiveText, isSelfChat, attachedImages);
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

  private async handleCommand(sender: string, text: string, isSelfChat: boolean = false, images: string[] = []): Promise<void> {
    if (!this.sock) return;
    const activeProj = this.config.activeProject || 'Belum dipilih';

    const activePersonaId = this.config.whatsapp?.personaId || 'persona-default';
    const activePersona = getPersonaById(activePersonaId) || getPersonaById('persona-default');
    const activeEmoji = getSafePersonaEmoji(activePersona?.avatar);
    const personaDisplay = activePersona ? `${activeEmoji} ${activePersona.name}` : '⚡ Standard';

    const cleanLower = text.toLowerCase().trim();
    const isHelp = 
      cleanLower === '!help' || cleanLower === '!menu' || cleanLower === '!start' || 
      cleanLower === '/help' || cleanLower === '/menu' || cleanLower === '/start' || 
      cleanLower === 'help' || cleanLower === 'menu';

    if (isHelp) {
      const helpMsg = 
`🤖 *zhiEnd AI Coding Agent — Shortcut Commands*

📁 *Project Aktif:* \`${activeProj}\`
🎭 *Persona AI:* ${personaDisplay}
⚡ *Model:* \`${activePersona?.preferred_model || this.config.antigravity?.defaultModel || 'gemini-3.8-flash'}\`

━━━━━━━━━━━━━━━━━━━━━
⌨️ *DAFTAR SHORTCUT PERINTAH:*
━━━━━━━━━━━━━━━━━━━━━

⚡ *Coding Agent:*
• *!code <instruksi>* atau *ketik langsung* instruksi coding Anda
  _Contoh:_ \`!code buatkan form login svelte\`

🎭 *Persona AI:*
• *!persona* : Cek daftar semua Persona AI
• *!persona <nomor/nama>* : Ganti persona aktif
  _Contoh:_ \`!persona 2\` atau \`!persona Reviewer\`

📁 *Workspace Project:*
• *!project <path>* : Ganti project/workspace aktif
  _Contoh:_ \`!project D:/Works/crm-sehati\`

🌿 *Git & Repository:*
• *!git* : Cek status git branch & perubahan file
• *!diff* : Cek diff baris kode yang berubah
• *!commit <pesan>* : Stage semua file & commit lokal
  _Contoh:_ \`!commit fix: perbaiki navbar\`
• *!push* : Push commit langsung ke GitHub remote

⚙️ *Sistem & Kontrol:*
• *!status* : Cek status kesibukan agent & info runtime
• *!cancel* : Hentikan proses AI yang sedang berjalan
• *!help* atau *!menu* : Tampilkan daftar perintah ini
━━━━━━━━━━━━━━━━━━━━━
💡 *Tips Cepat:* Di chat ini Anda bisa langsung mengirim instruksi coding biasa tanpa harus mengetik *!code*.`;

      await this.sendReply(sender, { text: helpMsg });
      return;
    }

    if (text === '!status') {
      const busy = this.agentRunner.isBusy();
      const statusText = busy 
        ? `⏳ *Agent Status:* Sedang menjalankan tugas di \`${activeProj}\`...\n🎭 Persona: ${personaDisplay}` 
        : `✅ *Agent Status:* Standby & Siap menerima instruksi.\n📁 Project: \`${activeProj}\`\n🎭 Persona: ${personaDisplay}`;
      await this.sendReply(sender, { text: statusText });
      return;
    }

    // Persona Management Command
    if (text === '!persona' || text === '!persona list') {
      const allPersonas = getPersonas();
      let personaMsg = `🎭 *Daftar Persona AI zhiEnd:*\n\n`;
      allPersonas.forEach((p, idx) => {
        const isCurrent = p.id === activePersonaId;
        const pEmoji = getSafePersonaEmoji(p.avatar);
        personaMsg += `${idx + 1}. ${pEmoji} *${p.name}* ${isCurrent ? '*(AKTIF)*' : ''}\n`;
        personaMsg += `   • Model: \`${p.preferred_model || 'default'}\`\n`;
        if (p.traits) personaMsg += `   • Sifat: _${p.traits}_\n`;
        personaMsg += `\n`;
      });
      personaMsg += `*Untuk mengganti persona:*\nKetik *!persona <nomor atau nama>*\nContoh: *!persona 2* atau *!persona Reviewer*`;
      await this.sendReply(sender, { text: personaMsg });
      return;
    }

    if (text.startsWith('!persona')) {
      const query = text.replace('!persona', '').trim().toLowerCase();
      if (!query) {
        await this.sendReply(sender, { text: '⚠️ Masukkan nomor atau nama persona. Ketik *!persona* untuk melihat daftar.' });
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

        const matchedEmoji = getSafePersonaEmoji(matchedPersona.avatar);
        await this.sendReply(sender, {
          text: `✅ *Persona WhatsApp berhasil diubah!*\n\n${matchedEmoji} *${matchedPersona.name}*\n⚡ Model: \`${matchedPersona.preferred_model}\`\n🎭 Karakter: _${matchedPersona.traits || 'Adaptif'}_`
        });
      } else {
        await this.sendReply(sender, {
          text: `❌ Persona "${query}" tidak ditemukan.\nKetik *!persona* untuk melihat daftar nomor & nama persona.`
        });
      }
      return;
    }

    if (text === '!git') {
      const status = await this.gitManager.getStatus(activeProj);
      if (!status.isRepo) {
        await this.sendReply(sender, { text: `⚠️ Bukan git repository:\n${activeProj}` });
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

      await this.sendReply(sender, { text: reply });
      return;
    }

    if (text === '!diff') {
      const diff = await this.gitManager.getDiff(activeProj);
      if (!diff || !diff.trim()) {
        await this.sendReply(sender, { text: '✨ Tidak ada diff / perubahan aktif.' });
        return;
      }
      const snippet = diff.length > 3500 ? diff.slice(0, 3500) + '\n\n...(truncated)' : diff;
      await this.sendReply(sender, { text: `*Git Diff:*\n\`\`\`\n${snippet}\n\`\`\`` });
      return;
    }

    if (text.startsWith('!commit')) {
      const msg = text.replace('!commit', '').trim();
      if (!msg) {
        await this.sendReply(sender, { text: '⚠️ Harap sertakan pesan commit. Contoh:\n!commit fix: styling navbar' });
        return;
      }

      await this.sendReply(sender, { text: '🔄 Memproses commit...' });
      await this.gitManager.stage(activeProj, ['.']);
      const res = await this.gitManager.commit(activeProj, msg);

      if (res.success) {
        await this.sendReply(sender, { text: `✅ *Commit Berhasil!*\n📝 Pesan: "${msg}"\n\nKetik *!push* untuk push ke GitHub.` });
      } else {
        await this.sendReply(sender, { text: `❌ Commit gagal: ${res.error || res.stdout}` });
      }
      return;
    }

    if (text === '!push') {
      await this.sendReply(sender, { text: '🚀 Menjalankan git push ke GitHub...' });
      const res = await this.gitManager.push(activeProj);
      if (res.success) {
        await this.sendReply(sender, { text: `🎉 *Push Berhasil!*\n\`\`\`\n${res.stdout || res.stderr || 'Pushed successfully'}\n\`\`\`` });
      } else {
        await this.sendReply(sender, { text: `❌ Push gagal:\n\`\`\`\n${res.error || res.stderr}\n\`\`\`` });
      }
      return;
    }

    if (text.startsWith('!project')) {
      const newPath = text.replace('!project', '').trim();
      if (!newPath) {
        await this.sendReply(sender, { text: `📁 Project aktif saat ini:\n${activeProj}\n\nUntuk ganti: !project D:/Path/Ke/Project` });
        return;
      }

      if (this.onProjectChange) {
        const res = await this.onProjectChange(newPath);
        if (res.success) {
          await this.sendReply(sender, { text: `✅ *Project aktif diubah ke:*\n${newPath}` });
        } else {
          await this.sendReply(sender, { text: `❌ Gagal: ${res.error || 'Path tidak valid'}` });
        }
      }
      return;
    }

    if (text === '!cancel') {
      if (this.agentRunner.isBusy()) {
        this.agentRunner.cancel();
        await this.sendReply(sender, { text: '🛑 Proses Antigravity agent telah dibatalkan.' });
      } else {
        await this.sendReply(sender, { text: 'ℹ️ Tidak ada tugas agent yang berjalan.' });
      }
      return;
    }

    // Safeguard: Jika bukan dari diri sendiri dan bukan command yang diawali ! atau /, abaikan KECUALI ada gambar terlampir
    if (!isSelfChat && !text.startsWith('!') && !text.startsWith('/') && (!images || images.length === 0)) {
      return;
    }

    let codingPrompt = text;
    if (text.startsWith('!code')) {
      codingPrompt = text.replace('!code', '').trim();
    }
    if (!codingPrompt) {
      codingPrompt = 'Tolong analisis dan periksa gambar terlampir ini.';
    }

    if (this.agentRunner.isBusy()) {
      await this.sendReply(sender, { text: '⏳ Agent sedang sibuk dengan tugas lain. Ketik *!cancel* untuk batalkan.' });
      return;
    }

    const imageNote = images && images.length > 0 ? `\n🖼️ Terlampir ${images.length} gambar` : '';
    await this.sendReply(sender, {
      text: `🤖 *${personaDisplay} Memproses...*\n📁 Project: \`${activeProj}\`\n💬 Instruksi: "${codingPrompt.slice(0, 100)}..."${imageNote}\n_Mohon tunggu sebentar..._`
    });

    // Sesi target di SQLite
    let targetSessionId = 'default';
    try {
      const targetSession = getOrCreateDefaultSession(activeProj);
      targetSessionId = targetSession.id;
    } catch (e) {
      console.error('Failed to resolve WhatsApp session:', e);
    }

    try {
      const result = await this.agentRunner.run({
        prompt: codingPrompt,
        cwd: activeProj,
        sessionId: targetSessionId,
        personaId: activePersonaId,
        model: activePersona?.preferred_model || this.config.antigravity?.defaultModel,
        images: images && images.length > 0 ? images : undefined
      });

      const resp = result.response || '(Tugas selesai tanpa respon teks)';
      const chunkSize = 3500;
      for (let i = 0; i < resp.length; i += chunkSize) {
        await this.sendReply(sender, { text: resp.slice(i, i + chunkSize) });
      }

      if (result.status === 'completed') {
        await this.sendReply(sender, { text: `✅ *Selesai* dalam ${result.duration}. Ketik *!git* untuk cek file yang berubah.` });
      }
    } catch (err: any) {
      await this.sendReply(sender, { text: `❌ Error: ${err.message}` });
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

export function getSafePersonaEmoji(avatar?: string | null): string {
  if (!avatar) return '🎭';
  const str = avatar.trim();
  if (
    str.startsWith('data:') ||
    str.startsWith('/uploads/') ||
    str.startsWith('http://') ||
    str.startsWith('https://') ||
    str.length > 20
  ) {
    return '🎭';
  }
  return str;
}

