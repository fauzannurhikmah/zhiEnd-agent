const { Telegraf } = require('telegraf');

class TelegramBotManager {
  constructor({ config, agentRunner, gitManager, onProjectChange }) {
    this.config = config;
    this.agentRunner = agentRunner;
    this.gitManager = gitManager;
    this.onProjectChange = onProjectChange;
    this.bot = null;
    this.botInfo = null;
    this.status = 'stopped'; // 'stopped' | 'running' | 'error'
    this.errorMessage = null;
  }

  isAuthorized(ctx) {
    const allowed = this.config.telegram?.allowedUsers || [];
    if (!allowed || allowed.length === 0) {
      // If none set, allow everyone or prompt them with their ID
      return true;
    }
    const userId = String(ctx.from?.id);
    const username = ctx.from?.username ? `@${ctx.from.username.toLowerCase()}` : '';
    return allowed.some(a => String(a).toLowerCase() === userId || String(a).toLowerCase() === username);
  }

  async start(token) {
    const botToken = token || this.config.telegram?.botToken;
    if (!botToken || !botToken.trim()) {
      this.status = 'stopped';
      this.errorMessage = 'No bot token provided';
      return { success: false, error: 'Telegram bot token is empty' };
    }

    if (this.bot) {
      await this.stop();
    }

    try {
      this.bot = new Telegraf(botToken.trim());

      // Authorization middleware
      this.bot.use(async (ctx, next) => {
        if (!this.isAuthorized(ctx)) {
          const userId = ctx.from?.id;
          return ctx.reply(
            `⚠️ *Akses Ditolak*\nID Telegram Anda: \`${userId}\`\nSilakan tambahkan ID ini di Web UI zhiEnd Agent > Remote Hub agar dapat mengontrol bot.`,
            { parse_mode: 'Markdown' }
          );
        }
        return next();
      });

      // /start & /help
      this.bot.command(['start', 'help'], async (ctx) => {
        const activeProj = this.config.activeProject || 'Belum dipilih';
        const helpText = 
`🤖 *zhiEnd AI Coding Agent (Antigravity)*

📁 *Project Aktif:* \`${activeProj}\`
⚡ *Model:* \`${this.config.antigravity?.defaultModel || 'gemini-3.8-flash'}\`

*Perintah Remote:*
• Kirim pesan langsung atau \`/code <perintah>\` untuk coding
• \`/git\` - Cek status git repo aktif
• \`/diff\` - Cek git diff perubahan file
• \`/commit <pesan>\` - Stage & commit perubahan
• \`/push\` - Push perubahan ke GitHub
• \`/project <path>\` - Ganti project aktif
• \`/cancel\` - Hentikan proses AI yang sedang jalan
• \`/id\` - Tampilkan ID Telegram Anda`;
        return ctx.reply(helpText, { parse_mode: 'Markdown' });
      });

      // /id
      this.bot.command('id', (ctx) => {
        return ctx.reply(`ID Telegram Anda: \`${ctx.from.id}\``, { parse_mode: 'Markdown' });
      });

      // /status
      this.bot.command('status', async (ctx) => {
        const busy = this.agentRunner.isBusy();
        const activeProj = this.config.activeProject || 'None';
        const msg = busy 
          ? `⏳ *Agent Status:* Sedang menjalankan tugas di \`${activeProj}\`...` 
          : `✅ *Agent Status:* Standby & Siap menerima instruksi.\n📁 Project: \`${activeProj}\``;
        return ctx.reply(msg, { parse_mode: 'Markdown' });
      });

      // /project
      this.bot.command('project', async (ctx) => {
        const text = ctx.message.text.replace('/project', '').trim();
        if (!text) {
          return ctx.reply(`📁 *Project aktif saat ini:*\n\`${this.config.activeProject}\`\n\nUntuk mengganti: \`/project D:/Path/Ke/Project\``, { parse_mode: 'Markdown' });
        }

        if (this.onProjectChange) {
          const res = await this.onProjectChange(text);
          if (res.success) {
            return ctx.reply(`✅ *Project aktif berhasil diubah ke:*\n\`${text}\``, { parse_mode: 'Markdown' });
          } else {
            return ctx.reply(`❌ Gagal: ${res.error || 'Direktori tidak ditemukan'}`);
          }
        }
      });

      // /git
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

      // /diff
      this.bot.command('diff', async (ctx) => {
        const projectPath = this.config.activeProject;
        const diff = await this.gitManager.getDiff(projectPath);
        if (!diff || !diff.trim()) {
          return ctx.reply('✨ Tidak ada diff / perubahan aktif.');
        }
        const snippet = diff.length > 3500 ? diff.slice(0, 3500) + '\n\n...(truncated)' : diff;
        return ctx.reply(`\`\`\`diff\n${snippet}\n\`\`\``, { parse_mode: 'Markdown' });
      });

      // /commit
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

      // /push
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

      // /cancel
      this.bot.command('cancel', (ctx) => {
        if (this.agentRunner.isBusy()) {
          this.agentRunner.cancel();
          return ctx.reply('🛑 Proses agent telah dibatalkan.');
        } else {
          return ctx.reply('ℹ️ Tidak ada proses agent yang sedang berjalan.');
        }
      });

      // /code or any plain text message
      const handleCodingPrompt = async (ctx, promptText) => {
        if (!promptText || !promptText.trim()) {
          return ctx.reply('⚠️ Masukkan instruksi coding.');
        }

        if (this.agentRunner.isBusy()) {
          return ctx.reply('⏳ Agent sedang sibuk mengerjakan tugas lain. Gunakan `/cancel` jika ingin membatalkannya.');
        }

        const activeProj = this.config.activeProject;
        const statusMsg = await ctx.reply(
          `🤖 *Antigravity Agent Berjalan...*\n📁 Project: \`${activeProj}\`\n💬 Instruksi: "${promptText.slice(0, 100)}..."\n_Mohon tunggu sebentar..._`,
          { parse_mode: 'Markdown' }
        );

        try {
          const result = await this.agentRunner.run({
            prompt: promptText,
            cwd: activeProj,
            model: this.config.antigravity?.defaultModel
          });

          const resp = result.response || '(Tugas selesai tanpa output teks)';
          // Split into chunks if too long for Telegram (limit 4096)
          const chunkSize = 3800;
          for (let i = 0; i < resp.length; i += chunkSize) {
            const chunk = resp.slice(i, i + chunkSize);
            await ctx.reply(chunk);
          }

          if (result.status === 'completed') {
            await ctx.reply(`✅ *Selesai* dalam ${result.duration || 'beberapa detik'}. Cek \`/git\` untuk melihat perubahan file.`);
          }
        } catch (err) {
          await ctx.reply(`❌ *Error menjalankan agent:*\n${err.message}`);
        }
      };

      this.bot.command('code', async (ctx) => {
        const prompt = ctx.message.text.replace('/code', '').trim();
        await handleCodingPrompt(ctx, prompt);
      });

      this.bot.on('text', async (ctx) => {
        const text = ctx.message.text.trim();
        if (text.startsWith('/')) return; // handled by commands
        await handleCodingPrompt(ctx, text);
      });

      // Launch bot in background
      this.bot.launch().catch(err => {
        console.error('Telegram bot launch error:', err);
        this.status = 'error';
        this.errorMessage = err.message;
      });

      this.botInfo = await this.bot.telegram.getMe();
      this.status = 'running';
      this.errorMessage = null;

      console.log(`Telegram Bot @${this.botInfo.username} connected and running.`);

      return {
        success: true,
        botInfo: this.botInfo
      };

    } catch (err) {
      console.error('Failed to start Telegram Bot:', err);
      this.status = 'error';
      this.errorMessage = err.message;
      return { success: false, error: err.message };
    }
  }

  async stop() {
    if (this.bot) {
      try {
        await this.bot.stop();
      } catch (e) {
        console.error('Error stopping telegram bot:', e);
      }
      this.bot = null;
    }
    this.status = 'stopped';
    this.botInfo = null;
    return { success: true };
  }

  getStatus() {
    return {
      status: this.status,
      botInfo: this.botInfo,
      error: this.errorMessage
    };
  }
}

module.exports = TelegramBotManager;
