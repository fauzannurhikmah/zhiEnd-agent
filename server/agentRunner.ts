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
      conversationId: options.conversationId || null
    };

    this.emit('task_start', {
      taskId,
      prompt: options.prompt,
      project: workingDir,
      model: selectedModel
    });

    return new Promise<AgentTask>((resolve, reject) => {
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
              this.emit('agent_raw', { taskId, text: line });
            }
          });
        }

        if (proc.stderr) {
          const rlErr = readline.createInterface({ input: proc.stderr });
          rlErr.on('line', (line) => {
            line = line.trim();
            if (line) {
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

          const finishedTask = { ...this.activeTask };
          this.history.unshift(finishedTask);
          if (this.history.length > 50) this.history.pop();

          this.emit('task_end', {
            taskId,
            status: finishedTask.status,
            response: finishedTask.response,
            duration: finishedTask.duration,
            conversationId: finishedTask.conversationId
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
          const failedTask = this.activeTask;
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

        this.emit('agent_step', {
          taskId,
          stepIndex: step.step_index,
          stepType: step.step_type,
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
