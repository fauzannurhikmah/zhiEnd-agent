<script lang="ts">
  import type { GitStatus, CommitInfo } from '../types';
  import { dialog } from '../services/dialog.svelte';
  import { 
    GitBranch, 
    UploadCloud, 
    Download, 
    RotateCw, 
    Sparkles, 
    Check, 
    CheckSquare, 
    Square, 
    ExternalLink 
  } from 'lucide-svelte';

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

  $effect(() => {
    if (gitStatus?.files && gitStatus.files.length > 0 && !selectedFile) {
      handleSelectFile(gitStatus.files[0].path, gitStatus.files[0].staged);
    }
  });

  async function handleSelectFile(path: string, staged: boolean) {
    selectedFile = path;
    const ext = path.split('.').pop()?.toLowerCase();
    const binaryExts = ['db', 'db-shm', 'db-wal', 'png', 'jpg', 'jpeg', 'gif', 'ico', 'webp', 'pdf', 'zip', 'tar', 'gz', 'exe', 'bin'];
    if (ext && binaryExts.includes(ext)) {
      activeDiff = `[Berkas Biner]\nBerkas "${path}" merupakan berkas biner.\nPerbandingan diff baris teks tidak dapat ditampilkan.`;
      return;
    }
    activeDiff = 'Memuat diff...';
    try {
      activeDiff = await onLoadDiff(path, staged);
    } catch {
      activeDiff = 'Tidak dapat memuat diff saat ini. Silakan coba beberapa saat lagi.';
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
      dialog.showWarning('Pesan commit harus diisi terlebih dahulu.');
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

<div class="h-full flex flex-col gap-3 overflow-y-auto lg:overflow-hidden p-3 sm:p-4 text-[#111315] font-tech">
  <!-- Top Bar with Industrial Hardware Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D0CEC7] pb-3">
    <div class="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-stencil">
      <div class="flex items-center gap-1.5 text-[#111315] font-bold px-2.5 py-1 rounded-none bg-[#FCFCFA] border border-[#D0CEC7]">
        <GitBranch class="w-3.5 h-3.5 text-[#FF5500]" />
        <span>BRANCH: {gitStatus?.branch || 'HEAD'}</span>
      </div>

      {#if gitStatus?.remoteUrl}
        <a href={gitStatus.remoteUrl} target="_blank" class="text-[#60646C] hover:text-[#111315] flex items-center gap-1 truncate max-w-[180px] sm:max-w-sm">
          {gitStatus.remoteUrl} <ExternalLink class="w-2.5 h-2.5" />
        </a>
      {/if}

      <div class="flex items-center gap-1.5 text-[11px]">
        <span class="px-2 py-0.5 rounded-none {gitStatus?.ahead ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold' : 'bg-[#E5E3DD] text-[#60646C]'}">
          {gitStatus?.ahead || 0} ahead
        </span>
        <span class="px-2 py-0.5 rounded-none {gitStatus?.behind ? 'bg-rose-100 text-rose-900 border border-rose-300 font-bold' : 'bg-[#E5E3DD] text-[#60646C]'}">
          {gitStatus?.behind || 0} behind
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2 self-start sm:self-auto">
      <button
        onclick={onPull}
        class="btn-hardware px-3 py-1.5 rounded-none text-xs font-bold flex items-center gap-1.5 cursor-pointer uppercase"
        title="Git Pull"
      >
        <Download class="w-3.5 h-3.5 text-[#60646C]" /> Pull
      </button>

      <button
        onclick={onRefresh}
        class="btn-hardware p-2 rounded-none text-[#60646C] hover:text-[#111315] cursor-pointer"
        title="Refresh status"
      >
        <RotateCw class="w-3.5 h-3.5" />
      </button>

      <button
        onclick={onPush}
        class="btn-safety px-4 py-1.5 rounded-none text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 uppercase tracking-wider shadow-none"
      >
        <UploadCloud class="w-3.5 h-3.5" /> Push to GitHub
      </button>
    </div>
  </div>

  <!-- Split View: Files & Diff -->
  <div class="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-3 min-h-0">
    <!-- Left: Files & Commit -->
    <div class="relative flex flex-col gap-3 min-h-0 bg-[#ECEAE5] border border-[#D0CEC7] rounded-none p-3.5 shadow-2xs">
      <span class="reg-dot reg-dot-tl"></span>
      <div class="flex items-center justify-between pb-2.5 border-b border-[#D0CEC7]">
        <span class="text-xs font-bold text-[#111315] uppercase tracking-wider">
          Changes ({gitStatus?.files?.length || 0})
        </span>

        <div class="flex items-center gap-2 text-[11px] font-stencil">
          <button onclick={() => onStageFiles(['.'])} class="text-[#FF5500] hover:underline cursor-pointer font-bold">Stage All</button>
          <span class="text-[#D0CEC7]">•</span>
          <button onclick={() => onUnstageFiles(['.'])} class="text-[#60646C] hover:underline cursor-pointer font-medium">Unstage</button>
        </div>
      </div>

      <!-- Files list -->
      <div class="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 font-stencil text-xs">
        {#if !gitStatus?.files || gitStatus.files.length === 0}
          <div class="flex flex-col items-center justify-center h-full text-[#60646C] text-xs py-8 gap-1.5 font-grotesk">
            <Check class="w-6 h-6 text-emerald-600 mb-1" />
            <span class="font-bold text-[#111315]">Working tree clean</span>
            <span class="text-[11px] text-[#8C9097]">Tidak ada file yang berubah.</span>
          </div>
        {:else}
          {#each gitStatus.files as file}
            <button
              type="button"
              onclick={() => handleSelectFile(file.path, file.staged)}
              class="w-full flex items-center justify-between p-2 rounded-none text-left transition cursor-pointer {selectedFile === file.path ? 'bg-[#FCFCFA] border border-[#D0CEC7] text-[#111315] font-bold shadow-xs' : 'text-[#60646C] hover:bg-[#E5E3DD] hover:text-[#111315]'}"
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
                  class="cursor-pointer text-[#8C9097] hover:text-[#111315]"
                >
                  {#if file.staged}
                    <CheckSquare class="w-3.5 h-3.5 text-[#FF5500]" />
                  {:else}
                    <Square class="w-3.5 h-3.5" />
                  {/if}
                </span>
                <span class="truncate text-[11px]">{file.path}</span>
              </div>

              <span class="text-[9px] uppercase px-1.5 py-0.2 rounded-none font-bold {file.status === 'untracked' ? 'bg-amber-100 text-amber-900 border border-amber-300' : (file.status === 'added' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-orange-100 text-orange-900 border border-orange-300')}">
                {file.status[0]}
              </span>
            </button>
          {/each}
        {/if}
      </div>

      <!-- Commit form -->
      <div class="border-t border-[#D0CEC7] pt-3 flex flex-col gap-2">
        <div class="flex items-center justify-between text-[11px]">
          <span class="text-[#60646C] font-bold uppercase tracking-wider">Commit message</span>
          <button
            onclick={handleAiCommit}
            disabled={isGeneratingAiMsg || !gitStatus?.files?.length}
            class="text-[#FF5500] hover:underline flex items-center gap-1 font-bold cursor-pointer disabled:opacity-40"
          >
            <Sparkles class="w-3 h-3 text-[#FF5500]" />
            {isGeneratingAiMsg ? 'Merumuskan...' : 'AI Generate'}
          </button>
        </div>

        <textarea
          bind:value={commitMessage}
          placeholder="e.g. fix: update responsive layout navbar"
          rows="2"
          class="bg-[#FCFCFA] border border-[#D0CEC7] focus:border-[#D0CEC7] rounded-none p-2 text-xs text-[#111315] placeholder-[#8C9097] outline-none resize-none transition shadow-2xs font-grotesk"
        ></textarea>

        <button
          onclick={handleCommit}
          disabled={isCommitting || !commitMessage.trim()}
          class="btn-safety w-full py-2 rounded-none disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 uppercase tracking-wider shadow-none"
        >
          {isCommitting ? 'Committing...' : 'Commit Changes'}
        </button>
      </div>
    </div>

    <!-- Right: Diff Viewer (Deep Black CRT Terminal Styling) -->
    <div class="relative flex flex-col min-h-0 bg-[#101114] border border-[#2A2B30] rounded-none p-4 overflow-hidden shadow-2xs crt-screen">
      <span class="reg-dot reg-dot-tr"></span>
      <!-- Scanline Texture Overlay -->
      <div class="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_3px]"></div>

      <div class="flex items-center justify-between pb-2.5 border-b border-[#2A2B30] text-xs font-stencil relative z-10">
        <span class="text-[#D0D4DC] font-bold truncate flex items-center gap-2">
          <span class="w-1.5 h-1.5 bg-[#FF5500] inline-block"></span>
          {selectedFile ? selectedFile : 'PILIH FILE UNTUK INSPEKSI DIFF'}
        </span>
        <span class="text-[10px] uppercase px-2 py-0.5 rounded-none bg-[#18191D] text-[#8C9097] border border-[#2A2B30] font-bold">
          DIFF TELEMETRY
        </span>
      </div>

      <div class="flex-1 overflow-y-auto pt-3 font-mono text-xs leading-relaxed text-[#D0D4DC] whitespace-pre overflow-x-auto custom-scrollbar select-text relative z-10">
        {#if activeDiff}
          {#each activeDiff.split('\n') as diffLine}
            {#if diffLine.startsWith('+') && !diffLine.startsWith('+++')}
              <div class="text-emerald-400 bg-emerald-950/30 px-1">{diffLine}</div>
            {:else if diffLine.startsWith('-') && !diffLine.startsWith('---')}
              <div class="text-rose-400 bg-rose-950/30 px-1">{diffLine}</div>
            {:else if diffLine.startsWith('@@')}
              <div class="text-sky-400 bg-sky-950/25 px-1 font-bold">{diffLine}</div>
            {:else if diffLine.startsWith('diff --git') || diffLine.startsWith('index ')}
              <div class="text-[#8C9097] px-1 font-bold">{diffLine}</div>
            {:else}
              <div class="text-[#A8A59C] px-1">{diffLine}</div>
            {/if}
          {/each}
        {:else}
          <div class="text-[#666] italic flex items-center gap-2 py-4 px-1">
            <span class="inline-block w-2 h-3 bg-[#33FF33] animate-retro-cursor"></span>
            <span>Standby. Pilih file yang dimodifikasi di sebelah kiri untuk melihat diff perubahan kode.</span>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Recent commits bar -->
  {#if commits && commits.length > 0}
    <div class="border-t border-[#D0CEC7] pt-2 flex items-center gap-4 text-xs font-stencil overflow-x-auto text-[#60646C]">
      <span class="text-[#111315] font-bold shrink-0 uppercase">Recent:</span>
      {#each commits.slice(0, 4) as c}
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="text-[#FF5500] font-bold">{c.hash}</span>
          <span class="truncate max-w-xs text-[#111315]">{c.message}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>
