const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

function runGit(command, cwd) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        resolve({
          success: false,
          error: stderr || err.message,
          stdout: stdout || ''
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

class GitManager {
  async isGitRepo(projectPath) {
    if (!projectPath || !fs.existsSync(projectPath)) return false;
    const res = await runGit('git rev-parse --is-inside-work-tree', projectPath);
    return res.success && res.stdout.trim() === 'true';
  }

  async getStatus(projectPath) {
    const isRepo = await this.isGitRepo(projectPath);
    if (!isRepo) {
      return {
        isRepo: false,
        branch: null,
        remoteUrl: null,
        files: [],
        ahead: 0,
        behind: 0
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
    const files = [];

    for (let line of lines) {
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

        let statusText = 'modified';
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

  async getDiff(projectPath, filePath = null, staged = false) {
    let cmd = staged ? 'git diff --staged' : 'git diff';
    if (filePath) {
      cmd += ` -- "${filePath}"`;
    }
    const res = await runGit(cmd, projectPath);
    return res.stdout;
  }

  async stage(projectPath, files = ['.']) {
    const targets = Array.isArray(files) ? files.map(f => `"${f}"`).join(' ') : `"${files}"`;
    return await runGit(`git add ${targets}`, projectPath);
  }

  async unstage(projectPath, files = ['.']) {
    const targets = Array.isArray(files) ? files.map(f => `"${f}"`).join(' ') : `"${files}"`;
    return await runGit(`git restore --staged ${targets}`, projectPath);
  }

  async commit(projectPath, message) {
    if (!message || !message.trim()) {
      return { success: false, error: 'Commit message is required' };
    }
    // Escape double quotes
    const safeMsg = message.replace(/"/g, '\\"');
    return await runGit(`git commit -m "${safeMsg}"`, projectPath);
  }

  async push(projectPath, remote = 'origin', branch = null) {
    let cmd = `git push ${remote}`;
    if (branch) {
      cmd += ` ${branch}`;
    }
    return await runGit(cmd, projectPath);
  }

  async pull(projectPath, remote = 'origin', branch = null) {
    let cmd = `git pull ${remote}`;
    if (branch) {
      cmd += ` ${branch}`;
    }
    return await runGit(cmd, projectPath);
  }

  async getRecentCommits(projectPath, limit = 10) {
    const res = await runGit(`git log -n ${limit} --pretty=format:"%h|%an|%ar|%s"`, projectPath);
    if (!res.success || !res.stdout.trim()) return [];

    return res.stdout.split('\n').filter(Boolean).map(line => {
      const [hash, author, date, message] = line.split('|');
      return { hash, author, date, message };
    });
  }

  async initRepo(projectPath) {
    return await runGit('git init', projectPath);
  }
}

module.exports = new GitManager();
