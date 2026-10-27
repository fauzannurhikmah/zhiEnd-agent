import { spawn, ChildProcess } from 'child_process';
import readline from 'readline';
import path from 'path';
import os from 'os';
import { EventEmitter } from 'events';
import { AppConfig, AgentTask } from './types';
import { getWorkspaceContext, getCustomRootWorkspace, getChatSessionById, getPersonaById } from './db/database';
import { parseDirectCommand, spawnDirectCommand } from './directCommandRunner';

function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name];
    if (netList) {
      for (const iface of netList) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  }
  return '127.0.0.1';
}

export interface RunOptions {
  prompt: string;
  cwd?: string;
  model?: string;
  conversationId?: string;
  continueLast?: boolean;
  sessionId?: string;
  personaId?: string;
  images?: string[];
}

export class AgentRunner extends EventEmitter {
  private config: AppConfig;
  private getTunnelUrl?: () => string | null;
  public currentProcess: ChildProcess | null = null;
  public activeTask: AgentTask | null = null;
  public history: AgentTask[] = [];

  constructor(config: AppConfig, getTunnelUrl?: () => string | null) {
    super();
    this.config = config;
    this.getTunnelUrl = getTunnelUrl;
  }

  public updateConfig(config: AppConfig): void {
    this.config = config;
  }

  public isBusy(): boolean {
    return this.currentProcess !== null;
  }

  public async run(options: RunOptions): Promise<AgentTask> {
    if (this.isBusy()) {
      throw new Error('Agent is already running a task. Please wait or cancel the current task.');
    }

    const workingDir = options.cwd || this.config.activeProject || process.cwd();

    // ⚡ Fast-path: Direct CLI Execution (Bypass heavy autonomous AI loop for instant results)
    const directCheck = parseDirectCommand(options.prompt);
    if (directCheck.isDirect && directCheck.command) {
      console.log(`[AgentRunner] ⚡ Fast Direct Command detected: "${directCheck.command}". Executing directly in "${workingDir}"...`);
      return this.runDirectCommand(directCheck.command, options, workingDir);
    }

    const cliPath = this.config.antigravity?.cliPath || 'agy.exe';

    const localIp = getLocalIP();
    const port = this.config.port || 3888;
    const publicTunnelUrl = (this.getTunnelUrl ? this.getTunnelUrl() : null) || this.config.tunnel?.publicUrl || '';
    const rootDir = getCustomRootWorkspace();

    const wsCtx = getWorkspaceContext(workingDir);
    let cachedContextStr = '';
    if (wsCtx) {
      cachedContextStr = `\n[Memory Cache Workspace - Hemat Token & Akselerasi]:
- Tech Stack: ${wsCtx.tech_stack || 'N/A'}
- Package Manager: ${wsCtx.package_manager || 'N/A'}
- Dev Command: ${wsCtx.dev_command || 'N/A'}
- Dev Port: ${wsCtx.dev_port || 3000}
${wsCtx.key_files && wsCtx.key_files.length > 0 ? `- Key Files: ${wsCtx.key_files.join(', ')}` : ''}
${wsCtx.architecture_summary ? `- Arsitektur: ${wsCtx.architecture_summary}` : ''}
${wsCtx.custom_rules ? `- Aturan Khusus: ${wsCtx.custom_rules}` : ''}
(Gunakan informasi di atas langsung tanpa perlu membaca ulang file manifest/config)`;
    }

    let personaStr = '';
    let personaModel = '';
    const targetPersonaId = options.personaId || (options.sessionId ? getChatSessionById(options.sessionId)?.persona_id : null);
    if (targetPersonaId) {
      const persona = getPersonaById(targetPersonaId);
      if (persona) {
        personaModel = persona.preferred_model || '';
        const traitsLine = persona.traits ? `\n- Karakter & Sifat: ${persona.traits}` : '';
        personaStr = `\n[Persona AI Aktif: ${persona.name}]:${traitsLine}
[Instruksi Peran & Gaya]:
${persona.system_prompt}
(PENTING: Terapkan karakter/sifat dan instruksi peran persona di atas dalam seluruh respon, gaya komunikasi, dan eksekusi kode Anda)`;
      }
    }

    const selectedModel = options.model || personaModel || this.config.antigravity?.defaultModel || 'gemini-3.8-flash-high';

    let imagesContext = '';
    if (options.images && options.images.length > 0) {
      const formattedPaths = options.images.map(img => {
        if (img.startsWith('/uploads/')) {
          return path.join(__dirname, '..', 'data', img.replace(/^\//, '')).replace(/\\/g, '/');
        }
        return img;
      });

      imagesContext = `\n[Lampiran Gambar dari Pengguna]:
Pengguna telah mengunggah gambar berikut untuk diperiksa:
${formattedPaths.map(p => `• File Gambar: "${p}"`).join('\n')}
(PANDUAN: Anda DAPAT melihat dan menganalisis visual gambar tersebut menggunakan tool view_file(AbsolutePath: "${formattedPaths[0]}"). Gunakan file gambar ini untuk memeriksa desain UI, mockup, screenshot error, atau tata letak yang diinginkan pengguna!)\n`;
    }

    const promptWithContext = `[Konteks Workspace: "${workingDir}"]${cachedContextStr}${personaStr}${imagesContext}
[Panduan Operasional Sistem & Efisiensi Eksekusi]:
1. ATURAN EFISIENSI EKSEKUSI (Zero Redundancy):
   - JANGAN PERNAH menjalankan perintah terminal/powershell atau membaca file yang sama berulang kali jika sudah berhasil 1 kali! Hanya boleh mengulang HANYA JIKA perintah sebelumnya error/gagal dan Anda perlu memperbaiki parameternya.
   - DILARANG KERAS melakukan polling loop menggunakan tool manage_task (Action: 'status') berulang kali dalam satu giliran! Sistem berbasis event akan otomatis memberikan notifikasi saat background task selesai.
   - Selesaikan tugas dengan langkah seminimal dan seefisien mungkin tanpa perulangan yang tidak perlu.
2. ATURAN EKSEKUSI PERINTAH TERMINAL / CLI (Anti Over-Verification):
   - Jika pengguna meminta Anda menjalankan suatu perintah CLI/terminal tertentu (seperti npm, npx, git, script build, database push/migrate, dsb.):
     a. CUKUP JALANKAN perintah yang diminta SATU KALI menggunakan run_command.
     b. DILARANG KERAS melakukan 'over-verification' atau pengujian berlebih (seperti membuat script scratch uji coba, mengecek package.json berulang kali, mengecek git status/submodule, atau membaca file schema/config) KECUALI jika pengguna secara eksplisit memintanya!
     c. Begitu perintah terminal selesai dan berhasil (exit code 0), SEGERA laporkan outputnya ke pengguna dan SELESAIKAN tugas saat itu juga. Jangan memperpanjang langkah!
3. Root direktori default untuk semua project adalah ${rootDir}. Jika diminta membuat project baru atau menyimpan file baru tanpa path absolut, SELALU buat dan simpan langsung di dalam ${rootDir} (contoh: ${rootDir}\\<nama-project>).
4. PENTING - Menjalankan Project & Dev Server:
   - Jika pengguna meminta menjalankan projek ('jalankan projek ini', 'running dev', dll.):
     Sistem backend zhiEnd Agent OTOMATIS SUDAH MEMULAI Dev Server di latar belakang untuk workspace ini. Anda TIDAK PERLU lagi mengeksekusi 'npm run dev', 'pnpm dev', 'Start-Process', atau berulang-ulang mengecek port dengan 'Get-NetTCPConnection' / 'Start-Sleep'.
   - PANDUAN TAUTAN AKSES PROJEK (Tampilkan dengan rapi, jelas, dan pisahkan untuk HP vs Laptop):
     📱 AKSES DARI HP (SMARTPHONE):
     • Jika HP & Laptop terhubung ke Wi-Fi yang SAMA (Sangat Disarankan, Paling Cepat):
       - Direct: http://${localIp}:${wsCtx?.dev_port || 3000} (Buka langsung di browser HP)
       - Gateway: http://${localIp}:${port}/preview/
     ${publicTunnelUrl ? `• Jika HP di luar / pakai Kuota Data Seluler (Akses Publik):
       - Public Tunnel: ${publicTunnelUrl}/preview/
       (Jika muncul verifikasi IP dari Localtunnel, masukkan Tunnel Password/IP Publik laptop Anda)` : ''}

     💻 AKSES DARI LAPTOP / PC:
     - Localhost: http://localhost:${wsCtx?.dev_port || 3000}
     - Gateway: http://localhost:5173/preview/ (atau http://localhost:${port}/preview/)
   ATURAN FORMAT RESPON:
   - Sajikan tautan di atas secara terstruktur menggunakan Markdown link atau list yang rapi.
   - DILARANG KERAS mematikan atau menghentikan port 5173 (zhiEnd Agent frontend) dan port ${port} (zhiEnd Agent backend)!
5. ATURAN HASIL GENERASI GAMBAR (Ultra-Clean Visual Presentation):
   - Jika pengguna meminta membuat atau menghasilkan gambar (menggunakan generate_image atau subagent pembuat gambar):
     a. Cukup tampilkan gambar menggunakan format Markdown Image standar:
        ![Deskripsi Gambar](path/ke/file_gambar.png)
     b. DILARANG KERAS menyertakan teks '📁 Lokasi File:' atau mencantumkan path lokal di dalam teks respon. Tampilan harus bersih dan rapi tanpa teks lokasi file.
     c. Pengguna akan mengunduh gambar langsung dengan mengklik gambar tersebut di antarmuka Web UI.

Permintaan Pengguna:
${options.prompt}`;

    const args: string[] = [
      '-p', promptWithContext,
      '--output-format', 'stream-json',
      '--dangerously-skip-permissions',
      '--model', selectedModel
    ];

    if (options.conversationId) {
      args.push('--conversation', options.conversationId);
    } else if (options.continueLast) {
      args.push('-c');
    }

    const taskId = 'task_' + Date.now();
    this.activeTask = {
      id: taskId,
      prompt: options.prompt,
      project: workingDir,
      model: selectedModel,
      startTime: Date.now(),
      status: 'running',
      response: '',
      conversationId: options.conversationId || null,
      toolsExecuted: [],
      sessionId: options.sessionId,
      images: options.images || []
    };

    this.emit('task_start', {
      taskId,
      prompt: options.prompt,
      project: workingDir,
      model: selectedModel,
      sessionId: options.sessionId,
      images: options.images || []
    });

    return new Promise<AgentTask>((resolve, reject) => {
      let stderrBuffer = '';
      let rawBuffer = '';

      try {
        const proc = spawn(cliPath, args, {
          cwd: workingDir,
          env: { ...process.env },
          shell: false,
          windowsHide: true
        });

        this.currentProcess = proc;

        if (proc.stdout) {
          const rlOut = readline.createInterface({ input: proc.stdout });
          rlOut.on('line', (line) => {
            line = line.trim();
            if (!line) return;

            try {
              const data = JSON.parse(line);
              this.handleStreamEvent(data);
            } catch {
              rawBuffer += (rawBuffer ? '\n' : '') + line;
              this.emit('agent_raw', { taskId, text: line });
            }
          });
        }

        if (proc.stderr) {
          const rlErr = readline.createInterface({ input: proc.stderr });
          rlErr.on('line', (line) => {
            line = line.trim();
            if (line) {
              stderrBuffer += (stderrBuffer ? '\n' : '') + line;
              this.emit('agent_stderr', { taskId, text: line });
            }
          });
        }

        proc.on('close', (code) => {
          this.currentProcess = null;
          if (!this.activeTask) return;

          const duration = ((Date.now() - this.activeTask.startTime) / 1000).toFixed(1);
          this.activeTask.duration = `${duration}s`;
          this.activeTask.status = code === 0 ? 'completed' : 'failed';
          this.activeTask.exitCode = code;

          // If no direct text was emitted, provide a rich, informative response
          if (!this.activeTask.response?.trim()) {
            if (rawBuffer.trim()) {
              this.activeTask.response = rawBuffer.trim();
            } else if (this.activeTask.toolsExecuted && this.activeTask.toolsExecuted.length > 0) {
              this.activeTask.response = `✅ Tugas berhasil diselesaikan dengan eksekusi langkah:\n` +
                this.activeTask.toolsExecuted.map(t => `• ${t}`).join('\n');
            } else if (stderrBuffer.trim()) {
              this.activeTask.response = `⚠️ Warning / Info:\n${stderrBuffer.trim()}`;
            } else {
              this.activeTask.response = `Proses selesai (exit code: ${code}).`;
            }
          }

          // Otomatis lampirkan link live preview & public tunnel jika permintaan adalah menjalankan projek
          const isRunReq = /jalankan|running|run|start.*proje?k/i.test(options.prompt);
          if (isRunReq && !this.activeTask.response.includes('/preview/')) {
            const previewLocal = `http://localhost:5173/preview/`;
            const previewLan = `http://${localIp}:${port}/preview/`;
            const previewPublic = publicTunnelUrl ? `${publicTunnelUrl}/preview/` : null;

            let linksBlock = `\n\n━━━━━━━━━━━━━━━━━━━━━\n🌐 **Tautan Akses Projek (Aktif):**\n• 💻 **Local Preview:** ${previewLocal}\n• 📱 **Wi-Fi LAN (HP/Perangkat):** ${previewLan}\n`;
            if (previewPublic) {
              linksBlock += `• 🌍 **Akses Publik Internet:** ${previewPublic}\n`;
            } else {
              linksBlock += `• 🌍 **Akses Publik Internet:** _(Buka tab Remote Hub > Akses Jaringan untuk mengaktifkan Public Tunnel)_\n`;
            }
            linksBlock += `━━━━━━━━━━━━━━━━━━━━━`;
            this.activeTask.response += linksBlock;
            this.emit('agent_delta', {
              taskId,
              delta: linksBlock,
              accumulated: this.activeTask.response
            });
          }

          // Auto-detect and populate generated image disk paths into generatedImages (separate from user upload images)
          const genImages: string[] = [];
          if (this.activeTask.response) {
            const imgRegex = /!?\[[^\]]*\]\(([^)]+\.(?:png|jpe?g|webp|gif|svg)[^)]*)\)/gi;
            let match;
            while ((match = imgRegex.exec(this.activeTask.response)) !== null) {
              const rawUrl = match[1].trim();
              let diskPath = rawUrl;
              if (rawUrl.startsWith('file:///')) {
                diskPath = decodeURIComponent(rawUrl.replace(/^file:\/\/\//, ''));
              }
              if (/^\/[A-Za-z]:/.test(diskPath)) {
                diskPath = diskPath.substring(1);
              }
              diskPath = path.normalize(diskPath);
              if (!genImages.includes(diskPath)) {
                genImages.push(diskPath);
              }
            }
          }
          this.activeTask.generatedImages = genImages;

          const finishedTask = { ...this.activeTask };
          this.history.unshift(finishedTask);
          if (this.history.length > 50) this.history.pop();

          this.emit('task_end', {
            id: finishedTask.id,
            taskId: finishedTask.id,
            prompt: finishedTask.prompt,
            project: finishedTask.project,
            model: finishedTask.model,
            status: finishedTask.status,
            response: finishedTask.response,
            duration: finishedTask.duration,
            conversationId: finishedTask.conversationId,
            toolsExecuted: finishedTask.toolsExecuted,
            steps: finishedTask.steps || [],
            thought: finishedTask.thought || '',
            sessionId: finishedTask.sessionId,
            images: options.images || [], // Hanya gambar yang diunggah oleh pengguna
            generatedImages: genImages
          });

          this.activeTask = null;
          resolve(finishedTask);
        });

        proc.on('error', (err) => {
          this.currentProcess = null;
          if (this.activeTask) {
            this.activeTask.status = 'error';
            this.activeTask.error = err.message;
          }
          this.emit('task_error', { taskId, error: err.message });
          this.activeTask = null;
          reject(err);
        });

      } catch (err) {
        this.currentProcess = null;
        this.activeTask = null;
        reject(err);
      }
    });
  }

  private handleStreamEvent(data: any): void {
    if (!this.activeTask) return;
    const taskId = this.activeTask.id;

    if (data.event === 'init') {
      this.activeTask.conversationId = data.conversation_id;
      this.emit('agent_init', {
        taskId,
        conversationId: data.conversation_id,
        tools: data.init?.tools || []
      });
    } else if (data.event === 'step_update') {
      const step = data.step_update;
      if (step) {
        if (step.conversation_id) {
          this.activeTask.conversationId = step.conversation_id;
        }

        if (step.text_delta) {
          this.activeTask.response += step.text_delta;
          this.emit('agent_delta', {
            taskId,
            delta: step.text_delta,
            accumulated: this.activeTask.response
          });
        }

        // Handle rich process steps (tools, file modifications, reasoning)
        let toolDesc: string | undefined;
        let processStep: any = null;

        if (step.step_type === 'tool') {
          const toolName = step.tool_name || step.tool_info?.name || 'tool';
          const params = step.tool_info?.parameters || {};
          const stepIdx = step.step_index !== undefined ? step.step_index : (step.id || step.tool_call_id);
          const stepId = stepIdx !== undefined
            ? `step_${taskId}_${stepIdx}`
            : `step_${taskId}_${toolName}`;
          
          if (toolName === 'run_command') {
            const cmd = params.CommandLine || '';
            toolDesc = `run: ${cmd}`;
            processStep = {
              id: stepId,
              stepIndex: step.step_index,
              type: 'run',
              title: 'Menjalankan Perintah',
              command: cmd,
              detail: cmd,
              timestamp: Date.now()
            };
          } else if (toolName === 'read_file' || toolName === 'view_file') {
            const rawPath = params.Path || params.AbsolutePath || '';
            const fname = rawPath.replace(/\\/g, '/').split('/').pop() || rawPath;
            const lines = (params.StartLine !== undefined && params.EndLine !== undefined)
              ? `Baris ${params.StartLine} - ${params.EndLine}`
              : undefined;
            toolDesc = `read: ${fname}`;
            processStep = {
              id: stepId,
              stepIndex: step.step_index,
              type: 'read',
              title: `Membaca ${fname}`,
              file: fname,
              lines,
              detail: lines ? `Membaca ${fname} (${lines})` : `Menganalisis file ${fname}`,
              timestamp: Date.now()
            };
          } else if (toolName === 'write_to_file') {
            const rawPath = params.TargetFile || params.Path || '';
            const fname = rawPath.replace(/\\/g, '/').split('/').pop() || rawPath;
            toolDesc = `write: ${fname}`;
            processStep = {
              id: stepId,
              stepIndex: step.step_index,
              type: 'write',
              title: `Menulis ${fname}`,
              file: fname,
              instruction: params.Instruction || params.Description,
              detail: params.Description || `Membuat file: ${fname}`,
              timestamp: Date.now()
            };
          } else if (toolName === 'replace_file_content' || toolName === 'multi_replace_file_content') {
            const rawPath = params.TargetFile || params.Path || '';
            const fname = rawPath.replace(/\\/g, '/').split('/').pop() || rawPath;
            const lines = (params.StartLine !== undefined && params.EndLine !== undefined)
              ? `Baris ${params.StartLine} - ${params.EndLine}`
              : undefined;
            toolDesc = `edit: ${fname}`;
            processStep = {
              id: stepId,
              stepIndex: step.step_index,
              type: 'edit',
              title: `Mengubah ${fname}`,
              file: fname,
              lines,
              instruction: params.Instruction || params.Description,
              detail: (params.Instruction || params.Description || 'Modifikasi kodingan') + (lines ? ` (${lines})` : ''),
              timestamp: Date.now()
            };
          } else if (toolName === 'list_dir') {
            const dir = params.DirectoryPath ? params.DirectoryPath.replace(/\\/g, '/').split('/').pop() : 'dir';
            toolDesc = `ls: ${dir}`;
            processStep = {
              id: stepId,
              stepIndex: step.step_index,
              type: 'list',
              title: `Memeriksa direktori ${dir}`,
              detail: `Daftar file di folder ${params.DirectoryPath || dir}`,
              timestamp: Date.now()
            };
          } else if (toolName === 'grep_search') {
            toolDesc = `grep: ${params.Query}`;
            processStep = {
              id: stepId,
              stepIndex: step.step_index,
              type: 'search',
              title: `Mencari '${params.Query}'`,
              detail: `Pencarian kode di workspace`,
              timestamp: Date.now()
            };
          } else {
            toolDesc = toolName;
            processStep = {
              id: stepId,
              stepIndex: step.step_index,
              type: 'tool',
              title: `Eksekusi ${toolName}`,
              detail: typeof params === 'object' ? JSON.stringify(params).slice(0, 100) : '',
              timestamp: Date.now()
            };
          }

          if (toolDesc && !this.activeTask.toolsExecuted?.includes(toolDesc)) {
            this.activeTask.toolsExecuted = this.activeTask.toolsExecuted || [];
            this.activeTask.toolsExecuted.push(toolDesc);
          }
          if (processStep) {
            this.activeTask.steps = this.activeTask.steps || [];
            const existingIdx = this.activeTask.steps.findIndex((s: any) => s.id === stepId);
            if (existingIdx !== -1) {
              this.activeTask.steps[existingIdx] = {
                ...this.activeTask.steps[existingIdx],
                ...processStep,
                state: step.state || 'completed'
              };
            } else {
              this.activeTask.steps.push(processStep);
            }
          }
        } else if (step.step_type === 'thought' || step.thought || step.reasoning) {
          const thoughtText = step.thought || step.reasoning || step.text_delta || '';
          if (thoughtText && thoughtText.trim()) {
            this.activeTask.thought = (this.activeTask.thought || '') + thoughtText;
            const thoughtId = `thought_${taskId}`;
            processStep = {
              id: thoughtId,
              type: 'thought',
              title: 'Reasoning & Analisis',
              thought: this.activeTask.thought,
              detail: this.activeTask.thought,
              timestamp: Date.now()
            };
            this.activeTask.steps = this.activeTask.steps || [];
            const existingIdx = this.activeTask.steps.findIndex((s: any) => s.id === thoughtId);
            if (existingIdx !== -1) {
              this.activeTask.steps[existingIdx] = processStep;
            } else {
              this.activeTask.steps.push(processStep);
            }
          }
        }

        this.emit('agent_step', {
          taskId,
          stepIndex: step.step_index,
          stepType: step.step_type,
          toolName: step.tool_name || step.tool_info?.name,
          toolDesc,
          processStep,
          thought: this.activeTask.thought,
          state: step.state,
          usage: step.usage,
          textDelta: step.text_delta
        });
      }
    } else if (data.event === 'result') {
      if (data.result?.response) {
        this.activeTask.response = data.result.response;
      }
      this.emit('agent_result', {
        taskId,
        result: data.result
      });
    }
  }

  private async runDirectCommand(command: string, options: RunOptions, workingDir: string): Promise<AgentTask> {
    const taskId = 'task_' + Date.now();
    this.activeTask = {
      id: taskId,
      prompt: options.prompt,
      project: workingDir,
      model: '⚡ Direct CLI',
      startTime: Date.now(),
      status: 'running',
      response: '',
      conversationId: options.conversationId || null,
      toolsExecuted: [`run_command: ${command}`],
      sessionId: options.sessionId,
      images: options.images || []
    };

    this.emit('task_start', {
      taskId,
      prompt: options.prompt,
      project: workingDir,
      model: '⚡ Direct CLI',
      sessionId: options.sessionId,
      images: options.images || []
    });

    this.emit('agent_step', {
      taskId,
      step: `⚡ Eksekusi Perintah Terminal: \`${command}\``,
      tool: 'run_command',
      toolArgs: { command }
    });

    return new Promise<AgentTask>((resolve) => {
      let outputBuffer = '';
      const proc = spawnDirectCommand(command, workingDir);
      this.currentProcess = proc;

      const appendData = (chunk: string) => {
        outputBuffer += chunk;
        this.emit('agent_delta', {
          taskId,
          delta: chunk,
          accumulated: outputBuffer
        });
      };

      proc.stdout?.on('data', (d) => appendData(d.toString()));
      proc.stderr?.on('data', (d) => appendData(d.toString()));

      proc.on('close', (code) => {
        this.currentProcess = null;
        if (!this.activeTask) return;

        const duration = ((Date.now() - this.activeTask.startTime) / 1000).toFixed(2);
        this.activeTask.duration = `${duration}s`;
        this.activeTask.status = code === 0 ? 'completed' : 'failed';
        this.activeTask.exitCode = code;

        const cleanOutput = outputBuffer.trim() || '(Tidak ada output terminal)';
        const statusEmoji = code === 0 ? '✅' : '⚠️';
        const statusTitle = code === 0 ? 'Perintah berhasil dieksekusi' : `Perintah selesai dengan kode keluar ${code}`;

        this.activeTask.response = `${statusEmoji} **${statusTitle}** dalam \`${duration}s\`:\n\n\`\`\`bash\n$ ${command}\n${cleanOutput}\n\`\`\``;

        this.emit('agent_result', {
          taskId,
          response: this.activeTask.response,
          duration: `${duration}s`,
          status: this.activeTask.status
        });

        const finishedTask = { ...this.activeTask };
        this.history.unshift(finishedTask);
        if (this.history.length > 50) this.history.pop();

        this.emit('task_end', {
          id: finishedTask.id,
          taskId: finishedTask.id,
          prompt: finishedTask.prompt,
          project: finishedTask.project,
          model: finishedTask.model,
          status: finishedTask.status,
          response: finishedTask.response,
          duration: finishedTask.duration,
          conversationId: finishedTask.conversationId,
          toolsExecuted: finishedTask.toolsExecuted,
          steps: [{
            title: `Terminal: ${command}`,
            content: cleanOutput,
            duration: `${duration}s`
          }],
          thought: `Mengeksekusi perintah terminal langsung tanpa loop AI untuk efisiensi maksimum.`,
          sessionId: finishedTask.sessionId,
          images: finishedTask.images || []
        });

        this.activeTask = null;
        resolve(finishedTask);
      });

      proc.on('error', (err) => {
        this.currentProcess = null;
        if (this.activeTask) {
          this.activeTask.status = 'error';
          this.activeTask.response = `❌ **Gagal menjalankan perintah**: ${err.message}`;
          this.activeTask.error = err.message;
        }
        this.emit('task_error', { taskId, error: err.message });
        const finishedTask = this.activeTask ? { ...this.activeTask } : null;
        this.activeTask = null;
        resolve(finishedTask as any);
      });
    });
  }

  public cancel(): boolean {
    if (this.currentProcess && this.currentProcess.pid) {
      try {
        spawn('taskkill', ['/pid', String(this.currentProcess.pid), '/f', '/t']);
        this.currentProcess = null;
      } catch (e) {
        console.error('Failed to kill agent process:', e);
      }
      if (this.activeTask) {
        this.activeTask.status = 'cancelled';
        this.emit('task_cancelled', { taskId: this.activeTask.id });
        this.activeTask = null;
      }
      return true;
    }
    return false;
  }
}
