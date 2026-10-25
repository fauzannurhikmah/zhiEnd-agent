<script lang="ts">
  import type { GitStatus, CommitInfo } from '../types';
  import { GitBranch, GitCommit, UploadCloud, Download, RotateCw, Sparkles, Check, FileCode, CheckSquare, Square, ExternalLink } from 'lucide-svelte';

  let {
    gitStatus,
    commits,
    onRefresh,
    onStageFiles,
    onUnstageFiles,
    onCommit,
    onPush,
    onPull,
    onGenerateAiCommit,
    onLoadDiff
  }: {
    gitStatus: GitStatus | null;
    commits: CommitInfo[];
    onRefresh: () => void;
    onStageFiles: (files: string[]) => void;
    onUnstageFiles: (files: string[]) => void;
    onCommit: (message: string) => Promise<boolean>;
    onPush: () => void;
    onPull: () => void;
    onGenerateAiCommit: () => Promise<string>;
    onLoadDiff: (file: string, staged: boolean) => Promise<string>;
  } = $props();

  let selectedFile = $state<string | null>(null);
  let activeDiff = $state<string>('');
  let commitMessage = $state('');
  let isGeneratingAiMsg = $state(false);
  let isCommitting = $state(false);

  // Auto select first file diff
  $effect(() => {
    if (gitStatus?.files && gitStatus.files.length > 0 && !selectedFile) {
      handleSelectFile(gitStatus.files[0].path, gitStatus.files[0].staged);
    }
  });

  async function handleSelectFile(path: string, staged: boolean) {
    selectedFile = path;
    activeDiff = 'Memuat diff...';
    try {
      activeDiff = await onLoadDiff(path, staged);
    } catch {
      activeDiff = 'Gagal memuat diff.';
    }
  }

  async function handleAiCommit() {
    isGeneratingAiMsg = true;
    try {
      const msg = await onGenerateAiCommit();
      if (msg) commitMessage = msg;
    } finally {
      isGeneratingAiMsg = false;
    }
  }

  async function handleCommit() {
    if (!commitMessage.trim()) {
      alert('Pesan commit harus diisi.');
      return;
    }
    isCommitting = true;
    try {
      const ok = await onCommit(commitMessage.trim());
      if (ok) commitMessage = '';
    } finally {
      isCommitting = false;
    }
  }
</script>

<div class="flex flex-col h-full gap-3 overflow-hidden">
  <!-- Top Stats Bar -->
  <div class="glass-panel p-3.5 rounded-xl flex items-center justify-between gap-4 border border-slate-800/80 shadow-md">
    <div class="flex items-center gap-6 text-xs">
      <div>
        <span class="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">Current Branch</span>
        <span class="font-mono font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
          <GitBranch class="w-3.5 h-3.5" /> {gitStatus?.branch || 'None'}
        </span>
      </div>

      <div class="border-l border-slate-800 pl-6">
        <span class="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">Remote GitHub</span>
        {#if gitStatus?.remoteUrl}
          <a href={gitStatus.remoteUrl} target="_blank" class="font-mono text-sky-400 hover:underline flex items-center gap-1 mt-0.5">
            {gitStatus.remoteUrl} <ExternalLink class="w-2.5 h-2.5" />
          </a>
        {:else}
          <span class="text-slate-500 font-mono mt-0.5 block">No remote configured</span>
        {/if}
      </div>

      <div class="border-l border-slate-800 pl-6">
        <span class="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">Sync Status</span>
        <div class="flex items-center gap-1.5 mt-0.5">
          <span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold {gitStatus?.ahead ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'}">
            {gitStatus?.ahead || 0} ahead
          </span>
          <span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold {gitStatus?.behind ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-400'}">
            {gitStatus?.behind || 0} behind
          </span>
        </div>
      </div>
    </div>

    <!-- Quick action buttons -->
    <div class="flex items-center gap-2">
      <button
        onclick={onPull}
        class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        title="Git Pull"
      >
        <Download class="w-3.5 h-3.5" /> Pull
      </button>

      <button
        onclick={onRefresh}
        class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition cursor-pointer"
        title="Refresh status"
      >
        <RotateCw class="w-3.5 h-3.5" />
      </button>

      <button
        onclick={onPush}
        class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer active:scale-95"
      >
        <UploadCloud class="w-3.5 h-3.5" /> Push to GitHub
      </button>
    </div>
  </div>

  <!-- Main Split: Changes List & Diff Viewer -->
  <div class="flex-1 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-3 min-h-0">
    <!-- Left: Files & Commit Box -->
    <div class="glass-panel p-3.5 rounded-xl flex flex-col gap-3 overflow-hidden border border-slate-800/80 shadow-md">
      <div class="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <span class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
          <FileCode class="w-4 h-4 text-indigo-400" />
          Perubahan File ({gitStatus?.files?.length || 0})
        </span>

        <div class="flex items-center gap-2 text-[11px]">
          <button onclick={() => onStageFiles(['.'])} class="text-indigo-400 hover:underline cursor-pointer font-semibold">Stage All</button>
          <span class="text-slate-600">•</span>
          <button onclick={() => onUnstageFiles(['.'])} class="text-slate-400 hover:underline cursor-pointer">Unstage All</button>
        </div>
      </div>

      <!-- Files List -->
      <div class="flex-1 overflow-y-auto flex flex-col gap-1 pr-1">
        {#if !gitStatus?.files || gitStatus.files.length === 0}
          <div class="flex flex-col items-center justify-center h-full text-slate-500 text-xs py-8 gap-1">
            <Check class="w-8 h-8 text-emerald-400/80 mb-1" />
            <span class="font-medium">Working tree bersih!</span>
            <span class="text-[11px] text-slate-600">Tidak ada file yang dimodifikasi.</span>
          </div>
        {:else}
          {#each gitStatus.files as file}
            <button
              type="button"
              onclick={() => handleSelectFile(file.path, file.staged)}
              class="w-full flex items-center justify-between p-2 rounded-lg text-xs font-mono text-left transition cursor-pointer {selectedFile === file.path ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-200' : 'bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/50 text-slate-300'}"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span
                  role="checkbox"
                  tabindex="0"
                  aria-checked={file.staged}
                  onclick={(e) => {
                    e.stopPropagation();
                    if (file.staged) onUnstageFiles([file.path]);
                    else onStageFiles([file.path]);
                  }}
                  onkeydown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.stopPropagation();
                      e.preventDefault();
                      if (file.staged) onUnstageFiles([file.path]);
                      else onStageFiles([file.path]);
                    }
                  }}
                  class="cursor-pointer text-slate-400 hover:text-white"
                >
                  {#if file.staged}
                    <CheckSquare class="w-3.5 h-3.5 text-emerald-400" />
                  {:else}
                    <Square class="w-3.5 h-3.5" />
                  {/if}
                </span>
                <span class="truncate" title={file.path}>{file.path}</span>
              </div>

              <span class="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded {file.status === 'untracked' ? 'bg-amber-500/20 text-amber-300' : (file.status === 'added' ? 'bg-emerald-500/20 text-emerald-300' : (file.status === 'deleted' ? 'bg-rose-500/20 text-rose-300' : 'bg-sky-500/20 text-sky-300'))}">
                {file.status}
              </span>
            </button>
          {/each}
        {/if}
      </div>

      <!-- Commit Form Box -->
      <div class="border-t border-slate-800/80 pt-3 flex flex-col gap-2">
        <div class="flex items-center justify-between text-[11px]">
          <span class="text-slate-400 font-semibold">Pesan Commit</span>
          <button
            onclick={handleAiCommit}
            disabled={isGeneratingAiMsg || !gitStatus?.files?.length}
            class="text-violet-400 hover:text-violet-300 hover:underline flex items-center gap-1 font-semibold cursor-pointer disabled:opacity-40"
          >
            <Sparkles class="w-3 h-3" />
            {isGeneratingAiMsg ? 'Merumuskan...' : 'AI Generate Message'}
          </button>
        </div>

        <textarea
          bind:value={commitMessage}
          placeholder="Contoh: feat: update tampilan responsive navbar"
          rows="2"
          class="bg-slate-900/80 border border-slate-800 focus:border-indigo-500 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-500 outline-none resize-none transition"
        ></textarea>

        <button
          onclick={handleCommit}
          disabled={isCommitting || !commitMessage.trim()}
          class="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
        >
          <Check class="w-3.5 h-3.5" />
          {isCommitting ? 'Committing...' : 'Commit Perubahan'}
        </button>
      </div>
    </div>

    <!-- Right: Diff View -->
    <div class="glass-panel p-3.5 rounded-xl flex flex-col gap-2 overflow-hidden border border-slate-800/80 shadow-md">
      <div class="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <span class="text-xs font-mono font-semibold text-slate-300 truncate max-w-[500px]">
          {selectedFile ? selectedFile : 'Pilih file untuk melihat diff'}
        </span>
        <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          Diff Viewer
        </span>
      </div>

      <div class="flex-1 overflow-y-auto bg-slate-950/80 p-3 rounded-lg border border-slate-900 font-mono text-xs leading-relaxed text-slate-300 whitespace-pre overflow-x-auto">
        {activeDiff || 'Pilih file di panel kiri untuk melihat perubahan.'}
      </div>
    </div>
  </div>

  <!-- Bottom: Recent Commits Timeline -->
  {#if commits && commits.length > 0}
    <div class="glass-panel p-3 rounded-xl border border-slate-800/80 max-h-36 overflow-y-auto flex flex-col gap-1.5">
      <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Riwayat Commit Terakhir</span>
      {#each commits as c}
        <div class="flex items-center justify-between text-xs font-mono py-1 border-b border-slate-900 last:border-none">
          <div class="flex items-center gap-2">
            <span class="text-emerald-400 font-bold">{c.hash}</span>
            <span class="text-slate-300 truncate max-w-xl">{c.message}</span>
          </div>
          <span class="text-[10px] text-slate-500 shrink-0">{c.date}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>
