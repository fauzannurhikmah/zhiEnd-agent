import { EventEmitter } from 'events';
import { Telegraf } from 'telegraf';
import fs from 'fs';
import path from 'path';
import { AppConfig, TelegramStatus } from '../types';
import { AgentRunner } from '../agentRunner';
import { GitManager } from '../gitManager';
import { getPersonas, getPersonaById, saveConfigToDb, saveChatUploadedFile, getOrCreateDefaultSession, saveMessageToDb, getAllProjectsList } from '../db/database';
import { getSafePersonaEmoji, formatForWhatsApp } from './whatsappBot';
import { voiceService } from '../voiceService';

export function extractGeneratedImages(response: string, taskGeneratedImages?: string[]): {
  imagesToSend: string[];
  cleanResponse: string;
} {
  const imagesToSend: string[] = [];
  const seen = new Set<string>();

  if (taskGeneratedImages && taskGeneratedImages.length > 0) {
    for (const p of taskGeneratedImages) {
      if (fs.existsSync(p) && !seen.has(p)) {
        seen.add(p);
        imagesToSend.push(p);
      }
    }
  }

  const imgRegex = /!?\[[^\]]*\]\(([^)]+\.(?:png|jpe?g|webp|gif|svg)[^)]*)\)/gi;
  let match;
  while ((match = imgRegex.exec(response)) !== null) {
    let target = match[1].trim();
    if (target.startsWith('file:///')) {
      target = decodeURIComponent(target.replace(/^file:\/\/\//, ''));
    }
    if (/^\/[A-Za-z]:/.test(target)) {
      target = target.substring(1);
    }
    target = path.normalize(target);
    if (fs.existsSync(target) && !seen.has(target)) {
      seen.add(target);
      imagesToSend.push(target);
    }
  }

  let cleanResponse = response
    .replace(/!?\[[^\]]*\]\((?:file:\/\/\/)?[^)]+\)/gi, '')
    .replace(/(?:^|\n)[^\S\r\n]*(?:📁\s*)?(?:\*\*)?Lokasi File:?(?:\*\*)?[^\S\r\n]*/gi, '')
    .replace(/(?:^|\n)[^\S\r\n]*\[[^\]]*\.(?:png|jpe?g|webp|gif|svg)\]\([^\)]+\)[^\S\r\n]*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { imagesToSend, cleanResponse };
}

export interface TelegramBotOptions {
  config: AppConfig;
  agentRunner: AgentRunner;
  gitManager: GitManager;
  onProjectChange?: (newPath: string) => Promise<{ success: boolean; activeProject?: string; error?: string }>;
  onStartDevServer?: () => Promise<{ success: boolean; message: string; command?: string }>;
  onStopDevServer?: () => Promise<{ success: boolean; message: string }>;
  getTunnelUrl?: () => string | null;
}

export class TelegramBotManager extends EventEmitter {
  private config: AppConfig;
  private agentRunner: AgentRunner;
  private gitManager: GitManager;
  private onProjectChange?: (newPath: string) => Promise<{ success: boolean; activeProject?: string; error?: string }>;
  private onStartDevServer?: () => Promise<{ success: boolean; message: string; command?: string }>;
  private onStopDevServer?: () => Promise<{ success: boolean; message: string }>;
  private getTunnelUrl?: () => string | null;

  private bot: Telegraf | null = null;
  public botInfo: any = null;
  public status: TelegramStatus['status'] = 'stopped';
  public errorMessage: string | null = null;
  private isUserStopped: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isReconnecting: boolean = false;
  private mediaGroupBatches = new Map<string, {
    ctx: any;
    images: string[];
    captions: string[];
    timer: NodeJS.Timeout;
  }>();

  constructor(options: TelegramBotOptions) {
    super();
    this.config = options.config;
    this.agentRunner = options.agentRunner;
    this.gitManager = options.gitManager;
    this.onProjectChange = options.onProjectChange;
    this.onStartDevServer = options.onStartDevServer;
    this.onStopDevServer = options.onStopDevServer;
    this.getTunnelUrl = options.getTunnelUrl;
  }

  public updateConfig(config: AppConfig): void {
    this.config = config;

    // Jika bot enabled di database dan sedang offline bukan karena di-stop user, otomatis jalankan
    if (this.config.telegram?.enabled && this.status !== 'running' && !this.isUserStopped) {
      this.start().catch(() => {});
    }
  }

  private isAuthorized(ctx: any): boolean {
    const allowed = this.config.telegram?.allowedUsers || [];
    if (!allowed || allowed.length === 0) {
      return true;
    }
    const userId = String(ctx.from?.id);
    const username = ctx.from?.username ? `@${ctx.from.username.toLowerCase()}` : '';
    return allowed.some(a => String(a).toLowerCase() === userId || String(a).toLowerCase() === username);
  }

  public async start(token?: string): Promise<{ success: boolean; botInfo?: any; error?: string }> {
    this.isUserStopped = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // 1. Resolusi Token: abaikan bullet mask '••••••••', utamakan token bersih atau ambil langsung dari database SQLite
    let botToken = (token && !token.includes('•') && token.trim()) ? token.trim() : this.config.telegram?.botToken;
    if (!botToken || botToken.includes('•') || !botToken.trim()) {
      try {
        const dbCfg = loadConfigFromDb();
        if (dbCfg.telegram?.botToken && !dbCfg.telegram.botToken.includes('•')) {
          botToken = dbCfg.telegram.botToken.trim();
          this.config.telegram.botToken = botToken;
        }
      } catch {}
    }

    if (!botToken || !botToken.trim() || botToken.includes('•')) {
      this.status = 'stopped';
      this.errorMessage = 'Token bot Telegram belum disetel';
      this.emit('status_change', this.getStatus());
      return { success: false, error: 'Telegram bot token is empty or invalid' };
    }

    if (this.bot) {
      await this.stop(false);
    }

    try {
      this.status = 'connecting';
      this.emit('status_change', this.getStatus());

      this.bot = new Telegraf(botToken.trim());

      // Global error handler agar unhandled promise di middleware tidak mematikan bot
      this.bot.catch((err: any, ctx: any) => {
        console.error('[Telegram Bot] Middleware caught error:', err?.message || err);
        try {
          ctx?.reply('⚠️ Terjadi kendala saat memproses perintah ini.');
        } catch {}
      });

      this.bot.use(async (ctx, next) => {
        const text = ctx.message && 'text' in ctx.message ? (ctx.message as any).text : '';
        const userIdentifier = ctx.from?.username ? `@${ctx.from.username}` : String(ctx.from?.id);
        if (text) {
          console.log(`[Telegram Inbound] From: ${userIdentifier} (${ctx.from?.id}) | Text: "${text}"`);
          this.emit('log', {
            platform: 'telegram',
            type: 'inbound',
            sender: userIdentifier,
            text,
            timestamp: Date.now()
          });
        }

        if (!this.isAuthorized(ctx)) {
          const userId = ctx.from?.id;
          return ctx.reply(
            `⚠️ *Akses Ditolak*\nID Telegram Anda: \`${userId}\`\nSilakan daftarkan ID ini di Web UI zhiEnd Agent > Remote Hub / Settings agar dapat mengontrol bot.`,
            { parse_mode: 'Markdown' }
          );
        }
        return next();
      });

      this.bot.command(['start', 'help', 'menu'], async (ctx) => {
        const activeProj = this.config.activeProject || 'Belum dipilih';
        const activePersonaId = this.config.telegram?.personaId || 'persona-default';
        const activePersona = getPersonaById(activePersonaId) || getPersonaById('persona-default');
        const activeEmoji = getSafePersonaEmoji(activePersona?.avatar);
        const personaDisplay = activePersona ? `${activeEmoji} ${activePersona.name}` : '⚡ Standard';

        const helpText = 
`🤖 *zhiEnd AI Coding Agent — Shortcut Commands (Telegram)*

📁 *Project Aktif:* \`${activeProj}\`
🎭 *Persona AI:* ${personaDisplay}
⚡ *Model:* \`${activePersona?.preferred_model || this.config.antigravity?.defaultModel || 'gemini-3.8-flash'}\`

━━━━━━━━━━━━━━━━━━━━━
⌨️ *DAFTAR SHORTCUT PERINTAH:*
━━━━━━━━━━━━━━━━━━━━━

⚡ *Coding Agent:*
• \`/code <instruksi>\` atau *ketik langsung* instruksi Anda.
  _Contoh:_ \`/code buatkan login api\`

🎭 *Persona AI:*
• \`/persona\` : Cek daftar semua Persona AI
• \`/persona <nomor/nama>\` : Ganti persona aktif
  _Contoh:_ \`/persona 2\`

📁 *Workspace Project:*
• \`/project\` : Tampilkan seluruh daftar project & workspace
• \`/project <nomor/nama/path>\` : Ganti folder project aktif
  _Contoh:_ \`/project\` atau \`/project 2\` atau \`/project erp-pos\`

🌿 *Git & Repository:*
• \`/git\` : Cek status branch & file yang berubah
• \`/diff\` : Cek ringkasan diff kode yang berubah
• \`/commit <pesan>\` : Stage & commit perubahan lokal
  _Contoh:_ \`/commit fix: styling button\`
• \`/push\` : Push commit ke GitHub remote

⚙️ *Sistem & Kontrol:*
• \`/status\` : Cek status kesibukan agent
• \`/cancel\` : Batalkan proses AI yang sedang jalan
• \`/id\` : Cek ID Telegram Anda
• \`/help\` atau \`/menu\` : Tampilkan panduan shortcut ini
━━━━━━━━━━━━━━━━━━━━━
💡 *Tips:* Anda bisa langsung mengirim instruksi coding biasa tanpa harus diawali \`/code\`.`;

        return ctx.reply(helpText, { parse_mode: 'Markdown' });
      });

      this.bot.command('id', (ctx) => {
        return ctx.reply(`ID Telegram Anda: \`${ctx.from.id}\``, { parse_mode: 'Markdown' });
      });

      this.bot.command('status', async (ctx) => {
        const busy = this.agentRunner.isBusy();
        const activeProj = this.config.activeProject || 'None';
        const activePersonaId = this.config.telegram?.personaId || 'persona-default';
        const activePersona = getPersonaById(activePersonaId) || getPersonaById('persona-default');
        const activeEmoji = getSafePersonaEmoji(activePersona?.avatar);
        const personaDisplay = activePersona ? `${activeEmoji} ${activePersona.name}` : '⚡ Standard';

        const msg = busy 
          ? `⏳ *Agent Status:* Sedang menjalankan tugas di \`${activeProj}\`...\n🎭 Persona: ${personaDisplay}` 
          : `✅ *Agent Status:* Standby & Siap menerima instruksi.\n📁 Project: \`${activeProj}\`\n🎭 Persona: ${personaDisplay}`;
        return ctx.reply(msg, { parse_mode: 'Markdown' });
      });

      // Persona Command
      this.bot.command('persona', async (ctx) => {
        const text = ctx.message.text.replace('/persona', '').trim().toLowerCase();
        const activePersonaId = this.config.telegram?.personaId || 'persona-default';
        const allPersonas = getPersonas();

        if (!text || text === 'list') {
          let personaMsg = `🎭 *Daftar Persona AI zhiEnd:*\n\n`;
          allPersonas.forEach((p, idx) => {
            const isCurrent = p.id === activePersonaId;
            const pEmoji = getSafePersonaEmoji(p.avatar);
            personaMsg += `${idx + 1}. ${pEmoji} *${p.name}* ${isCurrent ? '*(AKTIF)*' : ''}\n`;
            personaMsg += `   • Model: \`${p.preferred_model || 'default'}\`\n`;
            if (p.traits) personaMsg += `   • Sifat: _${p.traits}_\n`;
            personaMsg += `\n`;
          });
          personaMsg += `*Untuk mengganti persona:*\nKetik \`/persona <nomor atau nama>\`\nContoh: \`/persona 2\` atau \`/persona Reviewer\``;
          return ctx.reply(personaMsg, { parse_mode: 'Markdown' });
        }

        let matchedPersona = null;
        const num = parseInt(text, 10);
        if (!isNaN(num) && num >= 1 && num <= allPersonas.length) {
          matchedPersona = allPersonas[num - 1];
        } else {
          matchedPersona = allPersonas.find(p => 
            p.id.toLowerCase() === text || 
            p.name.toLowerCase().includes(text)
          );
        }

        if (matchedPersona) {
          if (!this.config.telegram) {
            this.config.telegram = { enabled: true, botToken: botToken, allowedUsers: [], personaId: matchedPersona.id };
          } else {
            this.config.telegram.personaId = matchedPersona.id;
          }
          saveConfigToDb(this.config);

          const matchedEmoji = getSafePersonaEmoji(matchedPersona.avatar);
          return ctx.reply(
            `✅ *Persona Telegram berhasil diubah!*\n\n${matchedEmoji} *${matchedPersona.name}*\n⚡ Model: \`${matchedPersona.preferred_model}\`\n🎭 Karakter: _${matchedPersona.traits || 'Adaptif'}_`,
            { parse_mode: 'Markdown' }
          );
        } else {
          return ctx.reply(
            `❌ Persona "${text}" tidak ditemukan.\nKetik \`/persona\` untuk melihat daftar nomor & nama persona.`,
            { parse_mode: 'Markdown' }
          );
        }
      });

      this.bot.command(['project', 'projects'], async (ctx) => {
        const text = ctx.message.text.replace(/^[/!](projects|project)/i, '').trim();
        const activeProj = this.config.activeProject || 'Belum dipilih';
        const allProjects = getAllProjectsList();

        if (!text || text.toLowerCase() === 'list') {
          let msg = `📁 *Daftar Project / Workspace:*\n`;
          msg += `Project Aktif: \`${activeProj}\`\n\n`;

          if (allProjects.length === 0) {
            msg += `_(Belum ada project terdeteksi)_\n`;
          } else {
            allProjects.forEach((p, idx) => {
              const isCurrent = p.isActive || path.resolve(p.path).toLowerCase() === path.resolve(activeProj).toLowerCase();
              msg += `${idx + 1}. 📁 *${p.name}* ${isCurrent ? '*(AKTIF)*' : ''}\n`;
              msg += `   • Path: \`${p.path}\`\n\n`;
            });
          }

          msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
          msg += `💡 *Untuk mengganti project:*\n`;
          msg += `Ketik: \`/project <nomor atau nama>\`\n`;
          msg += `_Contoh:_ \`/project 2\` atau \`/project ${allProjects[1]?.name || 'nama-project'}\`\n`;
          msg += `Atau masukkan path lengkap: \`/project D:/Works/...\``;

          return ctx.reply(msg, { parse_mode: 'Markdown' });
        }

        let targetPath = text;
        const numIdx = parseInt(text, 10);
        if (!isNaN(numIdx) && numIdx >= 1 && numIdx <= allProjects.length) {
          targetPath = allProjects[numIdx - 1].path;
        } else {
          const cleanQ = text.toLowerCase();
          const matched = allProjects.find(p => 
            p.name.toLowerCase() === cleanQ || 
            p.name.toLowerCase().includes(cleanQ) ||
            path.basename(p.path).toLowerCase() === cleanQ
          );
          if (matched) {
            targetPath = matched.path;
          }
        }

        if (this.onProjectChange) {
          const res = await this.onProjectChange(targetPath);
          if (res.success) {
            return ctx.reply(`✅ *Project aktif berhasil diubah ke:*\n📁 \`${res.activeProject || targetPath}\``, { parse_mode: 'Markdown' });
          } else {
            return ctx.reply(`❌ Gagal: ${res.error || 'Direktori tidak ditemukan'}`);
          }
        }
      });

      this.bot.command('git', async (ctx) => {
        const projectPath = this.config.activeProject;
        const status = await this.gitManager.getStatus(projectPath);
        if (!status.isRepo) {
          return ctx.reply(`⚠️ Direktori saat ini bukan git repository:\n\`${projectPath}\``, { parse_mode: 'Markdown' });
        }

        let reply = `🌿 *Git Status:* \`${status.branch}\`\n`;
        if (status.remoteUrl) reply += `🔗 Remote: \`${status.remoteUrl}\`\n`;
        reply += `⬆️ Ahead: ${status.ahead} | ⬇️ Behind: ${status.behind}\n\n`;

        if (status.clean) {
          reply += `✨ *Working tree bersih (no changes).*`;
        } else {
          reply += `*File yang berubah (${status.files.length}):*\n`;
          status.files.slice(0, 15).forEach(f => {
            const icon = f.status === 'untracked' ? '❓' : (f.status === 'added' ? '➕' : (f.status === 'deleted' ? '❌' : '✏️'));
            reply += `${icon} \`${f.path}\` (${f.staged ? 'staged' : 'unstaged'})\n`;
          });
          if (status.files.length > 15) {
            reply += `... dan ${status.files.length - 15} file lainnya.\n`;
          }
          reply += `\nKetik \`/commit <pesan>\` lalu \`/push\` untuk mengirim ke GitHub.`;
        }

        return ctx.reply(reply, { parse_mode: 'Markdown' });
      });

      this.bot.command('diff', async (ctx) => {
        const projectPath = this.config.activeProject;
        const diff = await this.gitManager.getDiff(projectPath);
        if (!diff || !diff.trim()) {
          return ctx.reply('✨ Tidak ada diff / perubahan aktif.');
        }
        const snippet = diff.length > 3500 ? diff.slice(0, 3500) + '\n\n...(truncated)' : diff;
        return ctx.reply(`\`\`\`diff\n${snippet}\n\`\`\``, { parse_mode: 'Markdown' });
      });

      this.bot.command('commit', async (ctx) => {
        const msg = ctx.message.text.replace('/commit', '').trim();
        if (!msg) {
          return ctx.reply('⚠️ Harap sertakan pesan commit. Contoh:\n`/commit fix: update endpoint login`', { parse_mode: 'Markdown' });
        }

        const projectPath = this.config.activeProject;
        await ctx.reply('🔄 Menambahkan file (git add .) dan membuat commit...');
        await this.gitManager.stage(projectPath, ['.']);
        const res = await this.gitManager.commit(projectPath, msg);

        if (res.success) {
          return ctx.reply(`✅ *Commit berhasil!*\n📝 Pesan: "${msg}"\n\nKetik \`/push\` untuk push ke GitHub.`, { parse_mode: 'Markdown' });
        } else {
          return ctx.reply(`❌ *Commit gagal:*\n\`${res.error || res.stdout}\``, { parse_mode: 'Markdown' });
        }
      });

      this.bot.command('push', async (ctx) => {
        const projectPath = this.config.activeProject;
        await ctx.reply('🚀 Menjalankan `git push` ke GitHub...');
        const res = await this.gitManager.push(projectPath);

        if (res.success) {
          return ctx.reply(`🎉 *Git Push Sukses!*\n\`\`\`\n${res.stdout || res.stderr || 'Pushed successfully'}\n\`\`\``, { parse_mode: 'Markdown' });
        } else {
          return ctx.reply(`❌ *Git Push Gagal:*\n\`\`\`\n${res.error || res.stderr || 'Error pushing to remote'}\n\`\`\``, { parse_mode: 'Markdown' });
        }
      });

      this.bot.command(['run', 'start_dev', 'dev'], async (ctx) => {
        const activeProj = this.config.activeProject || 'D:\\Works';
        if (this.onStartDevServer) {
          await ctx.reply(`🚀 Memulai Dev Server untuk project \`${activeProj}\`...`, { parse_mode: 'Markdown' });
          const res = await this.onStartDevServer();
          if (res.success) {
            const tunnelUrl = this.getTunnelUrl ? this.getTunnelUrl() : null;
            let msg = `✅ *Dev Server Berhasil Berjalan!*\n📁 Project: \`${activeProj}\`\n\n`;
            msg += `🌐 *Tautan Akses:*\n`;
            msg += `• *Akses HP (Satu Wi-Fi):* \`http://192.168.0.100:3000\`\n`;
            msg += `• *Akses Gateway HP:* \`http://192.168.0.100:3888/preview/\`\n`;
            msg += `• *Local Port:* \`http://localhost:3000\`\n`;
            if (tunnelUrl) {
              msg += `• *Akses Publik Internet:* ${tunnelUrl}/preview/\n`;
            }
            return ctx.reply(msg, { parse_mode: 'Markdown' });
          } else {
            return ctx.reply(`❌ Gagal memulai server: ${res.message}`);
          }
        }
      });

      this.bot.command('stop', async (ctx) => {
        const activeProj = this.config.activeProject || 'D:\\Works';
        if (this.onStopDevServer) {
          await this.onStopDevServer();
          return ctx.reply(`🛑 Dev server untuk project \`${activeProj}\` telah dihentikan.`, { parse_mode: 'Markdown' });
        }
      });

      this.bot.command('cancel', (ctx) => {
        if (this.agentRunner.isBusy()) {
          this.agentRunner.cancel();
          return ctx.reply('🛑 Proses agent telah dibatalkan.');
        } else {
          return ctx.reply('ℹ️ Tidak ada proses agent yang sedang berjalan.');
        }
      });

      const handleCodingPrompt = async (ctx: any, promptText: string, images?: string[]) => {
        if (!promptText || !promptText.trim()) {
          return ctx.reply('⚠️ Masukkan instruksi coding.');
        }

        if (this.agentRunner.isBusy()) {
          return ctx.reply('⏳ Agent sedang sibuk mengerjakan tugas lain. Gunakan `/cancel` jika ingin membatalkannya.');
        }

        const activeProj = this.config.activeProject || 'D:\\Works';
        const activePersonaId = this.config.telegram?.personaId || 'persona-default';
        const activePersona = getPersonaById(activePersonaId) || getPersonaById('persona-default');
        const activeEmoji = getSafePersonaEmoji(activePersona?.avatar);
        const personaDisplay = activePersona ? `${activeEmoji} ${activePersona.name}` : '⚡ Standard';

        // Otomatis nyalakan dev server jika pesan meminta menjalankan projek
        const isRunReq = /jalankan|running|run dev|start dev|hidupkan|nyalakan.*proje?k|buka.*proje?k/i.test(promptText);
        if (isRunReq && this.onStartDevServer) {
          try {
            console.log(`[Telegram] Auto-starting dev server for ${activeProj}...`);
            await this.onStartDevServer();
            await new Promise((r) => setTimeout(r, 1500));
          } catch (e: any) {
            console.error('[Telegram] Failed auto-start dev server:', e);
          }
        }

        const imageNote = images && images.length > 0 ? `\n🖼️ Terlampir ${images.length} gambar` : '';
        await ctx.reply(
          `🤖 *${personaDisplay} Berjalan...*\n📁 Project: \`${activeProj}\`\n💬 Instruksi: "${promptText.slice(0, 100)}..."${imageNote}\n_Mohon tunggu sebentar..._`,
          { parse_mode: 'Markdown' }
        );

        // Sesi target di SQLite
        let targetSessionId = 'default';
        try {
          const targetSession = getOrCreateDefaultSession(activeProj);
          targetSessionId = targetSession.id;
        } catch (e) {
          console.error('Failed to resolve Telegram session:', e);
        }

        try {
          const result = await this.agentRunner.run({
            prompt: promptText,
            cwd: activeProj,
            sessionId: targetSessionId,
            personaId: activePersonaId,
            model: activePersona?.preferred_model || this.config.antigravity?.defaultModel,
            images: images || []
          });

          const rawResp = result.response || '(Tugas selesai tanpa output teks)';
          const { imagesToSend, cleanResponse } = extractGeneratedImages(rawResp, result.generatedImages);

          // 1. Jika ada file foto yang dihasilkan, kirim langsung sebagai foto Telegram!
          let textToSend = cleanResponse || rawResp;
          if (imagesToSend.length > 0) {
            console.log(`[Telegram] Mengirim ${imagesToSend.length} foto hasil generasi AI...`);
            for (let i = 0; i < imagesToSend.length; i++) {
              const imgPath = imagesToSend[i];
              try {
                // Caption maksimal 1024 karakter di Telegram
                const caption = (i === 0 && textToSend.length <= 1000) ? textToSend : undefined;
                await ctx.replyWithPhoto({ source: imgPath }, caption ? { caption } : undefined);
                if (caption) {
                  textToSend = ''; // Sudah terkirim bersama foto
                }
              } catch (photoErr: any) {
                console.error(`[Telegram] Gagal mengirim photo (${imgPath}):`, photoErr.message);
              }
            }
          }

          // 2. Kirim sisa teks jika masih ada
          if (textToSend && textToSend.trim()) {
            const resp = formatForWhatsApp(textToSend);
            const chunkSize = 3800;
            for (let i = 0; i < resp.length; i += chunkSize) {
              const chunk = resp.slice(i, i + chunkSize);
              await ctx.reply(chunk);
            }
          }

          if (result.status === 'completed') {
            await ctx.reply(`✅ *Selesai* dalam ${result.duration || 'beberapa detik'}. Cek \`/git\` untuk melihat perubahan file.`);
          }
        } catch (err: any) {
          await ctx.reply(`❌ *Error menjalankan agent:*\n${err.message}`);
        }
      };

      this.bot.command('code', async (ctx) => {
        const prompt = ctx.message.text.replace('/code', '').trim();
        await handleCodingPrompt(ctx, prompt);
      });

      this.bot.on('text', async (ctx) => {
        const text = ctx.message.text.trim();
        if (text.startsWith('/')) return;
        await handleCodingPrompt(ctx, text);
      });

      // Handle Telegram Inbound Photos (with Media Group / Album support)
      this.bot.on('photo', async (ctx) => {
        const photos = ctx.message.photo;
        if (!photos || photos.length === 0) return;
        const bestPhoto = photos[photos.length - 1]; // Highest resolution
        
        try {
          const fileLink = await ctx.telegram.getFileLink(bestPhoto.file_id);
          const resp = await fetch(fileLink.href);
          const buffer = Buffer.from(await resp.arrayBuffer());
          const saved = saveChatUploadedFile(buffer, `tg_${bestPhoto.file_id}.jpg`);
          const caption = (ctx.message as any).caption?.trim() || '';

          const mediaGroupId = (ctx.message as any).media_group_id;
          if (mediaGroupId) {
            const existing = this.mediaGroupBatches.get(mediaGroupId);
            if (existing) {
              clearTimeout(existing.timer);
              existing.images.push(saved.url);
              if (caption) existing.captions.push(caption);
              existing.timer = setTimeout(async () => {
                const batch = this.mediaGroupBatches.get(mediaGroupId);
                if (!batch) return;
                this.mediaGroupBatches.delete(mediaGroupId);
                const finalCaption = batch.captions.find(c => c && c.trim()) || 'Tolong analisis dan periksa gambar-gambar terlampir ini.';
                console.log(`[Telegram Album] Memproses ${batch.images.length} foto media_group ${mediaGroupId}`);
                await handleCodingPrompt(batch.ctx, finalCaption, batch.images);
              }, 1200);
            } else {
              const timer = setTimeout(async () => {
                const batch = this.mediaGroupBatches.get(mediaGroupId);
                if (!batch) return;
                this.mediaGroupBatches.delete(mediaGroupId);
                const finalCaption = batch.captions.find(c => c && c.trim()) || 'Tolong analisis dan periksa gambar-gambar terlampir ini.';
                console.log(`[Telegram Album] Memproses ${batch.images.length} foto media_group ${mediaGroupId}`);
                await handleCodingPrompt(batch.ctx, finalCaption, batch.images);
              }, 1200);

              this.mediaGroupBatches.set(mediaGroupId, {
                ctx,
                images: [saved.url],
                captions: caption ? [caption] : [],
                timer
              });
            }
            return;
          }

          console.log(`[Telegram Photo] Saved to ${saved.url} (${saved.absolutePath})`);
          this.emit('log', {
            platform: 'telegram',
            type: 'inbound',
            sender: ctx.from?.username ? `@${ctx.from.username}` : String(ctx.from?.id),
            text: `[Foto Terlampir] ${caption || 'Pemeriksaan Gambar'}`,
            timestamp: Date.now()
          });

          await handleCodingPrompt(ctx, caption || 'Tolong analisis dan periksa gambar terlampir ini.', [saved.url]);
        } catch (err: any) {
          console.error('Error handling Telegram photo:', err);
          await ctx.reply(`⚠️ Gagal memproses gambar: ${err.message}`);
        }
      });

      // Handle Telegram Inbound Voice Notes / Audio
      this.bot.on(['voice', 'audio'], async (ctx) => {
        const voice = (ctx.message as any).voice || (ctx.message as any).audio;
        if (!voice) return;

        try {
          const fileLink = await ctx.telegram.getFileLink(voice.file_id);
          const resp = await fetch(fileLink.href);
          const buffer = Buffer.from(await resp.arrayBuffer());

          await ctx.reply('🎙️ _Mendengarkan dan mentranskripsi pesan suara..._', { parse_mode: 'Markdown' });
          const transRes = await voiceService.transcribeAudio(buffer, `tg_voice_${voice.file_id}.ogg`, 'audio/ogg');
          if (!transRes.success || !transRes.text) {
            return ctx.reply(`⚠️ Gagal mengenali suara: ${transRes.error || 'Suara kurang jelas'}`);
          }

          const transcribed = transRes.text;
          await ctx.reply(`🎙️ *Perintah Suara:* "${transcribed}"`, { parse_mode: 'Markdown' });

          this.emit('log', {
            platform: 'telegram',
            type: 'inbound',
            sender: ctx.from?.username ? `@${ctx.from.username}` : String(ctx.from?.id),
            text: `[Voice Note] ${transcribed}`,
            timestamp: Date.now()
          });

          await handleCodingPrompt(ctx, transcribed);
        } catch (err: any) {
          console.error('Error handling Telegram voice note:', err);
          await ctx.reply(`⚠️ Gagal memproses pesan suara: ${err.message}`);
        }
      });

      // Handle Telegram Inbound Documents (images sent as file)
      this.bot.on('document', async (ctx) => {
        const doc = ctx.message.document;
        if (doc && doc.mime_type?.startsWith('image/')) {
          try {
            const fileLink = await ctx.telegram.getFileLink(doc.file_id);
            const resp = await fetch(fileLink.href);
            const buffer = Buffer.from(await resp.arrayBuffer());
            const saved = saveChatUploadedFile(buffer, doc.file_name || `tg_doc_${doc.file_id}.jpg`);
            const caption = (ctx.message as any).caption?.trim() || 'Tolong analisis dan periksa dokumen gambar ini.';

            this.emit('log', {
              platform: 'telegram',
              type: 'inbound',
              sender: ctx.from?.username ? `@${ctx.from.username}` : String(ctx.from?.id),
              text: `[Dokumen Gambar] ${caption}`,
              timestamp: Date.now()
            });

            await handleCodingPrompt(ctx, caption, [saved.url]);
          } catch (err: any) {
            console.error('Error handling Telegram document photo:', err);
            await ctx.reply(`⚠️ Gagal memproses dokumen gambar: ${err.message}`);
          }
        }
      });

      this.bot.launch().catch(err => {
        console.warn('[Telegram Bot] Polling error / network drop:', err?.message || err);
        this.status = 'error';
        this.errorMessage = err?.message || 'Koneksi terputus';
        this.emit('status_change', this.getStatus());

        // Auto-reconnect watchdog jika bot diizinkan aktif dan bukan di-stop sengaja oleh user
        if (!this.isUserStopped && this.config.telegram?.enabled) {
          this.scheduleReconnect();
        }
      });

      this.botInfo = await this.bot.telegram.getMe();
      this.status = 'running';
      this.errorMessage = null;
      this.emit('status_change', this.getStatus());

      return { success: true, botInfo: this.botInfo };
    } catch (err: any) {
      console.error('Error starting Telegram bot:', err);
      this.status = 'error';
      this.errorMessage = err.message;
      this.emit('status_change', this.getStatus());

      if (!this.isUserStopped && this.config.telegram?.enabled) {
        this.scheduleReconnect();
      }
      return { success: false, error: err.message };
    }
  }

  private scheduleReconnect(delayMs: number = 5000): void {
    if (this.isUserStopped || this.isReconnecting) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    console.log(`[Telegram Bot] 🔄 Menjadwalkan rekoneksi otomatis dalam ${delayMs / 1000}s...`);
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.isUserStopped) return;
      this.isReconnecting = true;
      try {
        console.log('[Telegram Bot] 🔄 Mencoba rekoneksi otomatis ke Telegram...');
        await this.start();
      } catch (e: any) {
        console.warn('[Telegram Bot] Rekoneksi gagal, akan mencoba ulang nanti:', e?.message || e);
      } finally {
        this.isReconnecting = false;
      }
    }, delayMs);
  }

  public async stop(fromUser: boolean = true): Promise<{ success: boolean }> {
    if (fromUser) {
      this.isUserStopped = true;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.bot) {
      try {
        this.bot.stop();
      } catch (e) {
        console.error('Error stopping Telegram bot:', e);
      }
      this.bot = null;
    }
    this.status = 'stopped';
    this.botInfo = null;
    this.emit('status_change', this.getStatus());
    return { success: true };
  }

  public getStatus(): TelegramStatus {
    return {
      status: this.status,
      botInfo: this.botInfo,
      error: this.errorMessage
    };
  }
}
