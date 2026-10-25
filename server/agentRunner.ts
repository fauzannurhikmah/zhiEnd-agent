import { spawn, ChildProcess } from 'child_process';
import readline from 'readline';
import { EventEmitter } from 'events';
import { AppConfig, AgentTask } from './types';

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

    const args: string[] = [
      '-p', options.prompt,
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
          shell: true
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

        // Handle tool executions (run_command, read_file, write_to_file, etc.)
        let toolDesc: string | undefined;
        if (step.step_type === 'tool') {
          const toolName = step.tool_name || step.tool_info?.name || 'tool';
          const params = step.tool_info?.parameters || {};
          
          if (toolName === 'run_command' && params.CommandLine) {
            toolDesc = `run: ${params.CommandLine}`;
          } else if ((toolName === 'read_file' || toolName === 'view_file') && (params.Path || params.AbsolutePath)) {
            const rawPath = params.Path || params.AbsolutePath || '';
            const fname = rawPath.replace(/\\/g, '/').split('/').pop() || rawPath;
            toolDesc = `read: ${fname}`;
          } else if ((toolName === 'write_to_file' || toolName === 'replace_file_content') && (params.TargetFile || params.Path)) {
            const rawPath = params.TargetFile || params.Path || '';
            const fname = rawPath.replace(/\\/g, '/').split('/').pop() || rawPath;
            toolDesc = `edit: ${fname}`;
          } else if (toolName === 'list_dir' && params.DirectoryPath) {
            const dir = params.DirectoryPath.replace(/\\/g, '/').split('/').pop() || params.DirectoryPath;
            toolDesc = `ls: ${dir}`;
          } else if (toolName === 'grep_search' && params.Query) {
            toolDesc = `grep: ${params.Query}`;
          } else {
            toolDesc = toolName;
          }

          if (toolDesc && !this.activeTask.toolsExecuted?.includes(toolDesc)) {
            this.activeTask.toolsExecuted = this.activeTask.toolsExecuted || [];
            this.activeTask.toolsExecuted.push(toolDesc);
          }
        }

        this.emit('agent_step', {
          taskId,
          stepIndex: step.step_index,
          stepType: step.step_type,
          toolName: step.tool_name || step.tool_info?.name,
          toolDesc,
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
