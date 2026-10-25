<script lang="ts">
  import type { GitStatus, CommitInfo } from '../types';
  import { 
    GitBranch, 
    UploadCloud, 
    Download, 
    RotateCw, 
    Sparkles, 
    Check, 
    FileCode, 
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

<div class="h-full flex flex-col gap-3 overflow-hidden p-1">
  <!-- Top Bar -->
  <div class="flex items-center justify-between border-b border-zinc-800/80 pb-3">
    <div class="flex items-center gap-4 text-xs font-mono">
      <div class="flex items-center gap-1.5 text-zinc-200">
        <GitBranch class="w-3.5 h-3.5 text-zinc-400" />
        <span class="font-bold">{gitStatus?.branch || 'HEAD'}</span>
      </div>

      {#if gitStatus?.remoteUrl}
        <a href={gitStatus.remoteUrl} target="_blank" class="text-zinc-500 hover:text-zinc-300 flex items-center gap-1 truncate max-w-sm">
          {gitStatus.remoteUrl} <ExternalLink class="w-2.5 h-2.5" />
        </a>
      {/if}

      <div class="flex items-center gap-1 text-[11px]">
        <span class="px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
          {gitStatus?.ahead || 0} ahead
        </span>
        <span class="px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
          {gitStatus?.behind || 0} behind
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2">
      <button
        onclick={onPull}
        class="px-2.5 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
        title="Git Pull"
      >
        <Download class="w-3 h-3" /> Pull
      </button>

      <button
        onclick={onRefresh}
        class="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
        title="Refresh"
      >
        <RotateCw class="w-3.5 h-3.5" />
      </button>

      <button
        onclick={onPush}
        class="px-3.5 py-1.5 rounded-md bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95"
      >
        <UploadCloud class="w-3.5 h-3.5" /> Push
      </button>
    </div>
  </div>

  <!-- Split View: Files & Diff -->
  <div class="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-3 min-h-0">
    <!-- Left: Files & Commit -->
    <div class="flex flex-col gap-3 min-h-0 bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-3">
      <div class="flex items-center justify-between pb-2 border-b border-zinc-800/60">
        <span class="text-xs font-semibold text-zinc-200">
          Changes ({gitStatus?.files?.length || 0})
        </span>

        <div class="flex items-center gap-2 text-[11px] font-mono">
          <button onclick={() => onStageFiles(['.'])} class="text-zinc-400 hover:text-white cursor-pointer">Stage All</button>
          <span class="text-zinc-600">•</span>
          <button onclick={() => onUnstageFiles(['.'])} class="text-zinc-500 hover:text-white cursor-pointer">Unstage</button>
        </div>
      </div>

      <!-- Files list -->
      <div class="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 font-mono text-xs">
        {#if !gitStatus?.files || gitStatus.files.length === 0}
          <div class="flex flex-col items-center justify-center h-full text-zinc-500 text-xs py-8 gap-1 font-sans">
            <Check class="w-6 h-6 text-zinc-600 mb-1" />
            <span>Working tree clean</span>
          </div>
        {:else}
          {#each gitStatus.files as file}
            <button
              type="button"
              onclick={() => handleSelectFile(file.path, file.staged)}
              class="w-full flex items-center justify-between p-2 rounded-lg text-left transition cursor-pointer {selectedFile === file.path ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200'}"
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
                  class="cursor-pointer text-zinc-500 hover:text-white"
                >
                  {#if file.staged}
                    <CheckSquare class="w-3.5 h-3.5 text-zinc-300" />
                  {:else}
                    <Square class="w-3.5 h-3.5" />
                  {/if}
                </span>
                <span class="truncate text-[11px]">{file.path}</span>
              </div>

              <span class="text-[9px] uppercase px-1 rounded bg-zinc-800/80 text-zinc-400">
                {file.status[0]}
              </span>
            </button>
          {/each}
        {/if}
      </div>

      <!-- Commit form -->
      <div class="border-t border-zinc-800/60 pt-3 flex flex-col gap-2">
        <div class="flex items-center justify-between text-[11px]">
          <span class="text-zinc-400 font-medium">Commit message</span>
          <button
            onclick={handleAiCommit}
            disabled={isGeneratingAiMsg || !gitStatus?.files?.length}
            class="text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer disabled:opacity-40"
          >
            <Sparkles class="w-3 h-3" />
            {isGeneratingAiMsg ? 'Drafting...' : 'AI Generate'}
          </button>
        </div>

        <textarea
          bind:value={commitMessage}
          placeholder="e.g. fix: update navbar layout"
          rows="2"
          class="bg-zinc-900/80 border border-zinc-800 focus:border-zinc-700 rounded-lg p-2 text-xs text-zinc-200 placeholder-zinc-500 outline-none resize-none"
        ></textarea>

        <button
          onclick={handleCommit}
          disabled={isCommitting || !commitMessage.trim()}
          class="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          {isCommitting ? 'Committing...' : 'Commit'}
        </button>
      </div>
    </div>

    <!-- Right: Diff Viewer -->
    <div class="flex flex-col min-h-0 bg-zinc-950 border border-zinc-800/60 rounded-xl p-3 overflow-hidden">
      <div class="flex items-center justify-between pb-2 border-b border-zinc-800/60 text-xs font-mono">
        <span class="text-zinc-300 truncate">
          {selectedFile ? selectedFile : 'Pilih file untuk diff'}
        </span>
      </div>

      <div class="flex-1 overflow-y-auto pt-2 font-mono text-xs leading-relaxed text-zinc-300 whitespace-pre overflow-x-auto">
        {activeDiff || 'Tidak ada perubahan yang dipilih.'}
      </div>
    </div>
  </div>

  <!-- Recent commits bar -->
  {#if commits && commits.length > 0}
    <div class="border-t border-zinc-800/60 pt-2 flex items-center gap-4 text-xs font-mono overflow-x-auto text-zinc-400">
      <span class="text-zinc-500 font-bold shrink-0">Recent:</span>
      {#each commits.slice(0, 4) as c}
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="text-zinc-300 font-semibold">{c.hash}</span>
          <span class="truncate max-w-xs">{c.message}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>
