import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { GitStatus, GitFile, CommitInfo } from './types';

export interface CommandOutput {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}

function runGit(command: string, cwd: string): Promise<CommandOutput> {
  return new Promise((resolve) => {
    exec(command, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        resolve({
          success: false,
          error: stderr || err.message,
          stdout: stdout || '',
          stderr: stderr || ''
        });
      } else {
        resolve({
          success: true,
          stdout: stdout || '',
          stderr: stderr || ''
        });
      }
    });
  });
}

export class GitManager {
  public async isGitRepo(projectPath: string): Promise<boolean> {
    if (!projectPath || !fs.existsSync(projectPath)) return false;
    const res = await runGit('git rev-parse --is-inside-work-tree', projectPath);
    return res.success && res.stdout.trim() === 'true';
  }

  public async getStatus(projectPath: string): Promise<GitStatus> {
    const isRepo = await this.isGitRepo(projectPath);
    if (!isRepo) {
      return {
        isRepo: false,
        branch: null,
        remoteUrl: null,
        files: [],
        ahead: 0,
        behind: 0,
        clean: true
      };
    }

    // Branch
    const branchRes = await runGit('git branch --show-current', projectPath);
    const branch = branchRes.stdout.trim() || 'HEAD';

    // Remote URL
    const remoteRes = await runGit('git remote get-url origin', projectPath);
    const remoteUrl = remoteRes.success ? remoteRes.stdout.trim() : null;

    // Status porcelain
    const statusRes = await runGit('git status --porcelain -b', projectPath);
    const lines = statusRes.stdout.split('\n');

    let ahead = 0;
    let behind = 0;
    const files: GitFile[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      if (!line) continue;
      if (line.startsWith('##')) {
        const aheadMatch = line.match(/ahead (\d+)/);
        const behindMatch = line.match(/behind (\d+)/);
        if (aheadMatch) ahead = parseInt(aheadMatch[1], 10);
        if (behindMatch) behind = parseInt(behindMatch[1], 10);
      } else {
        const indexStatus = line[0];
        const workTreeStatus = line[1];
        const filePath = line.substring(3).trim();

        let statusText: GitFile['status'] = 'modified';
        if (indexStatus === '?' && workTreeStatus === '?') statusText = 'untracked';
        else if (indexStatus === 'A' || workTreeStatus === 'A') statusText = 'added';
        else if (indexStatus === 'D' || workTreeStatus === 'D') statusText = 'deleted';
        else if (indexStatus === 'R' || workTreeStatus === 'R') statusText = 'renamed';

        files.push({
          path: filePath,
          status: statusText,
          staged: indexStatus !== ' ' && indexStatus !== '?'
        });
      }
    }

    return {
      isRepo: true,
      branch,
      remoteUrl,
      ahead,
      behind,
      files,
      clean: files.length === 0
    };
  }

  public async getDiff(projectPath: string, filePath?: string | null, staged: boolean = false): Promise<string> {
    if (!projectPath || !filePath) return 'Pilih file untuk melihat diff.';

    const ext = filePath.split('.').pop()?.toLowerCase();
    const binaryExts = ['db', 'db-shm', 'db-wal', 'png', 'jpg', 'jpeg', 'gif', 'ico', 'webp', 'pdf', 'zip', 'tar', 'gz', 'exe', 'bin'];
    if (ext && binaryExts.includes(ext)) {
      return `[Berkas Biner]\nBerkas "${filePath}" merupakan berkas biner.\nPerbandingan diff baris teks tidak dapat ditampilkan.`;
    }

    let cmd = staged ? 'git diff --staged' : 'git diff';
    cmd += ` -- "${filePath}"`;
    const res = await runGit(cmd, projectPath);

    if (res.stdout && res.stdout.trim()) {
      return res.stdout;
    }

    // Jika untracked dan belum ada diff, coba tampilkan isi file jika teks
    try {
      const fullPath = path.join(projectPath, filePath);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        const stats = fs.statSync(fullPath);
        if (stats.size > 200 * 1024) {
          return `[Berkas Baru]\nUkuran berkas terlalu besar untuk ditampilkan (${(stats.size / 1024).toFixed(1)} KB).`;
        }
        const content = fs.readFileSync(fullPath, 'utf-8');
        return `[Berkas Baru (Untracked)]\n` + content.split('\n').map(l => `+ ${l}`).join('\n');
      }
    } catch {}

    return 'Tidak ada perubahan teks pada berkas yang dipilih.';
  }

  public async stage(projectPath: string, files: string[] = ['.']): Promise<CommandOutput> {
    const targets = files.map(f => `"${f}"`).join(' ');
    return await runGit(`git add ${targets}`, projectPath);
  }

  public async unstage(projectPath: string, files: string[] = ['.']): Promise<CommandOutput> {
    const targets = files.map(f => `"${f}"`).join(' ');
    return await runGit(`git restore --staged ${targets}`, projectPath);
  }

  public async commit(projectPath: string, message: string): Promise<CommandOutput> {
    if (!message || !message.trim()) {
      return { success: false, stdout: '', stderr: 'Commit message is required', error: 'Commit message is required' };
    }
    const safeMsg = message.replace(/"/g, '\\"');
    return await runGit(`git commit -m "${safeMsg}"`, projectPath);
  }

  public async push(projectPath: string, remote: string = 'origin', branch?: string | null): Promise<CommandOutput> {
    let cmd = `git push ${remote}`;
    if (branch) {
      cmd += ` ${branch}`;
    }
    return await runGit(cmd, projectPath);
  }

  public async pull(projectPath: string, remote: string = 'origin', branch?: string | null): Promise<CommandOutput> {
    let cmd = `git pull ${remote}`;
    if (branch) {
      cmd += ` ${branch}`;
    }
    return await runGit(cmd, projectPath);
  }

  public async getRecentCommits(projectPath: string, limit: number = 10): Promise<CommitInfo[]> {
    const res = await runGit(`git log -n ${limit} --pretty=format:"%h|%an|%ar|%s"`, projectPath);
    if (!res.success || !res.stdout.trim()) return [];

    return res.stdout.split('\n').filter(Boolean).map(line => {
      const [hash, author, date, message] = line.split('|');
      return { hash, author, date, message: message || '' };
    });
  }

  public async initRepo(projectPath: string): Promise<CommandOutput> {
    return await runGit('git init', projectPath);
  }
}

export const gitManager = new GitManager();
