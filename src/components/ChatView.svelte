<script lang="ts">
  import type { ChatMessage, AppConfig, ChatSessionItem, PersonaItem } from '../types';
  import AvatarView from './AvatarView.svelte';
  import CrtRobotMascot from './CrtRobotMascot.svelte';
  import { renderMarkdown } from '../services/markdown';
  import { api } from '../services/api';
  import { 
    Send, 
    StopCircle, 
    Trash2, 
    Sparkles, 
    Wrench, 
    ArrowUp, 
    Search, 
    Compass, 
    Bug, 
    GitCommit, 
    Check, 
    Copy, 
    ChevronDown, 
    CheckCircle2, 
    FileCode, 
    Terminal, 
    FileEdit, 
    FileText, 
    MessageSquare, 
    Plus,
    Bot,
    Paperclip,
    Image as ImageIcon,
    X,
    Maximize2,
    Loader2,
    Download,
    Mic,
    MicOff,
    Volume2,
    CloudUpload
  } from 'lucide-svelte';

  let {
    messages,
    isBusy,
    config,
    activeSession = null,
    activePersona = null,
    onSendMessage,
    onCancelTask,
    onClearMessages,
    onCreateNewSession,
    onOpenPersonaModal
  }: {
    messages: ChatMessage[];
    isBusy: boolean;
    config: AppConfig | null;
    activeSession?: ChatSessionItem | null;
    activePersona?: PersonaItem | null;
    onSendMessage: (text: string, images?: string[]) => void;
    onCancelTask: () => void;
    onClearMessages: () => void;
    onCreateNewSession?: () => void;
    onOpenPersonaModal?: () => void;
  } = $props();

  interface AttachedImage {
    id: string;
    url: string;
    localPreviewUrl?: string;
    name: string;
    size?: number;
    isUploading?: boolean;
    error?: string;
  }

  let promptInput = $state('');
  let messagesContainer: HTMLDivElement;
  let copiedMessageId = $state<string | null>(null);
  let expandedProcesses = $state<Record<string, boolean>>({});
  let prevStreamingStatus = $state<Record<string, boolean>>({});

  // Image Upload & Lightbox state
  let selectedImages = $state<AttachedImage[]>([]);
  let isUploadingImage = $state(false);
  let zoomImageUrl = $state<string | null>(null);
  let fileInputRef = $state<HTMLInputElement | null>(null);
  let dragCounter = $state(0);
  let isDragging = $derived(dragCounter > 0);

  // Voice Command & Speech-to-Text State
  let isListening = $state(false);
  let isTranscribingVoice = $state(false);
  let recognition: any = null;
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];
  let voiceError = $state<string | null>(null);

  // HUD Cockpit Live Coordinate Tracking
  let hudCoord = $state({ x: 420, y: 180 });
  function handleDeckMouseMove(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    hudCoord = {
      x: Math.max(0, Math.round(e.clientX - rect.left)),
      y: Math.max(0, Math.round(e.clientY - rect.top))
    };
  }

  function toggleVoiceInput() {
    if (isListening) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  }

  function startVoiceInput() {
    voiceError = null;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRec) {
      try {
        recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = config?.voice?.language === 'en' ? 'en-US' : 'id-ID';

        const initialText = promptInput ? promptInput.trim() + ' ' : '';

        recognition.onstart = () => {
          isListening = true;
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          promptInput = initialText + finalTranscript + (interimTranscript ? interimTranscript : '');
        };

        recognition.onerror = (event: any) => {
          console.warn('[Voice Recognition] Error:', event.error);
          if (event.error === 'network' || event.error === 'service-not-allowed') {
            // Google Speech cloud unreachable over LAN/tunnel HTTP. Fallback seamlessly to direct MediaRecorder!
            console.log('[Voice Recognition] Cloud speech unavailable. Switching to direct MediaRecorder fallback...');
            try { recognition.stop(); } catch {}
            recognition = null;
            startMediaRecorderVoice();
            return;
          }
          if (event.error === 'not-allowed') {
            voiceError = 'Izin mikrofon ditolak oleh browser. Buka setelan browser untuk mengizinkan.';
          } else if (event.error !== 'no-speech') {
            voiceError = `Error suara: ${event.error}`;
          }
          stopVoiceInput();
        };

        recognition.onend = () => {
          isListening = false;
        };

        recognition.start();
        return;
      } catch (e: any) {
        console.warn('[Voice Recognition] Native Speech Recognition gagal, beralih ke perekam audio backend:', e);
      }
    }

    // Fallback: MediaRecorder -> backend /api/voice/transcribe
    startMediaRecorderVoice();
  }

  async function startMediaRecorderVoice() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (audioChunks.length === 0) return;
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        isTranscribingVoice = true;
        try {
          const lang = config?.voice?.language || 'id';
          const res = await api.transcribeVoice(audioBlob, lang);
          if (res.success && res.text) {
            promptInput = (promptInput ? promptInput.trim() + ' ' : '') + res.text;
          } else {
            voiceError = res.error || 'Gagal mengenali suara.';
          }
        } catch (err: any) {
          voiceError = err.message || 'Gagal memproses suara.';
        } finally {
          isTranscribingVoice = false;
        }
      };

      mediaRecorder.start();
      isListening = true;
    } catch (err: any) {
      console.error('Microphone access error:', err);
      voiceError = 'Gagal mengakses mikrofon: ' + (err.message || 'Izin diperlukan');
      isListening = false;
    }
  }

  function stopVoiceInput() {
    isListening = false;
    if (recognition) {
      try { recognition.stop(); } catch {}
      recognition = null;
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop(); } catch {}
      mediaRecorder = null;
    }
  }

  function toggleProcess(id: string) {
    const current = isProcessExpanded(id);
    expandedProcesses[id] = !current;
    expandedProcesses = { ...expandedProcesses };
  }

  function isProcessExpanded(id: string, isStreaming?: boolean): boolean {
    if (expandedProcesses[id] !== undefined) {
      return expandedProcesses[id];
    }
    // Default expanded while streaming, collapsible once finished
    return Boolean(isStreaming);
  }

  // Auto-collapse (susutkan) process accordion when AI finishes responding
  $effect(() => {
    for (const msg of messages) {
      if (msg.sender !== 'user') {
        const wasStreaming = prevStreamingStatus[msg.id];
        const isNowStreaming = Boolean(msg.isStreaming);

        if (wasStreaming && !isNowStreaming) {
          // Execution completed: collapse the process panel so user sees answer
          expandedProcesses[msg.id] = false;
          expandedProcesses = { ...expandedProcesses };
        }

        prevStreamingStatus[msg.id] = isNowStreaming;
      }
    }
  });

  // Global listener for inline markdown image click-to-zoom
  $effect(() => {
    (window as any).__zhiEndZoomImage = (url: string) => {
      zoomImageUrl = url;
    };
    return () => {
      delete (window as any).__zhiEndZoomImage;
    };
  });

  // Prevent browser default file open navigation on drag & drop
  $effect(() => {
    const preventDragDefaults = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', preventDragDefaults);
    window.addEventListener('drop', preventDragDefaults);
    return () => {
      window.removeEventListener('dragover', preventDragDefaults);
      window.removeEventListener('drop', preventDragDefaults);
    };
  });

  async function handleCopy(id: string, text: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      copiedMessageId = id;
      setTimeout(() => {
        if (copiedMessageId === id) copiedMessageId = null;
      }, 2000);
    } catch (e) {
      console.error('Failed to copy message:', e);
    }
  }

  async function uploadFiles(files: FileList | File[]) {
    const rawFiles = Array.from(files);
    const imageFiles = rawFiles.filter(f => {
      return f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp|ico)$/i.test(f.name);
    });

    if (imageFiles.length === 0) {
      if (rawFiles.length > 0) {
        alert('Format berkas tidak didukung. Harap pilih gambar (PNG, JPG, WebP, GIF, SVG).');
      }
      return;
    }

    isUploadingImage = true;
    for (const file of imageFiles) {
      const tempId = 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      let localPreviewUrl: string | undefined = undefined;
      try {
        localPreviewUrl = URL.createObjectURL(file);
      } catch {}

      const newImgItem: AttachedImage = {
        id: tempId,
        url: '',
        localPreviewUrl,
        name: file.name,
        size: file.size,
        isUploading: true
      };

      // Tampilkan seketika di antarmuka (zero delay visual feedback)
      selectedImages = [...selectedImages, newImgItem];

      // Upload ke server di latar belakang
      api.uploadChatImage(file).then(res => {
        if (res && res.url) {
          selectedImages = selectedImages.map(item => item.id === tempId ? {
            ...item,
            url: res.url,
            isUploading: false
          } : item);
        } else {
          throw new Error(res?.error || 'Gagal mengunggah gambar');
        }
      }).catch(err => {
        console.error('Upload failed for file:', file.name, err);
        if (localPreviewUrl) {
          try { URL.revokeObjectURL(localPreviewUrl); } catch {}
        }
        selectedImages = selectedImages.filter(item => item.id !== tempId);
        alert(`Gagal mengunggah ${file.name}: ${err.message || 'Terjadi kesalahan'}`);
      }).finally(() => {
        isUploadingImage = selectedImages.some(img => img.isUploading);
      });
    }

    if (fileInputRef) {
      fileInputRef.value = '';
    }
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      uploadFiles(input.files);
    }
  }

  function handlePaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      uploadFiles(imageFiles);
    }
  }

  function handleRootDragEnter(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
      dragCounter++;
    }
  }

  function handleRootDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  function handleRootDragLeave(e: DragEvent) {
    e.preventDefault();
    dragCounter = Math.max(0, dragCounter - 1);
  }

  function handleRootDrop(e: DragEvent) {
    e.preventDefault();
    dragCounter = 0;
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }

  function removeImage(index: number) {
    const target = selectedImages[index];
    if (target?.localPreviewUrl) {
      try { URL.revokeObjectURL(target.localPreviewUrl); } catch {}
    }
    selectedImages = selectedImages.filter((_, i) => i !== index);
    isUploadingImage = selectedImages.some(img => img.isUploading);
  }

  function handleSend() {
    const readyImages = selectedImages.filter(img => img.url && !img.isUploading);
    const hasText = Boolean(promptInput.trim());
    const hasImages = readyImages.length > 0;
    if ((!hasText && !hasImages) || isBusy || isUploadingImage) return;

    const text = promptInput.trim();
    const images = readyImages.map(img => img.url);

    // Bersihkan URL pratinjau lokal dari memori browser
    selectedImages.forEach(img => {
      if (img.localPreviewUrl) {
        try { URL.revokeObjectURL(img.localPreviewUrl); } catch {}
      }
    });

    stopVoiceInput();
    promptInput = '';
    selectedImages = [];
    onSendMessage(text, images);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }

  function setPrompt(val: string) {
    promptInput = val;
    handleSend();
  }

  $effect(() => {
    if (messages.length && messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });

  const suggestions = [
    {
      title: 'Review Codebase',
      desc: 'Analisis arsitektur, potensi bug, dan performa kode',
      icon: Search,
      iconColor: 'text-[#FF5500]',
      prompt: 'Lakukan code review mendalam pada project ini, temukan potensi bug, issue keamanan, atau performa.'
    },
    {
      title: 'Jelaskan Alur Project',
      desc: 'Pelajari struktur modul dan alur logika aplikasi',
      icon: Compass,
      iconColor: 'text-sky-400',
      prompt: 'Jelaskan struktur project ini, fungsi utama dari tiap file, dan arsitekturnya.'
    },
    {
      title: 'Cari & Perbaiki Bug',
      desc: 'Identifikasi error dan perbaiki kode secara autonomous',
      icon: Bug,
      iconColor: 'text-amber-400',
      prompt: 'Cari file yang ada error atau warning, lalu perbaiki bug tersebut dan buat kode lebih clean.'
    },
    {
      title: 'Commit & Push GitHub',
      desc: 'Stage file, buat commit pesan rapi, dan push ke remote',
      icon: GitCommit,
      iconColor: 'text-emerald-400',
      prompt: 'Periksa git status, buat commit pesan yang rapi dan deskriptif, lalu push ke origin GitHub.'
    }
  ];
</script>

<div 
  role="region"
  aria-label="Tampilan Percakapan dan Zona Unggah Berkas"
  class="h-full flex flex-col justify-between overflow-hidden relative"
  ondragenter={handleRootDragEnter}
  ondragover={handleRootDragOver}
  ondragleave={handleRootDragLeave}
  ondrop={handleRootDrop}
>
  <!-- Full-Viewport Drag & Drop Overlay -->
  {#if isDragging}
    <div 
      class="absolute inset-0 z-50 bg-[#F4F3EE]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#FF5500] rounded-none m-2 animate-in fade-in zoom-in-95 duration-150 pointer-events-none select-none shadow-xl"
    >
      <div class="flex flex-col items-center gap-3 text-center pointer-events-none">
        <div class="w-16 h-16 rounded-none bg-[#FF5500]/10 border border-[#FF5500]/30 flex items-center justify-center text-[#FF5500] shadow-md animate-bounce">
          <CloudUpload class="w-8 h-8" />
        </div>
        <div class="flex flex-col gap-1">
          <p class="text-base sm:text-lg font-bold text-[#191B1D] tracking-tight">
            Lepaskan gambar di sini
          </p>
          <p class="text-xs text-[#5C6066] max-w-xs">
            Lampirkan screenshot atau gambar rancangan (PNG, JPG, WebP, GIF, SVG)
          </p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Top Session Bar (Architectural Seam) -->
  <div class="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-[#D0CEC7] bg-[#ECEAE5] z-10 shrink-0 select-none gap-1.5 sm:gap-2 font-tech">
    <div class="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
      <span class="w-2 h-2 bg-[#FF5500] shrink-0"></span>
      <span class="text-xs font-bold text-[#111315] uppercase tracking-wider truncate min-w-0 flex-1">
        {activeSession?.title || 'ACTIVE RUNTIME SESSION'}
      </span>
      <span class="text-[9px] font-stencil px-1.5 py-0.2 rounded-none bg-white border border-[#D0CEC7] text-[#60646C] hidden md:inline shrink-0 font-semibold">
        {activeSession?.workspace_id ? 'WORKSPACE SCOPE' : 'GLOBAL SCOPE'}
      </span>
    </div>

    <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
      <!-- Active Persona Button -->
      <button
        type="button"
        onclick={onOpenPersonaModal}
        class="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-none bg-[#FCFCFA] hover:bg-white border border-[#D0CEC7] hover:border-[#A8A59C] text-[11px] text-[#111315] transition cursor-pointer group shadow-2xs max-w-[125px] xs:max-w-[155px] sm:max-w-[280px]"
        title={`Persona: ${activePersona?.name || 'Default'}${activePersona?.traits ? ` • Sifat: ${activePersona.traits}` : ''}`}
      >
        <AvatarView avatar={activePersona?.avatar} name={activePersona?.name} size="xs" className="rounded-none shrink-0" />
        <span class="font-bold truncate max-w-[65px] xs:max-w-[85px] sm:max-w-[120px] uppercase">{activePersona?.name || 'Default'}</span>
        {#if activePersona?.preferred_model}
          <span 
            class="text-[9px] px-1.5 py-0.2 rounded-none bg-[#E5E3DD] border border-[#D0CEC7] text-[#60646C] font-stencil hidden lg:inline truncate max-w-[110px]" 
            title={`Model: ${activePersona.preferred_model}`}
          >
            {activePersona.preferred_model.replace(/^(openai|grok|qwen|deepseek|gemini):/, '')}
          </span>
        {/if}
        <ChevronDown class="w-3 h-3 text-[#8C9097] group-hover:text-[#FF5500] transition-transform shrink-0" />
      </button>

      <button
        type="button"
        onclick={onCreateNewSession}
        class="btn-hardware flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1 rounded-none text-[11px] text-[#111315] cursor-pointer"
        title="Mulai sesi baru"
      >
        <Plus class="w-3 h-3 text-[#FF5500]" />
        <span class="hidden sm:inline uppercase">New Run</span>
      </button>

      {#if messages.length > 0}
        <button
          type="button"
          onclick={onClearMessages}
          class="flex items-center gap-1 p-1.5 sm:px-2 sm:py-1 rounded-none hover:bg-rose-100 text-[#8C9097] hover:text-rose-600 text-[11px] transition cursor-pointer"
          title="Bersihkan pesan di sesi ini"
        >
          <Trash2 class="w-3 h-3" />
          <span class="hidden sm:inline uppercase">Purge</span>
        </button>
      {/if}
    </div>
  </div>

  <!-- Content Viewport -->
  <div bind:this={messagesContainer} class="flex-1 overflow-y-auto {messages.length === 0 ? 'p-0 flex flex-col' : 'p-4 sm:p-6 pb-28 sm:pb-32 blueprint-cad-ground'}">
    {#if messages.length === 0}
      <!-- Cyber-Industrial Blueprint Grid (CIB-Grid) Full-Bleed Cockpit Deck -->
      <div 
        role="region"
        aria-label="Blueprint Cockpit Deck"
        onmousemove={handleDeckMouseMove}
        class="w-full flex-1 flex flex-col justify-between blueprint-cad-ground p-4 sm:p-6 lg:p-8 relative"
      >
        <!-- 4 Corner Registration Marks (Solid Orange Squares ■) -->
        <span class="reg-dot reg-dot-tl"></span>
        <span class="reg-dot reg-dot-tr"></span>
        <span class="reg-dot reg-dot-bl"></span>
        <span class="reg-dot reg-dot-br"></span>

        <!-- Top Drafting Header Seam -->
        <div class="flex items-center justify-between pb-3 mb-2 border-b border-[#D0CEC7] font-tech text-[11px] text-[#5C6066]">
          <div class="flex items-center gap-2">
            <span class="crosshair-box w-5 h-5 text-[10px] inline-flex items-center justify-center hover:rotate-45 transition-transform duration-300 cursor-crosshair rounded-none"></span>
            <span class="font-bold tracking-wider text-[#111315]">ZHIEND // AUTONOMOUS AGENT RUNTIME</span>
            <span class="text-[#FF5500] font-bold">■ LABS DRAFTING MATRIX</span>
          </div>
          <div class="hidden sm:flex items-center gap-3 font-stencil text-[10px]">
            <span class="text-[#8C9097]">:: SYS_BUS_NOMINAL</span>
            <span class="px-2 py-0.5 rounded-none bg-white border border-[#D0CEC7] font-bold text-[#111315]">REV 2.4</span>
          </div>
        </div>

        <!-- Hero Headline Grid Row (Giant Modular Lettering) -->
        <div class="relative py-2 sm:py-4 border-b border-[#D0CEC7] mb-4 sm:mb-6">
          <h1 class="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-black tracking-tight text-[#111315] select-none uppercase leading-none">
            Z H I E N D &nbsp; C O R E
          </h1>
          <div class="flex items-center gap-2 mt-2 sm:mt-3 font-tech text-xs sm:text-sm font-bold text-[#FF5500] tracking-wider uppercase">
            <span class="w-2.5 h-2.5 bg-[#FF5500] inline-block"></span>
            <span>BACKING AUTONOMOUS ENGINEERING</span>
          </div>
        </div>

        <!-- Main 3-Column Cockpit Deck -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center flex-1 my-auto">
          
          <!-- Left Cell (Col 1-5): Mission Brief & Primary CTA (ChainGPT Labs Style: Flat Orange Capsule) -->
          <div class="lg:col-span-5 flex flex-col justify-between h-full gap-4 py-2">
            <div>
              <p class="text-xs sm:text-sm text-[#444850] font-grotesk leading-relaxed">
                Backing autonomous engineering workflows — transforming natural language prompts into production-grade codebase architecture, automated tests, and git commits.
              </p>
              <div class="mt-4 flex flex-col gap-1.5 font-stencil text-[11px] text-[#60646C]">
                <div class="flex items-center gap-2">
                  <span class="text-[#FF5500]">▹</span>
                  <span>ACTIVE PERSONA: <strong class="text-[#111315]">{activePersona?.name || 'ANTIGRAVITY'}</strong></span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[#FF5500]">▹</span>
                  <span>MODEL: <strong class="text-[#111315]">{activePersona?.preferred_model || 'DEFAULT RUNTIME'}</strong></span>
                </div>
              </div>
            </div>

            <div>
              <button
                type="button"
                onclick={() => setPrompt('Jelaskan struktur arsitektur codebase ini dan status modul utamanya.')}
                class="btn-safety px-6 py-2.5 rounded-none text-white text-xs sm:text-sm font-tech font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2.5 w-fit active:scale-95 shadow-none"
              >
                <Sparkles class="w-4 h-4" />
                <span>INITIALIZE RUNTIME</span>
              </button>
            </div>
          </div>

          <!-- Center Cell (Col 6-8): Retro-Futuristic CRT Robot Mascot -->
          <div class="lg:col-span-4 flex flex-col items-center justify-center py-2">
            <CrtRobotMascot 
              isBusy={isBusy} 
              isListening={isListening} 
              hasError={Boolean(voiceError)} 
              size="lg" 
            />
            <div class="mt-4 flex items-center gap-1.5 font-pixel text-[10px] text-[#5C6066]">
              <span class="text-[#FF5500]">::</span>
              <span>STATUS: {isBusy ? 'EXECUTING WORKFLOW' : (isListening ? 'LISTENING AUDIO' : 'STATIONARY NOMINAL')}</span>
            </div>
          </div>

          <!-- Right Cell (Col 9-12): Viewfinder Telemetry Box (Sharp 90° Frame) -->
          <div class="lg:col-span-3">
            <div class="viewfinder-box p-4 rounded-none text-white font-stencil flex flex-col gap-3 shadow-xl relative overflow-hidden group border border-white/10">
              <!-- Animated Scanning Wave Overlay -->
              <div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FF5500]/10 to-transparent pointer-events-none animate-pulse"></div>

              <div class="flex items-center justify-between text-[10px] text-[#8C9097] border-b border-white/10 pb-2 relative z-10">
                <span class="text-[#FFAA00] font-tech font-bold tracking-wider">┌ RETICLE [{hudCoord.x.toString().padStart(3, '0')},{hudCoord.y.toString().padStart(3, '0')}] ┐</span>
                <span class="w-2 h-2 rounded-none bg-emerald-400 animate-pulse"></span>
              </div>
              
              <div class="space-y-2 text-[11px] relative z-10">
                <div class="flex justify-between items-center text-zinc-400">
                  <span>BUS:</span>
                  <span class="text-emerald-400 font-bold">ONLINE</span>
                </div>
                <div class="flex justify-between items-center text-zinc-400">
                  <span>BRANCH:</span>
                  <span class="text-zinc-200 truncate max-w-[100px]">{config?.activeProject?.split(/\\|\//).pop() || 'MAIN'}</span>
                </div>
                <div class="flex justify-between items-center text-zinc-400">
                  <span>SANDBOX:</span>
                  <span class="text-[#FFAA00]">ISOLATED</span>
                </div>
                <div class="flex justify-between items-center text-zinc-400">
                  <span>LATENCY:</span>
                  <span class="text-zinc-200">24ms</span>
                </div>
              </div>

              <div class="mt-1 pt-2 border-t border-white/10 flex items-center justify-between text-[9px] text-zinc-500 relative z-10">
                <span>NODE: TX-3888</span>
                <span class="text-[#FF5500] font-tech tracking-wider group-hover:text-emerald-400 transition-colors">└ TARGET LOCKED ┘</span>
              </div>
            </div>
          </div>

        </div>

        <!-- Bottom 4-Bay Partner-Style Macro Strip (Exact Chainlink, TRON, BNB, OKX Sharp Cell Architecture) -->
        <div class="mt-6 pt-4 border-t border-[#D0CEC7] w-full">
          <div class="flex items-center justify-between mb-2.5 font-tech text-[10px] text-[#5C6066]">
            <span class="font-bold tracking-wider uppercase text-[#111315]">OUR DIRECT DISPATCH BAYS // SOUNDBANK:</span>
            <span class="hidden sm:inline text-[#8C9097]">SELECT BAY TO DISPATCH</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-[#D0CEC7] bg-[#FCFCFA] rounded-none divide-y sm:divide-y-0 sm:divide-x divide-[#D0CEC7] shadow-xs">
            {#each suggestions as s, idx}
              <button
                type="button"
                onclick={() => setPrompt(s.prompt)}
                class="p-4 bg-[#FCFCFA] hover:bg-[#ECEAE5] active:bg-[#E5E3DD] active:scale-[0.99] transition-all text-left cursor-pointer group flex flex-col justify-between gap-3 rounded-none relative"
              >
                <div class="flex items-center justify-between w-full">
                  <span class="text-[9px] font-stencil font-bold px-1.5 py-0.5 rounded-none bg-[#E5E3DD] group-hover:bg-[#FF5500] text-[#5C6066] group-hover:text-white border border-[#D0CEC7] transition">
                    BAY 0{idx + 1}
                  </span>
                  <s.icon class="w-3.5 h-3.5 text-[#FF5500] group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <div class="text-xs font-bold text-[#111315] group-hover:text-[#FF5500] transition-colors font-tech uppercase tracking-wide">
                    {s.title}
                  </div>
                  <p class="text-[10px] text-[#5C6066] font-grotesk line-clamp-1 mt-0.5">{s.desc}</p>
                </div>
              </button>
            {/each}
          </div>
        </div>

        <!-- Keyboard Shortcut Strip -->
        <div class="mt-3 flex items-center justify-between text-[10px] font-stencil text-[#8C9097]">
          <div class="flex items-center gap-1.5">
            <span>SHORTCUT:</span>
            <kbd class="px-1.5 py-0.5 rounded-none bg-white border border-[#D0CEC7] text-[#111315] font-bold">Ctrl + Enter</kbd>
            <span>TO SEND PROMPT</span>
          </div>
          <div class="hidden sm:flex items-center gap-2">
            <span>COMMANDS:</span>
            <span class="text-[#FF5500]">!code</span>
            <span class="text-[#FF5500]">!git</span>
            <span class="text-[#FF5500]">!push</span>
          </div>
        </div>

      </div>
    {:else}
      <!-- Active Messages Stream -->
      <div class="max-w-3xl mx-auto flex flex-col gap-5 sm:gap-6 pb-20 sm:pb-24">
        {#each messages as msg (msg.id)}
          {#if msg.sender === 'user'}
            <div class="flex flex-col gap-1.5 items-end group">
              <!-- Header Username -->
              <div class="flex items-center text-[10px] font-stencil text-[#60646C] px-1 font-bold">
                <span>■ USER TRANSMISSION</span>
              </div>

              <!-- User Bubble Content (Architectural Alabaster Well) -->
              <div class="relative bg-[#FCFCFA] border border-[#D0CEC7] rounded-none p-3.5 sm:p-4 text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap font-grotesk text-[#111315] max-w-[92%] sm:max-w-[85%] shadow-2xs">
                <span class="reg-dot reg-dot-tr"></span>
                {msg.text}
              </div>

              <!-- User Attached Images Gallery -->
              {#if msg.images && msg.images.length > 0}
                <div class="flex flex-wrap gap-2 max-w-[85%] justify-end mt-1">
                  {#each msg.images as imgUrl}
                    <button
                      type="button"
                      onclick={() => zoomImageUrl = imgUrl}
                      class="group/thumb relative rounded-none overflow-hidden border border-[#D0CEC7] hover:border-[#A8A59C] shadow-2xs bg-[#ECEAE5] cursor-zoom-in max-w-[220px] max-h-[160px] transition"
                    >
                      <img src={imgUrl} alt="Lampiran" class="w-full h-full object-cover group-hover/thumb:scale-105 transition duration-200" />
                      <div class="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition">
                        <Maximize2 class="w-4 h-4 text-white drop-shadow" />
                      </div>
                    </button>
                  {/each}
                </div>
              {/if}

              <!-- Action Toolbar for User Bubble -->
              {#if msg.text && !msg.isStreaming}
                <div class="flex items-center gap-1 px-1 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 justify-end">
                  <button
                    type="button"
                    onclick={() => handleCopy(msg.id, msg.text)}
                    class="flex items-center gap-1 text-[11px] text-[#60646C] hover:text-[#111315] px-1.5 py-0.5 rounded-none hover:bg-[#E5E3DD] transition cursor-pointer font-stencil"
                    title="Salin teks"
                  >
                    {#if copiedMessageId === msg.id}
                      <Check class="w-3 h-3 text-emerald-600" />
                      <span class="text-emerald-700 text-[10px] font-bold">TERKOPY</span>
                    {:else}
                      <Copy class="w-3 h-3" />
                      <span class="text-[10px]">SALIN</span>
                    {/if}
                  </button>
                </div>
              {/if}
            </div>
          {:else}
            <!-- Agent Message with Custom Avatar & Traits -->
            <div class="flex items-start gap-2.5 sm:gap-3 group w-full">
              <!-- Avatar Persona -->
              <div class="shrink-0 mt-0.5">
                <AvatarView
                  avatar={activePersona?.avatar}
                  name={activePersona?.name}
                  size="md"
                  className="rounded-none border border-[#D0CEC7] shadow-2xs"
                />
              </div>

              <div class="flex-1 flex flex-col gap-1.5 min-w-0 max-w-[96%] sm:max-w-[92%]">
                <!-- Header Username, Traits & Model -->
                <div class="flex items-center gap-2 text-[10px] font-tech text-[#60646C] px-1 min-w-0">
                  <span class="font-bold text-[#111315] uppercase tracking-wider truncate shrink-0 max-w-[120px] sm:max-w-[200px]" title={activePersona?.name || 'zhiEnd Assistant'}>
                    :: {activePersona?.name || 'ZHIEND CORE'}
                  </span>
                  {#if activePersona?.traits}
                    <span 
                      class="text-[9px] px-2 py-0.5 rounded-none bg-[#E5E3DD] border border-[#D0CEC7] text-[#60646C] font-stencil truncate max-w-[140px] sm:max-w-[280px] md:max-w-[360px]"
                      title={`Sifat & Karakteristik: ${activePersona.traits}`}
                    >
                      {activePersona.traits}
                    </span>
                  {/if}
                  {#if activePersona?.preferred_model}
                    <span class="text-[9px] text-[#8C9097] font-stencil hidden md:inline shrink-0 font-medium">
                      [{activePersona.preferred_model}]
                    </span>
                  {/if}
                </div>

                <!-- Agent Bubble Content (Architectural Blueprint Log Panel) -->
                <div class="relative bg-[#FCFCFA] border border-[#D0CEC7] rounded-none p-3.5 sm:p-4 text-[#111315] text-xs leading-relaxed shadow-xs font-grotesk">
                  <span class="reg-dot reg-dot-tl"></span>
                  <!-- Professional Execution & Reasoning Accordion -->
                  {#if (msg.steps && msg.steps.length > 0) || (msg.tools && msg.tools.length > 0) || msg.thought || msg.isStreaming}
                    {@const isExp = isProcessExpanded(msg.id, msg.isStreaming)}
                    <div class="mb-3 rounded-none border transition-all duration-200 overflow-hidden {isExp ? 'border-[#D0CEC7] bg-[#E5E3DD]/40' : 'border-[#D0CEC7] bg-[#E5E3DD]/20 hover:border-[#A8A59C]'} font-tech">
                      <!-- Accordion Header Button -->
                      <button
                        type="button"
                        onclick={() => toggleProcess(msg.id)}
                        class="w-full flex items-center justify-between px-3 {isExp ? 'py-2 bg-[#E5E3DD]' : 'py-1.5 bg-[#E5E3DD]/60'} hover:bg-[#E5E3DD] transition-all cursor-pointer text-left select-none"
                      >
                        <div class="flex items-center gap-2 min-w-0">
                          {#if msg.isStreaming}
                            <div class="relative flex items-center justify-center w-2.5 h-2.5 shrink-0">
                              <span class="animate-ping absolute inline-flex h-full w-full rounded-none bg-[#FF5500] opacity-60"></span>
                              <span class="relative inline-flex rounded-none h-1.5 w-1.5 bg-[#FF5500]"></span>
                            </div>
                            <span class="text-xs font-bold text-[#FF5500] uppercase tracking-wider">
                              EXECUTING WORKFLOW...
                            </span>
                          {:else}
                            <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span class="text-xs font-bold text-[#111315] uppercase tracking-wider">
                              EXECUTION LOGS COMPLETED
                            </span>
                          {/if}
                          <span class="text-[9px] font-stencil text-[#60646C] px-1.5 py-0.2 rounded-none bg-white border border-[#D0CEC7] font-bold">
                            {(msg.steps?.length || msg.tools?.length || 1)} TRACES
                          </span>
                        </div>

                        <div class="flex items-center gap-1.5 text-[#60646C]">
                          <span class="text-[10px] font-stencil uppercase">
                            {isExp ? 'HIDE' : 'DETAIL'}
                          </span>
                          <ChevronDown class="w-3.5 h-3.5 text-[#60646C] transition-transform duration-200 {isExp ? 'rotate-180' : ''}" />
                        </div>
                      </button>

                      <!-- Accordion Body -->
                      {#if isExp}
                        <div class="p-3 border-t border-[#D0CEC7] flex flex-col gap-2.5 text-xs bg-[#FCFCFA] animate-in fade-in duration-150">
                          <!-- Reasoning / Thinking Box -->
                          {#if msg.thought}
                            <div class="p-2.5 rounded-none bg-amber-50/70 border border-amber-300 text-amber-950 italic text-[11px] leading-relaxed flex gap-2">
                              <Sparkles class="w-3.5 h-3.5 text-[#FF5500] shrink-0 mt-0.5" />
                              <div class="flex flex-col gap-0.5">
                                <span class="text-[10px] font-bold text-[#C26D2B] not-italic font-mono uppercase tracking-wider">
                                  :: Reasoning & Analisis Matrix
                                </span>
                                <span>{msg.thought}</span>
                              </div>
                            </div>
                          {/if}

                          <!-- Detailed Step Timeline -->
                          {#if msg.steps && msg.steps.length > 0}
                            <div class="space-y-1.5 pl-1 border-l-2 border-[#FF5500]/30 ml-2">
                              {#each msg.steps as st}
                                <div class="flex items-start gap-2.5 text-[#191B1D] text-xs py-0.5 pl-2">
                                  <span class="w-1.5 h-1.5 {st.type === 'edit' || st.type === 'write' ? 'bg-[#FF5500]' : 'bg-[#E5A91A]'} mt-1.5 shrink-0"></span>

                                  <div class="flex-1 flex flex-col min-w-0">
                                    <div class="flex items-center gap-1.5 flex-wrap">
                                      <span class="font-bold text-[#191B1D]">{st.title}</span>

                                      {#if st.file}
                                        <span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-none bg-[#E9E7E0] border border-[#C8C5BC] text-[10px] font-mono text-[#191B1D] font-semibold">
                                          <FileCode class="w-2.5 h-2.5 text-[#FF5500]" /> {st.file}
                                        </span>
                                      {/if}

                                      {#if st.lines}
                                        <span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-none bg-amber-100 border border-amber-300 text-[10px] font-mono text-amber-900 font-bold">
                                          {st.lines}
                                        </span>
                                      {/if}

                                      {#if st.command}
                                        <code class="px-1.5 py-0.2 rounded-none bg-[#E9E7E0] border border-[#C8C5BC] text-[10px] font-mono text-[#191B1D] max-w-sm truncate font-semibold">
                                          {st.command}
                                        </code>
                                      {/if}

                                      {#if st.repeatCount && st.repeatCount > 1}
                                        <span class="inline-flex items-center px-1.5 py-0.2 rounded-none bg-[#FF5500]/15 border border-[#FF5500]/30 text-[9px] font-mono font-bold text-[#FF5500]" title={`Perintah dijalankan ${st.repeatCount} kali`}>
                                          ×{st.repeatCount}
                                        </span>
                                      {/if}
                                    </div>

                                    {#if st.instruction}
                                      <p class="text-[11px] text-[#5C6066] italic mt-0.5">{st.instruction}</p>
                                    {:else if st.detail && st.detail !== st.command}
                                      <p class="text-[11px] text-[#8C9097] mt-0.5">{st.detail}</p>
                                    {/if}
                                  </div>
                                </div>
                              {/each}

                              <!-- Active in-progress indicator while streaming -->
                              {#if msg.isStreaming}
                                <div class="flex items-center gap-2 text-[#111315] text-[11px] py-1 pl-2 font-tech">
                                  <span class="w-1.5 h-1.5 bg-[#FF5500] animate-retro-cursor shrink-0"></span>
                                  <span class="font-stencil text-[#FF5500] font-bold uppercase tracking-wider">:: EXECUTING SUBSYSTEM INSTRUCTION...</span>
                                </div>
                              {/if}
                            </div>
                          {:else if msg.tools && msg.tools.length > 0}
                            <div class="flex flex-wrap gap-1.5">
                              {#each msg.tools as tool}
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-none bg-[#E9E7E0] border border-[#C8C5BC] text-[10px] font-mono text-[#191B1D] font-semibold">
                                  <Wrench class="w-2.5 h-2.5 text-[#FF5500]" /> {tool}
                                </span>
                              {/each}
                            </div>
                          {:else if msg.isStreaming}
                            <!-- Minimalist Retro-Futuristic Telemetry Stream Loader -->
                            <div class="flex items-center justify-between gap-3 px-3 py-2 bg-[#FCFCFA] border border-[#D0CEC7] font-tech text-xs rounded-none shadow-2xs">
                              <div class="flex items-center gap-2 min-w-0">
                                <span class="w-2 h-2 bg-[#FF5500] animate-pulse shrink-0"></span>
                                <span class="font-stencil text-[11px] text-[#111315] font-semibold tracking-wider uppercase truncate">
                                  :: ANALYZING TELEMETRY & REASONING MATRIX
                                </span>
                                <span class="inline-block w-1.5 h-3.5 bg-[#FF5500] animate-retro-cursor shrink-0"></span>
                              </div>

                              <div class="flex items-center gap-2 font-stencil text-[10px] text-[#60646C] shrink-0">
                                <span class="w-1.5 h-1.5 bg-emerald-500 animate-pulse"></span>
                                <span class="hidden sm:inline">PROCESSING</span>
                              </div>
                            </div>
                          {/if}
                        </div>
                      {/if}
                    </div>
                  {/if}

                  <!-- Main Message Content -->
                  <div class="prose-chat font-sans text-[13px] leading-relaxed text-[#191B1D]">
                    {@html renderMarkdown(msg.text)}
                    {#if msg.isStreaming && msg.text}
                      <span class="inline-block w-2 h-4 bg-[#FF5500] animate-retro-cursor align-middle ml-1"></span>
                    {/if}
                  </div>

                  <!-- Agent Attached Images Gallery (if any) -->
                  {#if msg.images && msg.images.length > 0}
                    <div class="flex flex-wrap gap-2 mt-2 pt-2 border-t border-[#C8C5BC]">
                      {#each msg.images as imgUrl}
                        <button
                          type="button"
                          onclick={() => zoomImageUrl = imgUrl}
                          class="group/thumb relative rounded-none overflow-hidden border border-[#C8C5BC] hover:border-[#A8A59C] shadow-sm bg-[#E9E7E0] cursor-zoom-in max-w-[220px] max-h-[160px] transition"
                        >
                          <img src={imgUrl} alt="Lampiran" class="w-full h-full object-cover group-hover/thumb:scale-105 transition duration-200" />
                          <div class="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition">
                            <Maximize2 class="w-4 h-4 text-white drop-shadow" />
                          </div>
                        </button>
                      {/each}
                    </div>
                  {/if}

                </div>

                <!-- Action Toolbar OUTSIDE & UNDER the bubble - Only Appears on Hover -->
                {#if msg.text && !msg.isStreaming}
                  <div class="flex items-center gap-1 px-1 text-[#5C6066] opacity-0 group-hover:opacity-100 transition-opacity duration-150 justify-start">
                    <button
                      type="button"
                      onclick={() => handleCopy(msg.id, msg.text)}
                      class="flex items-center gap-1 text-[11px] text-[#5C6066] hover:text-[#191B1D] px-1.5 py-0.5 rounded-none hover:bg-[#DEDBD2] transition cursor-pointer"
                      title="Salin teks"
                    >
                      {#if copiedMessageId === msg.id}
                        <Check class="w-3 h-3 text-emerald-600" />
                        <span class="text-emerald-700 text-[10px] font-bold">Tersalin!</span>
                      {:else}
                        <Copy class="w-3 h-3 text-[#5C6066]" />
                        <span class="text-[10px]">Salin</span>
                      {/if}
                    </button>
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>

  <!-- Anchored Hardware Console Deck (Bottom Command Bar) -->
  <div class="w-full bg-[#E5E3DD] border-t border-[#D0CEC7] p-2 sm:p-3 shrink-0 z-20 font-tech">
    <div 
      role="region"
      aria-label="Konsol Input Hardware"
      class="max-w-4xl mx-auto flex flex-col gap-2 {isDragging ? '' : ''}"
      onpaste={handlePaste}
    >
      <!-- Console Telemetry Status Strip -->
      <div class="flex items-center justify-between text-[10px] font-stencil text-[#60646C] px-1">
        <div class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 bg-[#FF5500]"></span>
          <span class="text-[#111315] font-bold uppercase tracking-wider">CONSOLE BUS [TX-3888]</span>
          <span class="text-[#8C9097] hidden sm:inline">:: CHANNEL READY</span>
        </div>
        <div class="flex items-center gap-2">
          <span>SHORTCUT:</span>
          <kbd class="px-1 py-0.2 rounded-none bg-[#FCFCFA] border border-[#D0CEC7] text-[#111315] font-bold">Ctrl + Enter</kbd>
        </div>
      </div>

      <!-- Recessed Mechanical Input Well -->
      <div class="relative bg-[#FCFCFA] border border-[#D0CEC7] rounded-none p-2 shadow-2xs transition">
        <!-- 4 Corner Registration Marks -->
        <span class="reg-dot reg-dot-tl"></span>
        <span class="reg-dot reg-dot-tr"></span>
        <span class="reg-dot reg-dot-bl"></span>
        <span class="reg-dot reg-dot-br"></span>

        <!-- Uploaded Image Chips Preview -->
        {#if selectedImages.length > 0}
          <div class="flex flex-wrap gap-2 px-1 pt-0.5 pb-1.5 border-b border-[#D0CEC7]/60 mb-2">
            {#each selectedImages as img, idx}
              <div class="relative group/chip flex items-center gap-1.5 px-2.5 py-1 rounded-none bg-[#ECEAE5] border border-[#D0CEC7] text-xs text-[#111315] shadow-2xs animate-in fade-in zoom-in-95 duration-150">
                <div class="relative w-6 h-6 shrink-0 rounded-none overflow-hidden border border-[#D0CEC7] bg-[#DEDBD2]">
                  <img src={img.localPreviewUrl || img.url} alt={img.name} class="w-full h-full object-cover" />
                  {#if img.isUploading}
                    <div class="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
                      <Loader2 class="w-3 h-3 animate-spin text-[#FF5500]" />
                    </div>
                  {/if}
                </div>
                <div class="flex flex-col min-w-0 pr-1">
                  <span class="max-w-[120px] truncate text-[11px] text-[#111315] font-bold">{img.name}</span>
                  {#if img.isUploading}
                    <span class="text-[9px] text-[#FF5500] font-stencil animate-pulse leading-none">UPLOADING...</span>
                  {/if}
                </div>
                <button
                  type="button"
                  onclick={() => removeImage(idx)}
                  class="p-0.5 rounded-none hover:bg-rose-100 text-[#8C9097] hover:text-rose-600 transition cursor-pointer shrink-0"
                  title="Hapus gambar"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>
            {/each}
          </div>
        {/if}

        <!-- Voice Listening / Error Banner -->
        {#if isListening}
          <div class="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-none bg-rose-50 border border-rose-300 text-[11px] text-rose-900 animate-in fade-in font-stencil">
            <span class="w-2 h-2 rounded-none bg-rose-500 animate-ping shrink-0"></span>
            <span class="font-bold truncate">RECORDING AUDIO INTAKE... (KLIK MIC UNTUK SELESAI)</span>
            <button type="button" onclick={stopVoiceInput} class="ml-auto text-xs px-2 py-0.5 rounded-none bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold">SELESAI</button>
          </div>
        {:else if isTranscribingVoice}
          <div class="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-none bg-orange-50 border border-orange-300 text-[11px] text-[#FF5500] animate-in fade-in font-stencil font-semibold">
            <Loader2 class="w-3.5 h-3.5 animate-spin text-[#FF5500] shrink-0" />
            <span>TRANSCRIBING AUDIO WAVEFORM...</span>
          </div>
        {:else if voiceError}
          <div class="flex items-center justify-between gap-2 px-3 py-1.5 mb-2 rounded-none bg-amber-50 border border-amber-300 text-[11px] text-amber-900 animate-in fade-in font-stencil">
            <span class="truncate">⚠️ {voiceError}</span>
            <button type="button" onclick={() => voiceError = null} class="p-0.5 hover:text-black shrink-0"><X class="w-3 h-3" /></button>
          </div>
        {/if}

        <div class="flex items-end gap-1.5 sm:gap-2 w-full pt-1">
          <!-- Attachment Button -->
          <button
            type="button"
            onclick={() => fileInputRef?.click()}
            disabled={isBusy || isUploadingImage || isListening}
            class="p-2 rounded-none text-[#60646C] hover:text-[#111315] hover:bg-[#E5E3DD] transition cursor-pointer shrink-0 disabled:opacity-40"
            title="Lampirkan Gambar (atau paste / drag & drop)"
          >
            {#if isUploadingImage}
              <Loader2 class="w-4 h-4 animate-spin text-[#FF5500]" />
            {:else}
              <Paperclip class="w-4 h-4" />
            {/if}
          </button>

          <!-- Voice Command Microphone Button -->
          <button
            type="button"
            onclick={toggleVoiceInput}
            disabled={isBusy || isUploadingImage || isTranscribingVoice}
            class="relative p-2 rounded-none transition cursor-pointer shrink-0 disabled:opacity-40 {isListening ? 'bg-rose-100 text-rose-600 border border-rose-300' : (isTranscribingVoice ? 'bg-orange-100 text-[#FF5500] border border-orange-300 animate-pulse' : 'text-[#60646C] hover:text-rose-600 hover:bg-[#E5E3DD]')}"
            title={isListening ? 'Klik untuk selesai bicara' : (isTranscribingVoice ? 'Mentranskripsi suara...' : 'Perintah Suara (Speech-to-Text)')}
          >
            {#if isTranscribingVoice}
              <Loader2 class="w-4 h-4 animate-spin text-[#FF5500]" />
            {:else if isListening}
              <Mic class="w-4 h-4 text-rose-600 animate-pulse" />
              <span class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-none bg-rose-500 animate-ping"></span>
            {:else}
              <Mic class="w-4 h-4" />
            {/if}
          </button>

          <textarea
            bind:value={promptInput}
            onkeydown={handleKeyDown}
            placeholder={isListening ? "Mendengarkan suara Anda..." : (isTranscribingVoice ? "Mentranskripsi suara..." : "Tulis instruksi coding atau perintah terminal (misal: npx prisma..., git status, !npm i)...")}
            rows="1"
            class="flex-1 bg-transparent text-xs sm:text-sm text-[#111315] placeholder-[#8C9097] outline-none resize-none px-2 py-1.5 leading-relaxed font-grotesk"
          ></textarea>

          <div class="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {#if isBusy}
              <button
                onclick={onCancelTask}
                class="p-2 rounded-none bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300 transition cursor-pointer"
                title="Hentikan Task"
              >
                <StopCircle class="w-4 h-4" />
              </button>
            {/if}

            <button
              onclick={onClearMessages}
              class="hidden sm:flex p-2 rounded-none hover:bg-[#E5E3DD] text-[#8C9097] hover:text-[#111315] transition cursor-pointer"
              title="Bersihkan Percakapan"
            >
              <Trash2 class="w-4 h-4" />
            </button>

            <button
              onclick={handleSend}
              disabled={isBusy || isUploadingImage || (!promptInput.trim() && selectedImages.length === 0)}
              class="btn-safety px-5 py-2 rounded-none text-white font-tech font-bold uppercase tracking-wider text-xs transition cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-none"
            >
              <span>DISPATCH</span>
              <ArrowUp class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Hidden File Input for Image Uploads -->
  <input
    type="file"
    accept="image/*"
    multiple
    bind:this={fileInputRef}
    onchange={handleFileSelect}
    class="hidden"
  />

  <!-- Lightbox Modal for Zooming Images -->
  {#if zoomImageUrl}
    {@const fileName = decodeURIComponent((zoomImageUrl || '').split('/').pop()?.split('?')[0] || 'image.png')}
    {@const downloadHref = zoomImageUrl ? (zoomImageUrl.includes('/api/media/file') ? (zoomImageUrl.includes('?') ? `${zoomImageUrl}&download=1` : `${zoomImageUrl}?download=1`) : zoomImageUrl) : '#'}
    <div 
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onclick={() => zoomImageUrl = null}
      onkeydown={(e) => { if (e.key === 'Escape') zoomImageUrl = null; }}
    >
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div 
        role="document"
        class="relative max-w-4xl max-h-[90vh] bg-[#FCFCFA] border-2 border-[#D0CEC7] rounded-none overflow-hidden shadow-2xl flex flex-col font-sans"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
      >
        <!-- 4 Corner Registration Marks (Solid Orange Squares ■) -->
        <span class="reg-dot reg-dot-tl"></span>
        <span class="reg-dot reg-dot-tr"></span>
        <span class="reg-dot reg-dot-bl"></span>
        <span class="reg-dot reg-dot-br"></span>

        <!-- Modal Header -->
        <div class="flex items-center justify-between px-4 py-2.5 border-b border-[#D0CEC7] bg-[#E5E3DD] font-tech">
          <div class="flex items-center gap-2 max-w-md truncate">
            <span class="text-[#FF5500] font-bold">::</span>
            <span class="text-xs font-bold font-stencil text-[#111315] truncate uppercase" title={fileName}>{fileName}</span>
          </div>
          <div class="flex items-center gap-2">
            <a
              href={downloadHref}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none btn-safety text-white font-tech font-bold uppercase tracking-wider text-xs transition cursor-pointer active:scale-95 shadow-none"
              title="Download gambar ini ke perangkat Anda"
            >
              <Download class="w-3.5 h-3.5" />
              <span>DOWNLOAD</span>
            </a>
            <button
              type="button"
              onclick={() => zoomImageUrl = null}
              class="p-1.5 rounded-none hover:bg-[#D0CEC7]/60 text-[#5C6066] hover:text-[#111315] transition cursor-pointer"
              title="Tutup"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>
        <!-- Modal Image -->
        <div class="p-2 overflow-auto flex items-center justify-center max-h-[calc(90vh-50px)]">
          <img src={zoomImageUrl} alt="Pratinjau Gambar" class="max-w-full max-h-full object-contain rounded-none" />
        </div>
      </div>
    </div>
  {/if}
</div>
