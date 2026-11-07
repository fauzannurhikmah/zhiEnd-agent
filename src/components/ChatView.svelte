<script lang="ts">
  import type { ChatMessage, AppConfig, ChatSessionItem, PersonaItem } from '../types';
  import AvatarView from './AvatarView.svelte';
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
      class="absolute inset-0 z-50 bg-[#F4F3EE]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#FF5500] rounded-2xl m-2 animate-in fade-in zoom-in-95 duration-150 pointer-events-none select-none shadow-xl"
    >
      <div class="flex flex-col items-center gap-3 text-center pointer-events-none">
        <div class="w-16 h-16 rounded-2xl bg-[#FF5500]/10 border border-[#FF5500]/30 flex items-center justify-center text-[#FF5500] shadow-md animate-bounce">
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

  <!-- Top Session Bar -->
  <div class="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2 border-b border-[#C8C5BC] bg-[#E9E7E0] z-10 shrink-0 select-none gap-1.5 sm:gap-2">
    <div class="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
      <MessageSquare class="w-3.5 h-3.5 text-[#FF5500] shrink-0" />
      <span class="text-xs font-bold text-[#191B1D] truncate min-w-0 flex-1">
        {activeSession?.title || 'Diskusi Aktif'}
      </span>
      <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#DEDBD2] border border-[#C8C5BC] text-[#5C6066] hidden md:inline shrink-0 font-semibold">
        {activeSession?.workspace_id ? 'Workspace' : 'Global'}
      </span>
    </div>

    <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
      <!-- Active Persona Button -->
      <button
        type="button"
        onclick={onOpenPersonaModal}
        class="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 rounded-xl bg-[#FCFCFA] hover:bg-white border border-[#C8C5BC] hover:border-[#FF5500] text-[11px] text-[#191B1D] transition cursor-pointer group shadow-2xs max-w-[125px] xs:max-w-[155px] sm:max-w-[280px]"
        title={`Persona: ${activePersona?.name || 'Default'}${activePersona?.traits ? ` • Sifat: ${activePersona.traits}` : ''}`}
      >
        <AvatarView avatar={activePersona?.avatar} name={activePersona?.name} size="xs" className="rounded-md shrink-0" />
        <span class="font-bold truncate max-w-[65px] xs:max-w-[85px] sm:max-w-[120px]">{activePersona?.name || 'Default Persona'}</span>
        {#if activePersona?.preferred_model}
          <span 
            class="text-[9px] px-1.5 py-0.2 rounded bg-[#DEDBD2] border border-[#C8C5BC] text-[#5C6066] font-mono hidden lg:inline truncate max-w-[110px]" 
            title={`Model: ${activePersona.preferred_model}`}
          >
            {activePersona.preferred_model.replace(/^(openai|grok|qwen|deepseek|gemini):/, '')}
          </span>
        {/if}
        {#if activePersona?.traits}
          <span 
            class="text-[9px] px-1.5 py-0.2 rounded bg-[#DEDBD2] border border-[#C8C5BC] text-[#5C6066] font-sans truncate max-w-[110px]" 
            title={activePersona.traits}
          >
            {activePersona.traits}
          </span>
        {/if}
        <ChevronDown class="w-3 h-3 text-[#8C9097] group-hover:text-[#FF5500] transition-transform shrink-0" />
      </button>

      <button
        type="button"
        onclick={onCreateNewSession}
        class="btn-hardware flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] text-[#191B1D] cursor-pointer"
        title="Mulai sesi baru"
      >
        <Plus class="w-3 h-3 text-[#FF5500]" />
        <span class="hidden sm:inline">Chat Baru</span>
      </button>

      {#if messages.length > 0}
        <button
          type="button"
          onclick={onClearMessages}
          class="flex items-center gap-1 p-1.5 sm:px-2 sm:py-1 rounded-lg hover:bg-rose-100 text-[#8C9097] hover:text-rose-600 text-[11px] transition cursor-pointer"
          title="Bersihkan pesan di sesi ini"
        >
          <Trash2 class="w-3 h-3" />
          <span class="hidden sm:inline">Bersihkan</span>
        </button>
      {/if}
    </div>
  </div>

  <!-- Content Viewport -->
  <div bind:this={messagesContainer} class="flex-1 overflow-y-auto px-2 sm:px-4 py-4 sm:py-6">
    {#if messages.length === 0}
      <!-- Empty State: Teenage Engineering Hardware Instrument Cockpit Deck -->
      <div class="h-full flex flex-col justify-center max-w-3xl mx-auto gap-4 sm:gap-5 animate-in fade-in zoom-in-95 duration-200 pb-20">
        
        <!-- Physical Machine Nameplate & Live Telemetry Plate -->
        <div class="w-full bg-[#E9E7E0] border border-[#C8C5BC] rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs font-mono">
          <div class="flex items-center gap-2.5">
            <span class="w-3 h-3 rounded-full bg-[#FF5500] shadow-[0_0_8px_rgba(255,85,0,0.6)] animate-pulse"></span>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs sm:text-sm font-bold text-[#191B1D] tracking-wider uppercase">zhiEnd FIELD INSTRUMENT // TX-3888</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded bg-[#FCFCFA] border border-[#C8C5BC] text-[#FF5500] font-bold">REV 2.4</span>
              </div>
              <p class="text-[10px] text-[#5C6066] font-sans mt-0.5">Unit siap menerima instruksi coding, inspeksi git, dan eksekusi terminal.</p>
            </div>
          </div>
          <div class="flex items-center gap-2 sm:gap-3 text-[10px] text-[#5C6066] border-t sm:border-t-0 border-[#C8C5BC] pt-2 sm:pt-0">
            <span class="px-2 py-0.5 rounded bg-[#FCFCFA] border border-[#C8C5BC] flex items-center gap-1 font-semibold text-emerald-700">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> BUS NOMINAL
            </span>
            <span class="px-2 py-0.5 rounded bg-[#FCFCFA] border border-[#C8C5BC] font-semibold text-[#191B1D] truncate max-w-[140px]">
              {activePersona?.name || 'ANTIGRAVITY'}
            </span>
          </div>
        </div>

        <!-- Hardware Macro Trigger Soundbank (EP-133 / OP-1 Parameter Matrix) -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between px-1">
            <span class="text-[11px] font-mono font-bold text-[#5C6066] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles class="w-3 h-3 text-[#FF5500]" /> MACRO SOUNDBANK KEYS // DIRECT DISPATCH
            </span>
            <span class="text-[10px] font-mono text-[#8C9097]">CLICK PAD TO TRIGGER</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 w-full">
            {#each suggestions as s, idx}
              <button
                type="button"
                onclick={() => setPrompt(s.prompt)}
                class="p-3 rounded-xl bg-[#E9E7E0] hover:bg-[#FCFCFA] border border-[#C8C5BC] hover:border-[#FF5500] flex flex-col justify-between gap-3 transition text-left cursor-pointer group shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),0_2px_0_#C8C5BC] active:translate-y-0.5 active:shadow-xs min-h-[105px]"
              >
                <div class="flex items-center justify-between w-full">
                  <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#FCFCFA] group-hover:bg-[#FF5500] text-[#5C6066] group-hover:text-white border border-[#C8C5BC] transition">
                    PAD 0{idx + 1}
                  </span>
                  <s.icon class="w-4 h-4 text-[#FF5500] group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <div class="text-xs font-bold text-[#191B1D] group-hover:text-[#FF5500] transition-colors leading-tight font-mono">
                    {s.title}
                  </div>
                  <p class="text-[10px] text-[#5C6066] leading-snug mt-1 font-sans line-clamp-2">{s.desc}</p>
                </div>
              </button>
            {/each}
          </div>
        </div>

        <!-- System Diagnostic Strip & Shortcuts -->
        <div class="p-3 rounded-xl bg-[#FCFCFA] border border-[#C8C5BC] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs text-[11px] font-mono">
          <div class="flex items-center gap-2 text-[#5C6066]">
            <span class="font-bold text-[#191B1D]">COMMANDS:</span>
            <span class="px-1.5 py-0.5 rounded bg-[#E9E7E0] border border-[#C8C5BC] text-[#191B1D] font-bold">!code</span>
            <span class="px-1.5 py-0.5 rounded bg-[#E9E7E0] border border-[#C8C5BC] text-[#191B1D] font-bold">!git</span>
            <span class="px-1.5 py-0.5 rounded bg-[#E9E7E0] border border-[#C8C5BC] text-[#191B1D] font-bold">!push</span>
            <span class="px-1.5 py-0.5 rounded bg-[#E9E7E0] border border-[#C8C5BC] text-[#191B1D] font-bold">!persona</span>
          </div>
          <div class="flex items-center gap-2 text-[#5C6066]">
            <span>SHORTCUT:</span>
            <kbd class="px-1.5 py-0.5 rounded bg-[#E9E7E0] border border-[#C8C5BC] text-[#191B1D] font-bold">Ctrl + Enter</kbd>
            <span class="text-[#8C9097]">TO FIRE</span>
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
              <div class="flex items-center text-[10px] font-mono text-[#5C6066] px-1 font-semibold">
                <span>Anda</span>
              </div>

              <!-- User Bubble Content -->
              <div class="bubble-user max-w-[92%] sm:max-w-[85%] px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl rounded-tr-none text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap font-sans text-[#191B1D]">
                {msg.text}
              </div>

              <!-- User Attached Images Gallery -->
              {#if msg.images && msg.images.length > 0}
                <div class="flex flex-wrap gap-2 max-w-[85%] justify-end mt-1">
                  {#each msg.images as imgUrl}
                    <button
                      type="button"
                      onclick={() => zoomImageUrl = imgUrl}
                      class="group/thumb relative rounded-xl overflow-hidden border border-[#C8C5BC] hover:border-[#FF5500] shadow-sm bg-[#E9E7E0] cursor-zoom-in max-w-[220px] max-h-[160px] transition"
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
                    class="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 px-1.5 py-0.5 rounded hover:bg-zinc-800/60 transition cursor-pointer"
                    title="Salin teks"
                  >
                    {#if copiedMessageId === msg.id}
                      <Check class="w-3 h-3 text-emerald-400" />
                      <span class="text-emerald-400 text-[10px] font-medium">Tersalin!</span>
                    {:else}
                      <Copy class="w-3 h-3 text-zinc-400 hover:text-zinc-200" />
                      <span class="text-[10px]">Salin</span>
                    {/if}
                  </button>
                </div>
              {/if}
            </div>
          {:else}
            <!-- Agent Message with Custom Avatar (Video/GIF/Image/Emoji) & Traits -->
            <div class="flex items-start gap-2.5 sm:gap-3 group w-full">
              <!-- Avatar Persona -->
              <div class="shrink-0 mt-0.5">
                <AvatarView
                  avatar={activePersona?.avatar}
                  name={activePersona?.name}
                  size="md"
                  className="rounded-2xl ring-1 ring-[#FF5500]/30 shadow-xs"
                />
              </div>

              <div class="flex-1 flex flex-col gap-1.5 min-w-0 max-w-[96%] sm:max-w-[92%]">
                <!-- Header Username, Traits & Model -->
                <div class="flex items-center gap-2 text-[10px] font-mono text-[#5C6066] px-1 min-w-0">
                  <span class="font-bold text-[#191B1D] truncate shrink-0 max-w-[120px] sm:max-w-[200px]" title={activePersona?.name || 'zhiEnd Assistant'}>
                    {activePersona?.name || 'zhiEnd Assistant'}
                  </span>
                  {#if activePersona?.traits}
                    <span 
                      class="text-[9px] px-2 py-0.5 rounded-md bg-[#DEDBD2] border border-[#C8C5BC] text-[#5C6066] font-sans truncate max-w-[140px] sm:max-w-[280px] md:max-w-[360px]"
                      title={`Sifat & Karakteristik: ${activePersona.traits}`}
                    >
                      {activePersona.traits}
                    </span>
                  {/if}
                  {#if activePersona?.preferred_model}
                    <span class="text-[9px] text-[#8C9097] font-mono hidden md:inline shrink-0 font-medium">
                      {activePersona.preferred_model}
                    </span>
                  {/if}
                </div>

                <!-- Agent Bubble Content -->
                <div class="bubble-agent w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-[#191B1D] text-xs leading-relaxed">
                  <!-- Professional Execution & Reasoning Accordion (For Agent Responses) -->
                  {#if (msg.steps && msg.steps.length > 0) || (msg.tools && msg.tools.length > 0) || msg.thought || msg.isStreaming}
                    {@const isExp = isProcessExpanded(msg.id, msg.isStreaming)}
                    <div class="mb-3 rounded-xl border transition-all duration-200 overflow-hidden {isExp ? 'border-[#C8C5BC] bg-[#FCFCFA]' : 'border-[#C8C5BC] bg-[#FCFCFA]/80 hover:border-[#A8A59C]'}">
                      <!-- Accordion Header Button -->
                      <button
                        type="button"
                        onclick={() => toggleProcess(msg.id)}
                        class="w-full flex items-center justify-between px-3 {isExp ? 'py-2 bg-[#DEDBD2]/50' : 'py-1.5 bg-[#DEDBD2]/30'} hover:bg-[#DEDBD2] transition-all cursor-pointer text-left select-none"
                      >
                        <div class="flex items-center gap-2 min-w-0">
                          {#if msg.isStreaming}
                            <div class="relative flex items-center justify-center w-2.5 h-2.5 shrink-0">
                              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5500] opacity-60"></span>
                              <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#FF5500]"></span>
                            </div>
                            <span class="text-xs font-bold text-[#FF5500]">
                              Sedang Memproses...
                            </span>
                          {:else}
                            <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span class="text-xs font-bold text-[#191B1D]">
                              Proses & Eksekusi Selesai
                            </span>
                          {/if}
                          <span class="text-[10px] font-mono text-[#5C6066] px-1.5 py-0.2 rounded bg-[#DEDBD2] border border-[#C8C5BC] font-semibold">
                            {(msg.steps?.length || msg.tools?.length || 1)} aktivitas
                          </span>
                        </div>

                        <div class="flex items-center gap-1.5 text-[#5C6066]">
                          <span class="text-[10px] font-sans font-medium text-[#5C6066]">
                            {isExp ? 'Sembunyikan' : 'Detail'}
                          </span>
                          <ChevronDown class="w-3.5 h-3.5 text-[#5C6066] transition-transform duration-200 {isExp ? 'rotate-180' : ''}" />
                        </div>
                      </button>

                      <!-- Accordion Body -->
                      {#if isExp}
                        <div class="p-3 border-t border-[#C8C5BC] flex flex-col gap-2.5 text-xs bg-[#FCFCFA] animate-in fade-in duration-150">
                          <!-- Reasoning / Thinking Box -->
                          {#if msg.thought}
                            <div class="p-2.5 rounded-lg bg-amber-50/70 border border-amber-300 text-amber-950 italic text-[11px] leading-relaxed flex gap-2">
                              <Sparkles class="w-3.5 h-3.5 text-[#FF5500] shrink-0 mt-0.5" />
                              <div class="flex flex-col gap-0.5">
                                <span class="text-[10px] font-bold text-[#C26D2B] not-italic font-mono uppercase tracking-wider">
                                  Reasoning & Analisis
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
                                  <span class="w-1.5 h-1.5 rounded-full {st.type === 'edit' || st.type === 'write' ? 'bg-[#FF5500]' : 'bg-[#E5A91A]'} mt-1.5 shrink-0"></span>

                                  <div class="flex-1 flex flex-col min-w-0">
                                    <div class="flex items-center gap-1.5 flex-wrap">
                                      <span class="font-bold text-[#191B1D]">{st.title}</span>

                                      {#if st.file}
                                        <span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#E9E7E0] border border-[#C8C5BC] text-[10px] font-mono text-[#191B1D] font-semibold">
                                          <FileCode class="w-2.5 h-2.5 text-[#FF5500]" /> {st.file}
                                        </span>
                                      {/if}

                                      {#if st.lines}
                                        <span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-100 border border-amber-300 text-[10px] font-mono text-amber-900 font-bold">
                                          {st.lines}
                                        </span>
                                      {/if}

                                      {#if st.command}
                                        <code class="px-1.5 py-0.2 rounded bg-[#E9E7E0] border border-[#C8C5BC] text-[10px] font-mono text-[#191B1D] max-w-sm truncate font-semibold">
                                          {st.command}
                                        </code>
                                      {/if}

                                      {#if st.repeatCount && st.repeatCount > 1}
                                        <span class="inline-flex items-center px-1.5 py-0.2 rounded-full bg-[#FF5500]/15 border border-[#FF5500]/30 text-[9px] font-mono font-bold text-[#FF5500]" title={`Perintah dijalankan ${st.repeatCount} kali`}>
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
                                <div class="flex items-center gap-2 text-[#5C6066] text-[11px] py-0.5 pl-2">
                                  <span class="w-1.5 h-1.5 rounded-full bg-[#FF5500] animate-pulse shrink-0"></span>
                                  <span class="font-sans font-medium">Melanjutkan langkah berikutnya...</span>
                                </div>
                              {/if}
                            </div>
                          {:else if msg.tools && msg.tools.length > 0}
                            <div class="flex flex-wrap gap-1.5">
                              {#each msg.tools as tool}
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E9E7E0] border border-[#C8C5BC] text-[10px] font-mono text-[#191B1D] font-semibold">
                                  <Wrench class="w-2.5 h-2.5 text-[#FF5500]" /> {tool}
                                </span>
                              {/each}
                            </div>
                          {:else if msg.isStreaming}
                            <!-- Minimalist Loading Indicator -->
                            <div class="flex items-center gap-2.5 py-1 text-[#5C6066]">
                              <div class="flex gap-1 items-center">
                                <span class="w-1.5 h-1.5 rounded-full bg-[#FF5500] animate-bounce [animation-delay:-0.3s]"></span>
                                <span class="w-1.5 h-1.5 rounded-full bg-[#FF5500] animate-bounce [animation-delay:-0.15s]"></span>
                                <span class="w-1.5 h-1.5 rounded-full bg-[#FF5500] animate-bounce"></span>
                              </div>
                              <span class="text-[11px] text-[#5C6066] font-sans font-medium">Menganalisis & merencanakan tugas...</span>
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
                      <span class="inline-block w-1.5 h-3.5 bg-[#FF5500] animate-pulse align-middle ml-0.5 rounded-xs"></span>
                    {/if}
                  </div>

                  <!-- Agent Attached Images Gallery (if any) -->
                  {#if msg.images && msg.images.length > 0}
                    <div class="flex flex-wrap gap-2 mt-2 pt-2 border-t border-[#C8C5BC]">
                      {#each msg.images as imgUrl}
                        <button
                          type="button"
                          onclick={() => zoomImageUrl = imgUrl}
                          class="group/thumb relative rounded-xl overflow-hidden border border-[#C8C5BC] hover:border-[#FF5500] shadow-sm bg-[#E9E7E0] cursor-zoom-in max-w-[220px] max-h-[160px] transition"
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
                      class="flex items-center gap-1 text-[11px] text-[#5C6066] hover:text-[#191B1D] px-1.5 py-0.5 rounded hover:bg-[#DEDBD2] transition cursor-pointer"
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
  <div class="absolute bottom-2 sm:bottom-4 inset-x-0 px-2 sm:px-4 pointer-events-none z-20">
    <div 
      role="region"
      aria-label="Kotak Input Mengambang"
      class="max-w-3xl mx-auto bg-[#E9E7E0] border border-[#C8C5BC] rounded-2xl p-2 sm:p-2.5 shadow-lg pointer-events-auto flex flex-col gap-2 {isDragging ? 'border-[#FF5500] ring-2 ring-[#FF5500]/30' : ''}"
      onpaste={handlePaste}
    >
        <!-- Uploaded Image Chips Preview -->
        {#if selectedImages.length > 0}
          <div class="flex flex-wrap gap-2 px-1 pt-0.5 pb-0.5">
            {#each selectedImages as img, idx}
              <div class="relative group/chip flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FCFCFA] border border-[#C8C5BC] text-xs text-[#191B1D] shadow-2xs animate-in fade-in zoom-in-95 duration-150">
                <div class="relative w-6 h-6 shrink-0 rounded-lg overflow-hidden border border-[#C8C5BC] bg-[#DEDBD2]">
                  <img src={img.localPreviewUrl || img.url} alt={img.name} class="w-full h-full object-cover" />
                  {#if img.isUploading}
                    <div class="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
                      <Loader2 class="w-3 h-3 animate-spin text-[#FF5500]" />
                    </div>
                  {/if}
                </div>
                <div class="flex flex-col min-w-0 pr-1">
                  <span class="max-w-[120px] truncate text-[11px] text-[#191B1D] font-semibold">{img.name}</span>
                  {#if img.isUploading}
                    <span class="text-[9px] text-[#FF5500] font-mono animate-pulse leading-none">Mengunggah...</span>
                  {/if}
                </div>
                <button
                  type="button"
                  onclick={() => removeImage(idx)}
                  class="p-0.5 rounded-full hover:bg-rose-100 text-[#8C9097] hover:text-rose-600 transition cursor-pointer shrink-0"
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
          <div class="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-xl bg-rose-50 border border-rose-300 text-[11px] text-rose-900 animate-in fade-in">
            <span class="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0"></span>
            <span class="font-bold truncate">Mendengarkan suara... Silakan bicara (klik ikon Mic lagi jika sudah selesai)</span>
            <button type="button" onclick={stopVoiceInput} class="ml-auto text-xs px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold">Selesai</button>
          </div>
        {:else if isTranscribingVoice}
          <div class="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-xl bg-orange-50 border border-orange-300 text-[11px] text-[#FF5500] animate-in fade-in font-semibold">
            <Loader2 class="w-3.5 h-3.5 animate-spin text-[#FF5500] shrink-0" />
            <span>Mentranskripsi suara ke teks...</span>
          </div>
        {:else if voiceError}
          <div class="flex items-center justify-between gap-2 px-3 py-1.5 mb-2 rounded-xl bg-amber-50 border border-amber-300 text-[11px] text-amber-900 animate-in fade-in">
            <span class="truncate">⚠️ {voiceError}</span>
            <button type="button" onclick={() => voiceError = null} class="p-0.5 hover:text-black shrink-0"><X class="w-3 h-3" /></button>
          </div>
        {/if}

        <div class="flex items-end gap-1.5 sm:gap-2 w-full">
          <!-- Attachment Button -->
          <button
            type="button"
            onclick={() => fileInputRef?.click()}
            disabled={isBusy || isUploadingImage || isListening}
            class="p-1.5 sm:p-2 rounded-xl text-[#5C6066] hover:text-[#191B1D] hover:bg-[#DEDBD2] transition cursor-pointer shrink-0 disabled:opacity-40"
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
            class="relative p-1.5 sm:p-2 rounded-xl transition cursor-pointer shrink-0 disabled:opacity-40 {isListening ? 'bg-rose-100 text-rose-600 border border-rose-300' : (isTranscribingVoice ? 'bg-orange-100 text-[#FF5500] border border-orange-300 animate-pulse' : 'text-[#5C6066] hover:text-rose-600 hover:bg-[#DEDBD2]')}"
            title={isListening ? 'Klik untuk selesai bicara' : (isTranscribingVoice ? 'Mentranskripsi suara...' : 'Perintah Suara (Speech-to-Text)')}
          >
            {#if isTranscribingVoice}
              <Loader2 class="w-4 h-4 animate-spin text-[#FF5500]" />
            {:else if isListening}
              <Mic class="w-4 h-4 text-rose-600 animate-pulse" />
              <span class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
            {:else}
              <Mic class="w-4 h-4" />
            {/if}
          </button>

          <textarea
            bind:value={promptInput}
            onkeydown={handleKeyDown}
            placeholder={isListening ? "Mendengarkan suara Anda..." : (isTranscribingVoice ? "Mentranskripsi suara..." : "Tulis instruksi atau perintah terminal (misal: npx prisma..., git status, !npm i)...")}
            rows="1"
            class="flex-1 bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl text-xs text-[#191B1D] placeholder-[#8C9097] outline-none resize-none px-2.5 py-1.5 leading-relaxed focus:border-[#FF5500]"
          ></textarea>

          <div class="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {#if isBusy}
              <button
                onclick={onCancelTask}
                class="p-1.5 sm:p-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300 transition cursor-pointer"
                title="Hentikan Task"
              >
                <StopCircle class="w-4 h-4" />
              </button>
            {/if}

            <button
              onclick={onClearMessages}
              class="hidden sm:flex p-2 rounded-xl hover:bg-[#DEDBD2] text-[#8C9097] hover:text-[#191B1D] transition cursor-pointer"
              title="Bersihkan Percakapan"
            >
              <Trash2 class="w-4 h-4" />
            </button>

            <button
              onclick={handleSend}
              disabled={isBusy || isUploadingImage || (!promptInput.trim() && selectedImages.length === 0)}
              class="btn-safety p-1.5 sm:p-2 rounded-xl text-white font-bold transition cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowUp class="w-4 h-4" />
            </button>
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
        class="relative max-w-4xl max-h-[90vh] bg-[#FCFCFA] border border-[#C8C5BC] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between px-4 py-2.5 border-b border-[#C8C5BC] bg-[#E9E7E0]">
          <span class="text-xs font-mono text-[#191B1D] font-bold truncate max-w-md" title={fileName}>{fileName}</span>
          <div class="flex items-center gap-2">
            <a
              href={downloadHref}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-safety text-white font-bold text-xs transition cursor-pointer"
              title="Download gambar ini ke perangkat Anda"
            >
              <Download class="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
            <button
              type="button"
              onclick={() => zoomImageUrl = null}
              class="p-1.5 rounded-lg hover:bg-rose-100 text-[#5C6066] hover:text-rose-600 transition cursor-pointer"
              title="Tutup"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>
        <!-- Modal Image -->
        <div class="p-2 overflow-auto flex items-center justify-center max-h-[calc(90vh-50px)]">
          <img src={zoomImageUrl} alt="Pratinjau Gambar" class="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      </div>
    </div>
  {/if}
</div>
