<script lang="ts">
  import { onMount, tick, onDestroy } from 'svelte';
  import { type FileItem, sortFileItems } from '../types';
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
    ChevronDown,
    Hash,
    Palette
  } from 'lucide-svelte';
  import SubtleHudMatrix from './SubtleHudMatrix.svelte';
  import FileTreeNode from './FileTreeNode.svelte';

  // CodeMirror 6 Modules
  import { EditorView, basicSetup } from 'codemirror';
  import { EditorState, Compartment } from '@codemirror/state';
  import { keymap } from '@codemirror/view';
  import { search, searchKeymap, openSearchPanel, gotoLine } from '@codemirror/search';
  import { oneDark } from '@codemirror/theme-one-dark';
  import { javascript } from '@codemirror/lang-javascript';
  import { html } from '@codemirror/lang-html';
  import { css } from '@codemirror/lang-css';
  import { json } from '@codemirror/lang-json';
  import { sql } from '@codemirror/lang-sql';

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

  // View Layout Mode
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

  // Cursor coordinates
  let cursorLine = $state<number>(1);
  let cursorCol = $state<number>(1);

  // Search & Explorer state
  let searchQuery = $state<string>('');
  let expandedFolders = $state<Set<string>>(new Set(['src', 'server', 'pages', 'components']));

  // CodeMirror Container & Instance
  let editorHostEl = $state<HTMLDivElement | null>(null);
  let editorView: EditorView | null = null;
  const languageConf = new Compartment();

  const isDirty = $derived(selectedFile !== null && fileContent !== originalContent);
  const lineCount = $derived(fileContent ? fileContent.split('\n').length : 1);

  // Custom Cyber-Industrial Theme extension
  const cyberIndustrialTheme = EditorView.theme({
    '&': {
      backgroundColor: '#101114',
      color: '#DCDAD4',
      height: '100%',
      fontSize: '12px',
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace'
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'inherit'
    },
    '.cm-content': {
      caretColor: '#FF5500',
      padding: '12px 0'
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#FF5500',
      borderLeftWidth: '2px'
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'rgba(255, 85, 0, 0.28) !important'
    },
    '.cm-gutters': {
      backgroundColor: '#14161A',
      color: '#555963',
      borderRight: '1px solid #2A2B30',
      paddingRight: '6px'
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: '#FF5500',
      fontWeight: 'bold'
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(255, 255, 255, 0.03)'
    },
    // Search Panel styling (Match Cyber-Industrial Blueprint)
    '.cm-panel.cm-search': {
      backgroundColor: '#191B20',
      color: '#ECEAE5',
      borderBottom: '1px solid #FF5500',
      padding: '6px 12px',
      fontFamily: 'inherit'
    },
    '.cm-panel.cm-search input': {
      backgroundColor: '#101114',
      color: '#ECEAE5',
      border: '1px solid #2A2B30',
      outline: 'none',
      padding: '2px 6px',
      fontSize: '11px',
      borderRadius: '0px'
    },
    '.cm-panel.cm-search input:focus': {
      borderColor: '#FF5500'
    },
    '.cm-panel.cm-search button': {
      backgroundColor: '#22242B',
      color: '#ECEAE5',
      border: '1px solid #2A2B30',
      padding: '2px 8px',
      fontSize: '11px',
      borderRadius: '0px',
      cursor: 'pointer',
      margin: '0 2px'
    },
    '.cm-panel.cm-search button:hover': {
      backgroundColor: '#FF5500',
      color: '#FFFFFF'
    },
    '.cm-panel.cm-search label': {
      color: '#8C9097',
      fontSize: '11px',
      marginLeft: '6px'
    }
  }, { dark: true });

  function getLanguageExtension(filename: string) {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
      case 'ts':
      case 'tsx':
        return javascript({ typescript: true, jsx: true });
      case 'js':
      case 'jsx':
      case 'mjs':
      case 'cjs':
        return javascript({ jsx: true });
      case 'svelte':
        return html();
      case 'html':
      case 'htm':
        return html();
      case 'css':
      case 'scss':
      case 'less':
        return css();
      case 'json':
      case 'jsonc':
        return json();
      case 'sql':
        return sql();
      default:
        return [];
    }
  }

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

  onMount(() => {
    onRefreshFiles?.();
  });

  async function toggleFolder(folderPath: string, folderItem?: FileItem) {
    const next = new Set(expandedFolders);
    if (next.has(folderPath)) {
      next.delete(folderPath);
    } else {
      next.add(folderPath);
      // If folder children are missing or empty, lazily load live contents directly from server disk
      if (folderItem && (!folderItem.children || folderItem.children.length === 0)) {
        try {
          const res = await api.getDirectoryFiles(folderPath);
          if (res?.files && res.files.length > 0) {
            folderItem.children = sortFileItems(res.files);
          }
        } catch (e) {
          console.warn('Failed to load directory files on demand:', folderPath, e);
        }
      }
    }
    expandedFolders = next;
  }

  function attachEditor(node: HTMLElement) {
    editorHostEl = node;
    if (selectedFile && !isBinary) {
      initOrUpdateEditor(fileContent, selectedFile.name);
    }
    return {
      update() {
        if (selectedFile && !isBinary && !editorView) {
          initOrUpdateEditor(fileContent, selectedFile.name);
        }
      },
      destroy() {
        if (editorView) {
          editorView.destroy();
          editorView = null;
        }
        editorHostEl = null;
      }
    };
  }

  function initOrUpdateEditor(content: string, filename: string) {
    if (!editorHostEl) return;

    if (editorView) {
      editorView.destroy();
      editorView = null;
    }

    const startState = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        oneDark,
        cyberIndustrialTheme,
        languageConf.of(getLanguageExtension(filename)),
        search({ top: true }),
        keymap.of([
          ...searchKeymap,
          {
            key: 'Mod-s',
            run: () => {
              handleSaveFile();
              return true;
            }
          },
          {
            key: 'Mod-g',
            run: (view) => {
              gotoLine(view);
              return true;
            }
          }
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            fileContent = update.state.doc.toString();
          }
          if (update.selectionSet || update.docChanged) {
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);
            cursorLine = line.number;
            cursorCol = pos - line.from + 1;
          }
        })
      ]
    });

    editorView = new EditorView({
      state: startState,
      parent: editorHostEl
    });
  }

  async function openFile(f: { path: string; name: string }) {
    if (selectedFile?.path === f.path) return;

    if (isDirty) {
      const confirmLeave = confirm(`File "${selectedFile?.name}" memiliki perubahan yang belum disimpan. Buka "${f.name}"?`);
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

    await tick();
    if (!isBinary && selectedFile && editorHostEl) {
      initOrUpdateEditor(fileContent, f.name);
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

  function handleTriggerSearch() {
    if (editorView) {
      openSearchPanel(editorView);
    }
  }

  function handleTriggerGotoLine() {
    if (editorView) {
      gotoLine(editorView);
    }
  }

  function insertQuickSnippet(snippet: string) {
    if (!editorView) return;
    const { from, to } = editorView.state.selection.main;
    editorView.dispatch({
      changes: { from, to, insert: snippet },
      selection: { anchor: from + snippet.length }
    });
    editorView.focus();
  }

  function filterTree(items: FileItem[], query: string): FileItem[] {
    const sorted = sortFileItems(items);
    if (!query.trim()) return sorted;
    const q = query.toLowerCase();

    function matchItem(item: FileItem): FileItem | null {
      if (!item.isDirectory) {
        return item.name.toLowerCase().includes(q) ? item : null;
      }
      const matchingChildren = sortFileItems((item.children || [])
        .map(matchItem)
        .filter((c): c is FileItem => c !== null));

      if (matchingChildren.length > 0 || item.name.toLowerCase().includes(q)) {
        return {
          ...item,
          children: matchingChildren
        };
      }
      return null;
    }

    return sortFileItems(sorted.map(matchItem).filter((i): i is FileItem => i !== null));
  }

  const displayedFiles = $derived(sortFileItems(filterTree(files || [], searchQuery)));

  onDestroy(() => {
    if (editorView) {
      editorView.destroy();
      editorView = null;
    }
  });
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
          <FileTreeNode
            {item}
            depth={0}
            {expandedFolders}
            {selectedFile}
            onToggleFolder={toggleFolder}
            onOpenFile={openFile}
            {getFileIcon}
          />
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
            <span class="w-1.5 h-1.5 bg-laser-orange rounded-full animate-ping"></span>
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

      <!-- Right Active File Actions & Save Button -->
      <div class="flex items-center gap-2">
        {#if selectedFile && !isBinary}
          <!-- Search in Code (Ctrl+F) Trigger -->
          <button
            onclick={handleTriggerSearch}
            class="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-[#ECEAE5] border border-[#D0CEC7] text-[#111315] hover:border-[#FF5500] hover:text-[#FF5500] cursor-pointer transition flex items-center gap-1"
            title="Cari kodingan / teks (Ctrl+F)"
          >
            <Search class="w-3 h-3 text-[#FF5500]" />
            <span class="hidden sm:inline">CARI</span>
            <span class="text-[9px] font-mono text-[#8C9097] hidden md:inline">[CTRL+F]</span>
          </button>

          <!-- Goto Line (Ctrl+G) Trigger -->
          <button
            onclick={handleTriggerGotoLine}
            class="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-[#ECEAE5] border border-[#D0CEC7] text-[#111315] hover:border-[#FF5500] hover:text-[#FF5500] cursor-pointer transition flex items-center gap-1"
            title="Lompat ke baris tertentu (Ctrl+G)"
          >
            <Hash class="w-3 h-3 text-[#FF5500]" />
            <span class="hidden sm:inline">BARIS</span>
            <span class="text-[9px] font-mono text-[#8C9097] hidden md:inline">[CTRL+G]</span>
          </button>

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
      <!-- BAY 1: SYNTAX-HIGHLIGHTED CODE EDITOR                    -->
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
                <span class="text-emerald-400">LN {cursorLine}, COL {cursorCol}</span>
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
            <!-- CodeMirror 6 Mount Node with One Dark Theme & Syntax Highlighting -->
            <div
              use:attachEditor
              bind:this={editorHostEl}
              class="relative flex-1 overflow-hidden font-stencil text-xs crt-screen h-full w-full"
            ></div>

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
                Pilih file dari panel Project Blueprint di sisi kiri untuk membuka dan mengedit kode secara langsung dengan syntax highlighting & pencarian interaktif.
              </p>
              <div class="flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono text-[#8C9097] bg-[#14161A] px-3 py-1.5 border border-[#2A2B30]">
                <span class="text-[#FF5500] font-bold">SHORTCUT:</span>
                <span>Ctrl+S (Save)</span>
                <span>•</span>
                <span>Ctrl+F (Cari Kodingan)</span>
                <span>•</span>
                <span>Ctrl+G (Lompat Baris)</span>
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

<style>
  :global(.cm-editor) {
    height: 100% !important;
    outline: none !important;
  }
  :global(.cm-scroller) {
    overflow: auto !important;
    font-family: inherit !important;
  }
</style>
