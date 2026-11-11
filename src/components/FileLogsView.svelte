<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { FileItem } from '../types';
  import { api } from '../services/api';
  import { dialog } from '../services/dialog.svelte';
  import {
    FolderTree,
    Terminal,
    RotateCw,
    Trash2,
    Folder,
    FolderOpen,
    File,
    Code,
    FileText,
    Save,
    Check,
    AlertCircle,
    Search,
    X,
    Columns,
    FileCode,
    ChevronRight,
    ChevronDown
  } from 'lucide-svelte';
  import SubtleHudMatrix from './SubtleHudMatrix.svelte';

  let {
    files,
    logs,
    onRefreshFiles,
    onClearLogs
  }: {
    files: FileItem[];
    logs: string[];
    onRefreshFiles: () => void;
    onClearLogs: () => void;
  } = $props();

  // View Layout Mode: 'split' (Editor + Logs side-by-side or stacked), 'editor' (Full code editor), 'logs' (Full Telemetry Stream)
  let viewMode = $state<'split' | 'editor' | 'logs'>('split');

  // Selected file state
  let selectedFile = $state<{ path: string; name: string } | null>(null);
  let fileContent = $state<string>('');
  let originalContent = $state<string>('');
  let isLoadingContent = $state<boolean>(false);
  let isSaving = $state<boolean>(false);
  let saveSuccessFlash = $state<boolean>(false);
  let fileError = $state<string | null>(null);
  let isBinary = $state<boolean>(false);
  let fileSize = $state<number>(0);
  let fileModifiedAt = $state<string>('');

  // Cursor coordinates & editor metrics
  let cursorLine = $state<number>(1);
  let cursorCol = $state<number>(1);

  // Search & Explorer state
  let searchQuery = $state<string>('');
  let expandedFolders = $state<Set<string>>(new Set(['src', 'server', 'pages', 'components']));

  // DOM elements
  let textareaEl = $state<HTMLTextAreaElement | null>(null);
  let lineNumbersEl = $state<HTMLDivElement | null>(null);

  const isDirty = $derived(selectedFile !== null && fileContent !== originalContent);
  const lineCount = $derived(fileContent ? fileContent.split('\n').length : 1);

  function getFileIcon(name: string) {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx' || ext === 'svelte') return Code;
    if (ext === 'json' || ext === 'md' || ext === 'sql' || ext === 'yaml' || ext === 'yml') return FileText;
    return File;
  }

  function getFileLangBadge(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() || 'txt';
    return ext.toUpperCase();
  }

  function toggleFolder(folderPath: string) {
    const next = new Set(expandedFolders);
    if (next.has(folderPath)) {
      next.delete(folderPath);
    } else {
      next.add(folderPath);
    }
    expandedFolders = next;
  }

  async function openFile(f: { path: string; name: string }) {
    if (selectedFile?.path === f.path) return;

    if (isDirty) {
      const confirmLeave = confirm(`File "${selectedFile?.name}" memiliki perubahan yang belum disimpan. Tetap buka file "${f.name}"?`);
      if (!confirmLeave) return;
    }

    selectedFile = f;
    fileError = null;
    isLoadingContent = true;

    try {
      const res = await api.getFileContent(f.path);
      if (res.success) {
        fileContent = res.content || '';
        originalContent = res.content || '';
        isBinary = Boolean(res.isBinary);
        fileSize = res.size || 0;
        fileModifiedAt = res.modifiedAt ? new Date(res.modifiedAt).toLocaleTimeString() : '';
        cursorLine = 1;
        cursorCol = 1;

        if (viewMode === 'logs') {
          viewMode = 'split';
        }

        await tick();
        if (textareaEl) {
          textareaEl.scrollTop = 0;
          textareaEl.selectionStart = 0;
          textareaEl.selectionEnd = 0;
        }
      } else {
        fileError = res.error || 'Gagal memuat isi file.';
        fileContent = '';
        originalContent = '';
      }
    } catch (err: any) {
      fileError = err.message || 'Koneksi error saat membaca file.';
    } finally {
      isLoadingContent = false;
    }
  }

  async function handleSaveFile() {
    if (!selectedFile || !isDirty || isSaving || isBinary) return;

    isSaving = true;
    try {
      const res = await api.saveFileContent(selectedFile.path, fileContent);
      if (res.success) {
        originalContent = fileContent;
        saveSuccessFlash = true;
        setTimeout(() => (saveSuccessFlash = false), 2500);
        dialog.showSuccess(`File "${selectedFile.name}" berhasil disimpan.`);
      } else {
        dialog.showError(res.error || 'Gagal menyimpan file.');
      }
    } catch (err: any) {
      dialog.showError(err.message || 'Error saat menyimpan file.');
    } finally {
      isSaving = false;
    }
  }

  async function handleReloadFile() {
    if (!selectedFile) return;
    if (isDirty) {
      const confirmReload = confirm(`Batalkan perubahan lokal dan muat ulang "${selectedFile.name}" dari disk?`);
      if (!confirmReload) return;
    }
    const current = selectedFile;
    selectedFile = null;
    await openFile(current);
  }

  function handleEditorScroll() {
    if (textareaEl && lineNumbersEl) {
      lineNumbersEl.scrollTop = textareaEl.scrollTop;
    }
  }

  function updateCursorCoordinates() {
    if (!textareaEl) return;
    const pos = textareaEl.selectionStart;
    const textBefore = fileContent.substring(0, pos);
    const lines = textBefore.split('\n');
    cursorLine = lines.length;
    cursorCol = (lines[lines.length - 1]?.length || 0) + 1;
  }

  function handleEditorKeyDown(e: KeyboardEvent) {
    // 1. Ctrl+S or Cmd+S -> Instant Save
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleSaveFile();
      return;
    }

    // 2. Tab key indentation (2 spaces)
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!textareaEl) return;

      const start = textareaEl.selectionStart;
      const end = textareaEl.selectionEnd;

      if (e.shiftKey) {
        // Shift+Tab -> Outdent
        const text = fileContent;
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        if (text.substring(lineStart, lineStart + 2) === '  ') {
          fileContent = text.substring(0, lineStart) + text.substring(lineStart + 2);
          tick().then(() => {
            if (textareaEl) {
              textareaEl.selectionStart = Math.max(lineStart, start - 2);
              textareaEl.selectionEnd = Math.max(lineStart, end - 2);
              updateCursorCoordinates();
            }
          });
        }
      } else {
        // Tab -> Indent 2 spaces
        fileContent = fileContent.substring(0, start) + '  ' + fileContent.substring(end);
        tick().then(() => {
          if (textareaEl) {
            textareaEl.selectionStart = textareaEl.selectionEnd = start + 2;
            updateCursorCoordinates();
          }
        });
      }
      return;
    }

    // Update cursor position on any key
    tick().then(updateCursorCoordinates);
  }

  function insertQuickSnippet(snippet: string) {
    if (!textareaEl) return;
    const start = textareaEl.selectionStart;
    const end = textareaEl.selectionEnd;
    fileContent = fileContent.substring(0, start) + snippet + fileContent.substring(end);
    tick().then(() => {
      if (textareaEl) {
        const newPos = start + snippet.length;
        textareaEl.focus();
        textareaEl.selectionStart = textareaEl.selectionEnd = newPos;
        updateCursorCoordinates();
      }
    });
  }

  function filterTree(items: FileItem[], query: string): FileItem[] {
    if (!query.trim()) return items;
    const q = query.toLowerCase();

    function matchItem(item: FileItem): FileItem | null {
      if (!item.isDirectory) {
        return item.name.toLowerCase().includes(q) ? item : null;
      }
      const matchingChildren = (item.children || [])
        .map(matchItem)
        .filter((c): c is FileItem => c !== null);

      if (matchingChildren.length > 0 || item.name.toLowerCase().includes(q)) {
        return {
          ...item,
          children: matchingChildren
        };
      }
      return null;
    }

    return items.map(matchItem).filter((i): i is FileItem => i !== null);
  }

  const displayedFiles = $derived(filterTree(files || [], searchQuery));
</script>

<div class="h-full flex flex-col md:grid md:grid-cols-[280px_1fr] gap-3 overflow-hidden pb-16 md:pb-0 p-3 sm:p-4 text-[#111315] font-tech blueprint-cad-ground bg-[#ECEAE5] relative select-none">
  <!-- Pinned Subtle Retro-Futuristic Background HUD Matrix -->
  <SubtleHudMatrix />

  <!-- ============================================================ -->
  <!-- LEFT COLUMN: BLUEPRINT FILE TREE EXPLORER                   -->
  <!-- ============================================================ -->
  <aside class="relative z-10 bg-[#FCFCFA] border border-[#D0CEC7] p-3 rounded-none flex flex-col gap-2.5 h-56 md:h-full overflow-hidden shadow-2xs">
    <!-- Corner Registration Marks -->
    <span class="reg-dot reg-dot-tl"></span>
    <span class="reg-dot reg-dot-bl"></span>

    <!-- Explorer Header -->
    <div class="flex items-center justify-between border-b border-[#D0CEC7] pb-2 shrink-0">
      <div class="flex items-center gap-1.5">
        <FolderTree class="w-4 h-4 text-[#FF5500]" />
        <span class="text-xs font-black tracking-wider uppercase font-tech text-[#111315]">
          PROJECT BLUEPRINT
        </span>
      </div>
      <button
        onclick={onRefreshFiles}
        class="p-1 rounded-none hover:bg-[#ECEAE5] text-[#60646C] hover:text-[#111315] cursor-pointer transition"
        title="Refresh tree files"
      >
        <RotateCw class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Quick Search Filter -->
    <div class="relative shrink-0">
      <Search class="w-3.5 h-3.5 absolute left-2 top-2 text-[#8C9097]" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Filter file..."
        class="w-full bg-[#ECEAE5] border border-[#D0CEC7] pl-7 pr-6 py-1 text-xs text-[#111315] placeholder-[#8C9097] rounded-none outline-none focus:border-[#FF5500] font-stencil"
      />
      {#if searchQuery}
        <button
          onclick={() => (searchQuery = '')}
          class="absolute right-1.5 top-1.5 p-0.5 text-[#8C9097] hover:text-[#111315]"
        >
          <X class="w-3 h-3" />
        </button>
      {/if}
    </div>

    <!-- Tree Items Container -->
    <div class="flex-1 overflow-y-auto font-stencil text-xs flex flex-col gap-0.5 pr-1 select-none">
      {#if !displayedFiles || displayedFiles.length === 0}
        <div class="text-[#8C9097] py-6 text-center text-xs italic">
          {searchQuery ? 'Tidak ada file yang cocok' : 'Folder kosong'}
        </div>
      {:else}
        {#each displayedFiles as item (item.path)}
          <!-- Root Level Item -->
          {#if item.isDirectory}
            {@const isExp = expandedFolders.has(item.path)}
            <div>
              <button
                onclick={() => toggleFolder(item.path)}
                class="w-full flex items-center gap-1.5 py-1 px-1.5 rounded-none hover:bg-[#ECEAE5] cursor-pointer text-[#111315] text-left transition"
              >
                {#if isExp}
                  <ChevronDown class="w-3 h-3 text-[#60646C]" />
                  <FolderOpen class="w-3.5 h-3.5 text-amber-600 shrink-0" />
                {:else}
                  <ChevronRight class="w-3 h-3 text-[#60646C]" />
                  <Folder class="w-3.5 h-3.5 text-amber-600 shrink-0" />
                {/if}
                <span class="font-bold truncate">{item.name}/</span>
              </button>

              <!-- Level 1 Children -->
              {#if isExp && item.children && item.children.length > 0}
                <div class="pl-3.5 border-l border-[#D0CEC7] ml-2 flex flex-col gap-0.5 my-0.5">
                  {#each item.children as c1 (c1.path)}
                    {#if c1.isDirectory}
                      {@const isC1Exp = expandedFolders.has(c1.path)}
                      <div>
                        <button
                          onclick={() => toggleFolder(c1.path)}
                          class="w-full flex items-center gap-1.5 py-0.5 px-1 rounded-none hover:bg-[#ECEAE5] cursor-pointer text-[#60646C] hover:text-[#111315] text-left transition"
                        >
                          {#if isC1Exp}
                            <ChevronDown class="w-2.5 h-2.5 text-[#8C9097]" />
                            <FolderOpen class="w-3 h-3 text-amber-600/80 shrink-0" />
                          {:else}
                            <ChevronRight class="w-2.5 h-2.5 text-[#8C9097]" />
                            <Folder class="w-3 h-3 text-amber-600/80 shrink-0" />
                          {/if}
                          <span class="font-medium truncate">{c1.name}/</span>
                        </button>

                        <!-- Level 2 Children -->
                        {#if isC1Exp && c1.children && c1.children.length > 0}
                          <div class="pl-3 border-l border-[#D0CEC7] ml-1.5 flex flex-col gap-0.5 my-0.5">
                            {#each c1.children as c2 (c2.path)}
                              {#if !c2.isDirectory}
                                {@const isC2Selected = selectedFile?.path === c2.path}
                                {@const IconC2 = getFileIcon(c2.name)}
                                <button
                                  onclick={() => openFile(c2)}
                                  class="w-full flex items-center gap-1.5 py-0.5 px-1 rounded-none cursor-pointer transition text-left {isC2Selected
                                    ? 'bg-[#E5E3DD] text-[#FF5500] font-bold border-l-2 border-[#FF5500]'
                                    : 'text-[#60646C] hover:bg-[#ECEAE5] hover:text-[#111315]'}"
                                >
                                  <IconC2 class="w-3 h-3 shrink-0 {isC2Selected ? 'text-[#FF5500]' : 'text-[#8C9097]'}" />
                                  <span class="truncate">{c2.name}</span>
                                </button>
                              {:else}
                                <div class="flex items-center gap-1 py-0.5 px-1 text-[#8C9097] text-[10px]">
                                  <Folder class="w-2.5 h-2.5" />
                                  <span class="truncate">{c2.name}/</span>
                                </div>
                              {/if}
                            {/each}
                          </div>
                        {/if}
                      </div>
                    {:else}
                      {@const isC1Selected = selectedFile?.path === c1.path}
                      {@const IconC1 = getFileIcon(c1.name)}
                      <button
                        onclick={() => openFile(c1)}
                        class="w-full flex items-center gap-1.5 py-0.5 px-1 rounded-none cursor-pointer transition text-left {isC1Selected
                          ? 'bg-[#E5E3DD] text-[#FF5500] font-bold border-l-2 border-[#FF5500]'
                          : 'text-[#60646C] hover:bg-[#ECEAE5] hover:text-[#111315]'}"
                      >
                        <IconC1 class="w-3 h-3 shrink-0 {isC1Selected ? 'text-[#FF5500]' : 'text-[#8C9097]'}" />
                        <span class="truncate">{c1.name}</span>
                      </button>
                    {/if}
                  {/each}
                </div>
              {/if}
            </div>
          {:else}
            {@const isRootSelected = selectedFile?.path === item.path}
            {@const RootIcon = getFileIcon(item.name)}
            <button
              onclick={() => openFile(item)}
              class="w-full flex items-center gap-1.5 py-1 px-1.5 rounded-none cursor-pointer transition text-left {isRootSelected
                ? 'bg-[#E5E3DD] text-[#FF5500] font-bold border-l-2 border-[#FF5500]'
                : 'text-[#111315] hover:bg-[#ECEAE5]'}"
            >
              <RootIcon class="w-3.5 h-3.5 shrink-0 {isRootSelected ? 'text-[#FF5500]' : 'text-[#FF5500]'}" />
              <span class="truncate">{item.name}</span>
            </button>
          {/if}
        {/each}
      {/if}
    </div>

    <!-- Explorer Footer Telemetry -->
    <div class="border-t border-[#D0CEC7] pt-2 flex items-center justify-between text-[10px] font-mono text-[#60646C] shrink-0">
      <span>:: CAD SEAMS OK</span>
      <span class="uppercase text-[9px] bg-[#ECEAE5] px-1 py-0.5 border border-[#D0CEC7]">
        {displayedFiles.length} ITEMS
      </span>
    </div>
  </aside>

  <!-- ============================================================ -->
  <!-- RIGHT COLUMN: CODE EDITOR & TELEMETRY STREAM LOGS           -->
  <!-- ============================================================ -->
  <main class="relative z-10 flex-1 flex flex-col gap-2.5 h-full overflow-hidden">
    <!-- Top Cockpit Control Deck: Tab Switcher & Status -->
    <header class="bg-[#FCFCFA] border border-[#D0CEC7] px-3 py-2 shrink-0 flex items-center justify-between shadow-2xs font-tech">
      <!-- Mode View Selectors -->
      <div class="flex items-center gap-1 bg-[#ECEAE5] p-0.5 border border-[#D0CEC7]">
        <button
          onclick={() => (viewMode = 'split')}
          class="px-2.5 py-1 text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer {viewMode === 'split'
            ? 'bg-[#FF5500] text-white'
            : 'text-[#60646C] hover:text-[#111315]'}"
        >
          <Columns class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">SPLIT VIEW</span>
        </button>

        <button
          onclick={() => (viewMode = 'editor')}
          class="px-2.5 py-1 text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer {viewMode === 'editor'
            ? 'bg-[#FF5500] text-white'
            : 'text-[#60646C] hover:text-[#111315]'}"
        >
          <FileCode class="w-3.5 h-3.5" />
          <span>EDITOR</span>
          {#if isDirty}
            <span class="w-1.5 h-1.5 bg-[#FF5500] rounded-full animate-ping"></span>
          {/if}
        </button>

        <button
          onclick={() => (viewMode = 'logs')}
          class="px-2.5 py-1 text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer {viewMode === 'logs'
            ? 'bg-[#FF5500] text-white'
            : 'text-[#60646C] hover:text-[#111315]'}"
        >
          <Terminal class="w-3.5 h-3.5" />
          <span>LOGS</span>
          {#if logs && logs.length > 0}
            <span class="text-[9px] px-1 bg-[#101114] text-emerald-400 font-mono">
              {logs.length}
            </span>
          {/if}
        </button>
      </div>

      <!-- Right Active File Pill or Save Button -->
      <div class="flex items-center gap-2">
        {#if selectedFile}
          <!-- Dirty / Saved Badge -->
          <div class="flex items-center gap-1.5 font-stencil text-[10px]">
            {#if isDirty}
              <span class="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-bold uppercase flex items-center gap-1">
                <span class="w-1.5 h-1.5 bg-[#FF5500] rounded-none animate-pulse"></span>
                UNSAVED
              </span>
            {:else}
              <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold uppercase flex items-center gap-1">
                <Check class="w-3 h-3 text-emerald-600" />
                SAVED
              </span>
            {/if}
          </div>

          <!-- Reload Button -->
          <button
            onclick={handleReloadFile}
            class="p-1.5 bg-[#ECEAE5] border border-[#D0CEC7] text-[#60646C] hover:text-[#111315] hover:bg-[#E5E3DD] cursor-pointer transition"
            title="Muat ulang file dari disk"
          >
            <RotateCw class="w-3.5 h-3.5" />
          </button>

          <!-- Save Button -->
          <button
            onclick={handleSaveFile}
            disabled={!isDirty || isSaving || isBinary}
            class="px-3 py-1 text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer {isDirty
              ? 'bg-[#FF5500] text-white hover:bg-[#E04B00] shadow-sm'
              : 'bg-[#E5E3DD] text-[#8C9097] border border-[#D0CEC7] cursor-not-allowed'}"
          >
            {#if isSaving}
              <RotateCw class="w-3.5 h-3.5 animate-spin" />
              <span>SAVING...</span>
            {:else if saveSuccessFlash}
              <Check class="w-3.5 h-3.5 text-white" />
              <span>SAVED!</span>
            {:else}
              <Save class="w-3.5 h-3.5" />
              <span>SAVE <span class="text-[9px] opacity-75 hidden sm:inline">[CTRL+S]</span></span>
            {/if}
          </button>
        {:else}
          <span class="text-[11px] font-stencil text-[#8C9097] italic hidden sm:inline">
            :: KLIK FILE UNTUK MEMBUKA EDITOR
          </span>
        {/if}
      </div>
    </header>

    <!-- Workspace Viewport Bays -->
    <div class="flex-1 flex flex-col md:flex-row gap-2.5 overflow-hidden min-h-0">
      <!-- -------------------------------------------------------- -->
      <!-- BAY 1: REAL-TIME CODE EDITOR                             -->
      <!-- -------------------------------------------------------- -->
      {#if viewMode === 'editor' || viewMode === 'split'}
        <section
          class="relative bg-[#101114] border border-[#2A2B30] flex flex-col overflow-hidden shadow-md {viewMode === 'split'
            ? 'h-3/5 md:h-full md:w-3/5'
            : 'h-full w-full'}"
        >
          <!-- Registration Dot -->
          <span class="reg-dot reg-dot-tr"></span>

          <!-- Editor Sub-Header: Path & Metrics -->
          <div class="bg-[#191B20] border-b border-[#2A2B30] px-3 py-1.5 flex items-center justify-between text-xs font-stencil shrink-0">
            {#if selectedFile}
              <div class="flex items-center gap-2 truncate">
                <span class="px-1.5 py-0.2 bg-[#FF5500] text-white text-[9px] font-bold">
                  {getFileLangBadge(selectedFile.name)}
                </span>
                <span class="text-[#ECEAE5] font-bold truncate">
                  {selectedFile.path}
                </span>
                {#if isDirty}
                  <span class="text-[#FF5500] font-black text-xs">●</span>
                {/if}
              </div>

              <div class="flex items-center gap-3 text-[10px] text-[#8C9097] shrink-0 font-mono">
                <span>LN {cursorLine}, COL {cursorCol}</span>
                <span class="hidden sm:inline">|</span>
                <span class="hidden sm:inline">{lineCount} LINES</span>
                <span class="hidden sm:inline">|</span>
                <span>{(fileSize / 1024).toFixed(1)} KB</span>
              </div>
            {:else}
              <span class="text-[#8C9097] text-xs">
                :: STANDBY // PILIH FILE DI SEBELAH KIRI
              </span>
            {/if}
          </div>

          <!-- Editor Core Body -->
          {#if isLoadingContent}
            <div class="flex-1 flex flex-col items-center justify-center gap-3 text-emerald-400 font-stencil text-xs p-6">
              <RotateCw class="w-6 h-6 animate-spin text-[#FF5500]" />
              <span>MEMBACA DATA FILE DARI DISK...</span>
            </div>
          {:else if fileError}
            <div class="flex-1 flex flex-col items-center justify-center gap-2 text-rose-400 font-stencil text-xs p-6 text-center">
              <AlertCircle class="w-6 h-6 text-rose-500 mb-1" />
              <span class="font-bold text-sm">GAGAL MEMBUKA FILE</span>
              <p class="text-[#8C9097] max-w-md">{fileError}</p>
            </div>
          {:else if isBinary}
            <div class="flex-1 flex flex-col items-center justify-center gap-2 text-amber-400 font-stencil text-xs p-6 text-center">
              <File class="w-8 h-8 text-amber-500 mb-1" />
              <span class="font-bold text-sm text-[#ECEAE5]">PREVIEW FILE BINER</span>
              <p class="text-[#8C9097] max-w-md">{fileContent}</p>
            </div>
          {:else if selectedFile}
            <!-- Code Canvas with Line Numbers Gutter -->
            <div class="relative flex-1 flex overflow-hidden font-stencil text-xs leading-relaxed crt-screen">
              <!-- Line Numbers Gutter -->
              <div
                bind:this={lineNumbersEl}
                class="w-11 shrink-0 bg-[#14161A] text-[#555963] select-none text-right pr-2.5 pt-3 overflow-hidden font-mono text-[11px] border-r border-[#2A2B30]"
              >
                {#each Array(lineCount) as _, idx}
                  <div class="h-5 leading-5 {cursorLine === idx + 1 ? 'text-[#FF5500] font-bold' : ''}">
                    {idx + 1}
                  </div>
                {/each}
              </div>

              <!-- Main Code Textarea Input Well -->
              <textarea
                bind:this={textareaEl}
                bind:value={fileContent}
                onscroll={handleEditorScroll}
                onkeydown={handleEditorKeyDown}
                onclick={updateCursorCoordinates}
                onkeyup={updateCursorCoordinates}
                spellcheck="false"
                autocomplete="off"
                autocapitalize="off"
                class="flex-1 bg-transparent text-[#E5E3DD] p-3 pl-3 outline-none resize-none overflow-auto font-stencil text-[11px] leading-5 whitespace-pre tab-4 border-none focus:ring-0 selection:bg-[#FF5500] selection:text-white"
              ></textarea>
            </div>

            <!-- Mobile Quick Helper Toolbar -->
            <div class="bg-[#14161A] border-t border-[#2A2B30] p-1.5 flex items-center gap-1 overflow-x-auto shrink-0 select-none">
              <span class="text-[9px] font-mono text-[#8C9097] px-1 hidden sm:inline">SNIPPETS:</span>
              <button onclick={() => insertQuickSnippet('  ')} class="px-2 py-0.5 bg-[#22242B] text-xs text-[#ECEAE5] hover:bg-[#FF5500] hover:text-white cursor-pointer font-mono">TAB</button>
              <button onclick={() => insertQuickSnippet('{  }')} class="px-2 py-0.5 bg-[#22242B] text-xs text-[#ECEAE5] hover:bg-[#FF5500] hover:text-white cursor-pointer font-mono">&#123; &#125;</button>
              <button onclick={() => insertQuickSnippet('(  )')} class="px-2 py-0.5 bg-[#22242B] text-xs text-[#ECEAE5] hover:bg-[#FF5500] hover:text-white cursor-pointer font-mono">( )</button>
              <button onclick={() => insertQuickSnippet('<> </>')} class="px-2 py-0.5 bg-[#22242B] text-xs text-[#ECEAE5] hover:bg-[#FF5500] hover:text-white cursor-pointer font-mono">&lt;&gt;</button>
              <button onclick={() => insertQuickSnippet("''")} class="px-2 py-0.5 bg-[#22242B] text-xs text-[#ECEAE5] hover:bg-[#FF5500] hover:text-white cursor-pointer font-mono">' '</button>
              <button onclick={() => insertQuickSnippet('""')} class="px-2 py-0.5 bg-[#22242B] text-xs text-[#ECEAE5] hover:bg-[#FF5500] hover:text-white cursor-pointer font-mono">" "</button>
              <button onclick={() => insertQuickSnippet(' = ')} class="px-2 py-0.5 bg-[#22242B] text-xs text-[#ECEAE5] hover:bg-[#FF5500] hover:text-white cursor-pointer font-mono">=</button>
              <button onclick={() => insertQuickSnippet(' => ')} class="px-2 py-0.5 bg-[#22242B] text-xs text-[#ECEAE5] hover:bg-[#FF5500] hover:text-white cursor-pointer font-mono">=&gt;</button>
              <button onclick={() => insertQuickSnippet(';')} class="px-2 py-0.5 bg-[#22242B] text-xs text-[#ECEAE5] hover:bg-[#FF5500] hover:text-white cursor-pointer font-mono">;</button>
            </div>
          {:else}
            <!-- Empty Standby Canvas -->
            <div class="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-[#101114]">
              <div class="relative w-16 h-16 flex items-center justify-center border border-[#2A2B30] mb-3 bg-[#14161A]">
                <span class="absolute -top-1 -left-1 w-2 h-2 bg-[#FF5500]"></span>
                <span class="absolute -bottom-1 -right-1 w-2 h-2 bg-emerald-400"></span>
                <FileCode class="w-8 h-8 text-[#FF5500]" />
              </div>
              <h3 class="text-xs font-black uppercase tracking-wider text-[#ECEAE5] mb-1">
                STANDBY :: CODE EDITOR
              </h3>
              <p class="text-[11px] font-stencil text-[#8C9097] max-w-sm mb-4 leading-relaxed">
                Pilih file dari panel Project Blueprint di sisi kiri untuk membuka dan mengedit kode secara langsung dengan sinkronisasi realtime.
              </p>
              <div class="flex items-center gap-2 text-[10px] font-mono text-[#60646C] bg-[#14161A] px-3 py-1.5 border border-[#2A2B30]">
                <span class="text-[#FF5500] font-bold">SHORTCUT:</span>
                <span>Ctrl+S (Save)</span>
                <span>•</span>
                <span>Tab (Indent 2 spasi)</span>
              </div>
            </div>
          {/if}
        </section>
      {/if}

      <!-- -------------------------------------------------------- -->
      <!-- BAY 2: LIVE TELEMETRY STREAM & TASK TRACE LOGS          -->
      <!-- -------------------------------------------------------- -->
      {#if viewMode === 'logs' || viewMode === 'split'}
        <section
          class="relative bg-[#101114] border border-[#2A2B30] flex flex-col overflow-hidden shadow-md {viewMode === 'split'
            ? 'h-2/5 md:h-full md:w-2/5'
            : 'h-full w-full'}"
        >
          <!-- Registration Dot -->
          <span class="reg-dot reg-dot-tl"></span>

          <!-- Logs Header Deck -->
          <div class="bg-[#191B20] border-b border-[#2A2B30] px-3 py-1.5 flex items-center justify-between shrink-0 font-tech">
            <div class="flex items-center gap-1.5">
              <Terminal class="w-3.5 h-3.5 text-[#FF5500]" />
              <span class="text-xs font-bold text-[#ECEAE5] uppercase tracking-wider">
                TELEMETRY & TASK TRACE
              </span>
            </div>

            <div class="flex items-center gap-2">
              <span class="font-stencil text-[9px] text-emerald-400 font-bold px-1.5 py-0.2 bg-emerald-950/60 border border-emerald-500/40">
                LIVE FEED
              </span>
              <button
                onclick={onClearLogs}
                class="p-1 text-[#8C9097] hover:text-[#ECEAE5] hover:bg-[#22242B] cursor-pointer transition"
                title="Clear logs"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- CRT Stream Display Well -->
          <div class="relative flex-1 overflow-y-auto p-3 font-stencil text-[11px] leading-relaxed flex flex-col gap-1 text-emerald-400 crt-screen">
            <!-- Scanlines Overlay -->
            <div class="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px]"></div>

            {#if !logs || logs.length === 0}
              <div class="text-[#8C9097] italic py-4">
                [System] Telemetry standby. Menunggu aktivitas task...
              </div>
            {:else}
              {#each logs as log}
                <div class="whitespace-pre-wrap break-all relative z-10 font-mono">
                  {log}
                </div>
              {/each}
            {/if}
          </div>

          <!-- Logs Footer Status -->
          <div class="bg-[#14161A] border-t border-[#2A2B30] px-3 py-1 flex items-center justify-between text-[10px] font-mono text-[#8C9097] shrink-0">
            <span>PACKET FEED // 115200 BAUD</span>
            <span class="text-emerald-400 font-bold">NOMINAL</span>
          </div>
        </section>
      {/if}
    </div>
  </main>
</div>
