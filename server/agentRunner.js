const { spawn } = require('child_process');
const readline = require('readline');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');

class AgentRunner extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.currentProcess = null;
    this.activeTask = null;
    this.history = []; // stored turns: { id, timestamp, prompt, project, model, response, status, duration }
  }

  updateConfig(config) {
    this.config = config;
  }

  isBusy() {
    return this.currentProcess !== null;
  }

  async run({ prompt, cwd, model, conversationId, continueLast = false }) {
    if (this.isBusy()) {
      throw new Error('Agent is already running a task. Please wait or cancel the current task.');
    }

    const workingDir = cwd || this.config.activeProject || process.cwd();
    const cliPath = this.config.antigravity?.cliPath || 'agy.exe';
    const selectedModel = model || this.config.antigravity?.defaultModel || 'gemini-3.8-flash-high';

    const args = [
      '-p', prompt,
      '--output-format', 'stream-json',
      '--dangerously-skip-permissions',
      '--model', selectedModel
    ];

    if (conversationId) {
      args.push('--conversation', conversationId);
    } else if (continueLast) {
      args.push('-c');
    }

    const taskId = 'task_' + Date.now();
    this.activeTask = {
      id: taskId,
      prompt,
      project: workingDir,
      model: selectedModel,
      startTime: Date.now(),
      status: 'running',
      response: '',
      conversationId: conversationId || null,
      steps: []
    };

    this.emit('task_start', {
      taskId,
      prompt,
      project: workingDir,
      model: selectedModel
    });

    return new Promise((resolve, reject) => {
      try {
        const proc = spawn(cliPath, args, {
          cwd: workingDir,
          env: { ...process.env },
          shell: true
        });

        this.currentProcess = proc;

        const rlOut = readline.createInterface({ input: proc.stdout });
        const rlErr = readline.createInterface({ input: proc.stderr });

        rlOut.on('line', (line) => {
          line = line.trim();
          if (!line) return;

          try {
            const data = JSON.parse(line);
            this.handleStreamEvent(data);
          } catch (e) {
            // Raw text output fallback
            this.emit('agent_raw', { taskId, text: line });
          }
        });

        rlErr.on('line', (line) => {
          line = line.trim();
          if (line) {
            this.emit('agent_stderr', { taskId, text: line });
          }
        });

        proc.on('close', (code) => {
          this.currentProcess = null;
          const duration = ((Date.now() - this.activeTask.startTime) / 1000).toFixed(1);
          this.activeTask.duration = `${duration}s`;
          this.activeTask.status = code === 0 ? 'completed' : 'failed';
          this.activeTask.exitCode = code;

          this.history.unshift({ ...this.activeTask });
          // keep last 50 history
          if (this.history.length > 50) this.history.pop();

          this.emit('task_end', {
            taskId,
            status: this.activeTask.status,
            response: this.activeTask.response,
            duration: this.activeTask.duration,
            conversationId: this.activeTask.conversationId
          });

          const completedTask = { ...this.activeTask };
          this.activeTask = null;

          if (code === 0) {
            resolve(completedTask);
          } else {
            resolve(completedTask); // Still resolve with task data even if error exit
          }
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

  handleStreamEvent(data) {
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

        // Collect text delta
        if (step.text_delta) {
          this.activeTask.response += step.text_delta;
          this.emit('agent_delta', {
            taskId,
            delta: step.text_delta,
            accumulated: this.activeTask.response
          });
        }

        // Tool calls or state changes
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

  cancel() {
    if (this.currentProcess) {
      try {
        // Windows kill process tree
        spawn('taskkill', ['/pid', this.currentProcess.pid, '/f', '/t']);
        this.currentProcess = null;
      } catch (e) {
        console.error('Failed to kill process:', e);
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

module.exports = AgentRunner;
