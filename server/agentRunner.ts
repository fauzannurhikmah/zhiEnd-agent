import { spawn, ChildProcess } from 'child_process';
import readline from 'readline';
import path from 'path';
import os from 'os';
import { EventEmitter } from 'events';
import { AppConfig, AgentTask } from './types';

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
}

export class AgentRunner extends EventEmitter {
  private config: AppConfig;
  public currentProcess: ChildProcess | null = null;
  public activeTask: AgentTask | null = null;
  public history: AgentTask[] = [];

  constructor(config: AppConfig) {
    super();
    this.config = config;
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
    const cliPath = this.config.antigravity?.cliPath || 'agy.exe';
    const selectedModel = options.model || this.config.antigravity?.defaultModel || 'gemini-3.8-flash-high';

    const localIp = getLocalIP();
    const port = this.config.port || 3888;
    const publicTunnelUrl = this.config.tunnel?.publicUrl || '';

    const promptWithContext = `[Konteks Workspace: "${workingDir}"]
[Panduan Operasional Sistem]:
1. Root direktori default untuk semua project adalah D:\\Works. Jika diminta membuat project baru atau menyimpan file baru tanpa path absolut, SELALU buat dan simpan langsung di dalam D:\\Works (contoh: D:\\Works\\<nama-project>).
2. PENTING - Menjalankan Project & URL Akses (Local maupun External/LAN):
   - Jika project adalah Pure Web Statis (HTML/CSS/JS tanpa package.json):
     Projek OTOMATIS langsung dapat diakses melalui Gateway zhiEnd Agent tanpa perlu instalasi server tambahan:
     • Local URL: [http://localhost:${port}/preview/](http://localhost:${port}/preview/)
     • Network LAN (bisa dibuka dari HP/perangkat lain di WiFi): [http://${localIp}:${port}/preview/](http://${localIp}:${port}/preview/)
     ${publicTunnelUrl ? `• External Public (Internet): [${publicTunnelUrl}/preview/](${publicTunnelUrl}/preview/)` : ''}
     (Jika pengguna ingin dedicated server di port 3000, jalankan perintah detached:
     Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '${workingDir}'; npx -y serve -p 3000" -WindowStyle Minimized).
   - Jika project adalah Node.js / Framework (Next.js, Vite, dsb yang memiliki package.json):
     Jalankan detached 1 kali cepat:
     Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '${workingDir}'; pnpm dev" -WindowStyle Minimized (atau npm run dev).
     Tautan URL:
     • Local: [http://localhost:3000](http://localhost:3000)
     • Network LAN: [http://${localIp}:3000](http://${localIp}:3000)
     ${publicTunnelUrl ? `• External Public: [${publicTunnelUrl}](${publicTunnelUrl})` : ''}
   ATURAN MUTLAK:
   - DILARANG KERAS mematikan atau menghentikan port 5173 (zhiEnd Agent frontend) dan port ${port} (zhiEnd Agent backend)! Keduanya adalah sistem utama zhiEnd Agent yang TIDAK BOLEH dimatikan.
   - JANGAN melakukan looping pengecekan, sleep berulang, atau mencoba command alternatif berkali-kali!
   - Berikan selalu URL yang jelas (Local dan Network LAN/External) agar pengguna bisa langsung mengkliknya di browser!

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
      toolsExecuted: []
    };

    this.emit('task_start', {
      taskId,
      prompt: options.prompt,
      project: workingDir,
      model: selectedModel
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

          const finishedTask = { ...this.activeTask };
          this.history.unshift(finishedTask);
          if (this.history.length > 50) this.history.pop();

          this.emit('task_end', {
            taskId,
            status: finishedTask.status,
            response: finishedTask.response,
            duration: finishedTask.duration,
            conversationId: finishedTask.conversationId,
            toolsExecuted: finishedTask.toolsExecuted
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
          
          if (toolName === 'run_command') {
            const cmd = params.CommandLine || '';
            toolDesc = `run: ${cmd}`;
            processStep = {
              id: 'step_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
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
              id: 'step_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
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
              id: 'step_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
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
              id: 'step_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
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
              id: 'step_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
              type: 'list',
              title: `Memeriksa direktori ${dir}`,
              detail: `Daftar file di folder ${params.DirectoryPath || dir}`,
              timestamp: Date.now()
            };
          } else if (toolName === 'grep_search') {
            toolDesc = `grep: ${params.Query}`;
            processStep = {
              id: 'step_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
              type: 'search',
              title: `Mencari '${params.Query}'`,
              detail: `Pencarian kode di workspace`,
              timestamp: Date.now()
            };
          } else {
            toolDesc = toolName;
            processStep = {
              id: 'step_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
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
            this.activeTask.steps.push(processStep);
          }
        } else if (step.step_type === 'thought' || step.thought || step.reasoning) {
          const thoughtText = step.thought || step.reasoning || step.text_delta || '';
          if (thoughtText && thoughtText.trim()) {
            this.activeTask.thought = (this.activeTask.thought || '') + thoughtText;
            processStep = {
              id: 'thought_' + Date.now(),
              type: 'thought',
              title: 'Reasoning & Analisis',
              thought: thoughtText,
              detail: thoughtText,
              timestamp: Date.now()
            };
            this.activeTask.steps = this.activeTask.steps || [];
            this.activeTask.steps.push(processStep);
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
