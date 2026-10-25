// Git and GitHub manager module

class GitUI {
  constructor() {
    this.currentBranchEl = document.getElementById('gitCurrentBranch');
    this.remoteUrlEl = document.getElementById('gitRemoteUrl');
    this.syncStatusEl = document.getElementById('gitSyncStatus');
    this.filesCountEl = document.getElementById('gitFilesCount');
    this.filesListEl = document.getElementById('gitFilesList');
    this.diffFileNameEl = document.getElementById('diffFileName');
    this.diffContentEl = document.getElementById('diffContent');
    this.commitMsgInput = document.getElementById('commitMessageInput');
    this.commitBtn = document.getElementById('commitBtn');
    this.aiCommitBtn = document.getElementById('generateAiCommitBtn');
    this.stageAllBtn = document.getElementById('stageAllBtn');
    this.unstageAllBtn = document.getElementById('unstageAllBtn');
    this.refreshBtn = document.getElementById('gitRefreshBtn');
    this.pullBtn = document.getElementById('gitPullBtn');
    this.pushBigBtn = document.getElementById('gitPushBigBtn');
    this.quickPushBtn = document.getElementById('quickPushBtn');
    this.recentCommitsList = document.getElementById('recentCommitsList');

    // Push Modal Elements
    this.pushModal = document.getElementById('pushModal');
    this.closePushModalBtn = document.getElementById('closePushModalBtn');
    this.pushDoneBtn = document.getElementById('pushDoneBtn');
    this.pushStatusIndicator = document.getElementById('pushStatusIndicator');
    this.pushOutputLogs = document.getElementById('pushOutputLogs');

    this.activeSelectedFile = null;

    this.init();
  }

  init() {
    this.refreshBtn?.addEventListener('click', () => this.loadStatus());
    this.stageAllBtn?.addEventListener('click', () => this.stageFiles(['.']));
    this.unstageAllBtn?.addEventListener('click', () => this.unstageFiles(['.']));
    this.commitBtn?.addEventListener('click', () => this.doCommit());
    this.aiCommitBtn?.addEventListener('click', () => this.generateAiCommit());
    this.pullBtn?.addEventListener('click', () => this.doPull());
    this.pushBigBtn?.addEventListener('click', () => this.openPushModalAndExecute());
    this.quickPushBtn?.addEventListener('click', () => this.openPushModalAndExecute());

    this.closePushModalBtn?.addEventListener('click', () => this.pushModal.classList.add('hidden'));
    this.pushDoneBtn?.addEventListener('click', () => this.pushModal.classList.add('hidden'));
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-security-pin': window.localStorage.getItem('zhiend_pin') || ''
    };
  }

  async loadStatus() {
    try {
      const res = await fetch('/api/git/status', { headers: this.getHeaders() });
      const data = await res.json();

      if (!data.isRepo) {
        this.currentBranchEl.textContent = 'Bukan Git Repo';
        this.remoteUrlEl.textContent = '-';
        this.syncStatusEl.innerHTML = '<span class="badge badge-neutral">No repo</span>';
        this.filesCountEl.textContent = '0';
        this.filesListEl.innerHTML = `
          <div class="empty-state">
            <i class="fa-solid fa-triangle-exclamation text-amber"></i>
            <p>Folder ini belum memiliki repositori git.</p>
          </div>
        `;
        document.getElementById('headerBranchName').textContent = 'no git';
        document.getElementById('gitChangesCount').style.display = 'none';
        return;
      }

      // Branch & Remote
      this.currentBranchEl.textContent = data.branch || 'main';
      document.getElementById('headerBranchName').textContent = data.branch || 'main';

      if (data.remoteUrl) {
        this.remoteUrlEl.innerHTML = `<a href="${data.remoteUrl}" target="_blank" class="text-sky"><i class="fa-brands fa-github"></i> ${data.remoteUrl}</a>`;
      } else {
        this.remoteUrlEl.textContent = 'No remote configured';
      }

      this.syncStatusEl.innerHTML = `
        <span class="badge ${data.ahead > 0 ? 'badge-amber' : 'badge-neutral'}">${data.ahead} ahead</span>
        <span class="badge ${data.behind > 0 ? 'badge-rose' : 'badge-neutral'}">${data.behind} behind</span>
      `;

      // Badge count in nav
      const countBadge = document.getElementById('gitChangesCount');
      if (data.files.length > 0) {
        countBadge.textContent = data.files.length;
        countBadge.style.display = 'inline-block';
      } else {
        countBadge.style.display = 'none';
      }

      this.filesCountEl.textContent = data.files.length;

      // Render Files
      if (data.files.length === 0) {
        this.filesListEl.innerHTML = `
          <div class="empty-state">
            <i class="fa-solid fa-circle-check text-success"></i>
            <p>Working tree bersih! Tidak ada perubahan.</p>
          </div>
        `;
        this.diffFileNameEl.textContent = 'No active diff';
        this.diffContentEl.innerHTML = `<pre><code class="language-diff">Tidak ada file yang berubah.</code></pre>`;
      } else {
        this.renderFilesList(data.files);
        // Load diff of first file if none selected
        if (!this.activeSelectedFile && data.files.length > 0) {
          this.loadFileDiff(data.files[0].path, data.files[0].staged);
        }
      }

      this.loadCommits();
    } catch (err) {
      console.error('Failed to load git status:', err);
    }
  }

  renderFilesList(files) {
    this.filesListEl.innerHTML = '';
    files.forEach(file => {
      const row = document.createElement('div');
      row.className = `git-file-row ${this.activeSelectedFile === file.path ? 'active' : ''}`;

      const iconClass = file.status === 'untracked' 
        ? 'fa-solid fa-question text-amber' 
        : (file.status === 'added' ? 'fa-solid fa-plus text-emerald' : (file.status === 'deleted' ? 'fa-solid fa-trash text-rose' : 'fa-solid fa-pen text-sky'));

      row.innerHTML = `
        <div class="file-info" title="${file.path}">
          <input type="checkbox" class="file-stage-cb" ${file.staged ? 'checked' : ''}>
          <i class="${iconClass}"></i>
          <span class="file-name">${file.path}</span>
        </div>
        <span class="badge ${file.staged ? 'badge-emerald' : 'badge-neutral'}">${file.staged ? 'Staged' : 'Unstaged'}</span>
      `;

      // Checkbox stage toggle
      const cb = row.querySelector('.file-stage-cb');
      cb.addEventListener('click', (e) => {
        e.stopPropagation();
        if (cb.checked) {
          this.stageFiles([file.path]);
        } else {
          this.unstageFiles([file.path]);
        }
      });

      // Click to view diff
      row.addEventListener('click', () => {
        document.querySelectorAll('.git-file-row').forEach(r => r.classList.remove('active'));
        row.classList.add('active');
        this.activeSelectedFile = file.path;
        this.loadFileDiff(file.path, file.staged);
      });

      this.filesListEl.appendChild(row);
    });
  }

  async loadFileDiff(filePath, staged = false) {
    this.diffFileNameEl.textContent = filePath;
    this.diffContentEl.innerHTML = `<pre><code class="language-diff">Memuat diff...</code></pre>`;

    try {
      const res = await fetch(`/api/git/diff?file=${encodeURIComponent(filePath)}&staged=${staged}`, { headers: this.getHeaders() });
      const data = await res.json();

      if (data.diff && data.diff.trim()) {
        this.diffContentEl.innerHTML = `<pre><code class="language-diff">${this.escapeHtml(data.diff)}</code></pre>`;
        hljs.highlightElement(this.diffContentEl.querySelector('code'));
      } else {
        this.diffContentEl.innerHTML = `<pre><code class="language-diff">Tidak ada diff text untuk file ini (mungkin binary atau untracked).</code></pre>`;
      }
    } catch (err) {
      this.diffContentEl.innerHTML = `<pre><code class="language-diff">Gagal memuat diff: ${err.message}</code></pre>`;
    }
  }

  async stageFiles(files) {
    try {
      await fetch('/api/git/stage', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ files })
      });
      this.loadStatus();
    } catch (err) {
      console.error(err);
    }
  }

  async unstageFiles(files) {
    try {
      await fetch('/api/git/unstage', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ files })
      });
      this.loadStatus();
    } catch (err) {
      console.error(err);
    }
  }

  async generateAiCommit() {
    this.aiCommitBtn.disabled = true;
    this.aiCommitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Merumuskan...`;

    try {
      const res = await fetch('/api/git/ai-commit-msg', {
        method: 'POST',
        headers: this.getHeaders()
      });
      const data = await res.json();
      if (data.message) {
        this.commitMsgInput.value = data.message;
      }
    } catch (err) {
      console.error(err);
    } finally {
      this.aiCommitBtn.disabled = false;
      this.aiCommitBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> AI Generate Message`;
    }
  }

  async doCommit() {
    const msg = this.commitMsgInput.value.trim();
    if (!msg) {
      alert('Harap masukkan pesan commit.');
      return;
    }

    this.commitBtn.disabled = true;
    this.commitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Committing...`;

    try {
      // Auto stage all if nothing staged
      const res = await fetch('/api/git/commit', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();

      if (data.success) {
        this.commitMsgInput.value = '';
        this.loadStatus();
      } else {
        alert('Commit gagal: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Commit error: ' + err.message);
    } finally {
      this.commitBtn.disabled = false;
      this.commitBtn.innerHTML = `<i class="fa-solid fa-check"></i> Commit Changes`;
    }
  }

  async openPushModalAndExecute() {
    this.pushModal.classList.remove('hidden');
    this.pushStatusIndicator.innerHTML = `
      <i class="fa-solid fa-circle-notch fa-spin text-emerald icon-lg"></i>
      <span>Sedang melakukan git push ke remote GitHub...</span>
    `;
    this.pushOutputLogs.textContent = 'Menjalankan: git push origin...\n';

    try {
      const res = await fetch('/api/git/push', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({})
      });
      const data = await res.json();

      this.pushOutputLogs.textContent += (data.stdout || '') + '\n' + (data.stderr || '') + '\n' + (data.error || '');

      if (data.success) {
        this.pushStatusIndicator.innerHTML = `
          <i class="fa-solid fa-circle-check text-success icon-lg"></i>
          <span class="text-success font-bold">Push ke GitHub Berhasil!</span>
        `;
        // Trigger celebration confetti
        if (typeof confetti === 'function') {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
        this.loadStatus();
      } else {
        this.pushStatusIndicator.innerHTML = `
          <i class="fa-solid fa-circle-xmark text-rose icon-lg"></i>
          <span class="text-rose font-bold">Git Push Gagal. Periksa credential atau branch.</span>
        `;
      }
    } catch (err) {
      this.pushStatusIndicator.innerHTML = `
        <i class="fa-solid fa-circle-xmark text-rose icon-lg"></i>
        <span class="text-rose font-bold">Gagal menghubungkan: ${err.message}</span>
      `;
    }
  }

  async doPull() {
    this.pullBtn.disabled = true;
    this.pullBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Pulling...`;

    try {
      const res = await fetch('/api/git/pull', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({})
      });
      const data = await res.json();
      alert(data.success ? 'Git Pull Sukses:\n' + (data.stdout || 'Up to date') : 'Git Pull Gagal:\n' + (data.error || data.stderr));
      this.loadStatus();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      this.pullBtn.disabled = false;
      this.pullBtn.innerHTML = `<i class="fa-solid fa-arrow-down"></i> Pull`;
    }
  }

  async loadCommits() {
    try {
      const res = await fetch('/api/git/commits', { headers: this.getHeaders() });
      const data = await res.json();

      if (!data.commits || data.commits.length === 0) {
        this.recentCommitsList.innerHTML = '<span class="text-muted text-sm">Belum ada commit.</span>';
        return;
      }

      this.recentCommitsList.innerHTML = data.commits.map(c => `
        <div class="commit-row">
          <span class="commit-hash">${c.hash}</span>
          <span class="commit-msg">${this.escapeHtml(c.message)}</span>
          <span class="commit-date">${c.date}</span>
        </div>
      `).join('');
    } catch (err) {
      console.error(err);
    }
  }

  escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }
}

window.gitUI = new GitUI();
