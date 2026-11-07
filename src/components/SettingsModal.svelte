<script lang="ts">
  import type { AppConfig } from '../types';
  import { api } from '../services/api';
  import {
    X,
    Save,
    Sliders,
    Shield,
    Cpu,
    Send,
    MessageSquare,
    Globe,
    Plus,
    Trash2,
    Mic,
    Key,
    Eye,
    EyeOff,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Sparkles,
    ExternalLink,
    RefreshCw
  } from 'lucide-svelte';

  let {
    config,
    isOpen,
    personas = [],
    initialTab = 'general',
    onClose,
    onSave
  }: {
    config: AppConfig | null;
    isOpen: boolean;
    personas?: any[];
    initialTab?: 'general' | 'antigravity' | 'ai_providers' | 'telegram' | 'whatsapp' | 'tunnel' | 'voice';
    onClose: () => void;
    onSave: (updates: Partial<AppConfig>) => Promise<boolean>;
  } = $props();

  let activeTab = $state<'general' | 'antigravity' | 'ai_providers' | 'telegram' | 'whatsapp' | 'tunnel' | 'voice'>('general');

  // Form states initialized from config
  let formPort = $state(3888);
  let formPin = $state('');
  let formActiveProj = $state('');
  let formRecentProjects = $state<string[]>([]);
  let newRecentProjInput = $state('');

  let formCliPath = $state('');
  let formDefaultModel = $state('');

  // AI Providers Keys & URLs
  let formOpenaiKey = $state('');
  let formOpenaiBaseUrl = $state('https://api.openai.com/v1');
  let showOpenaiKey = $state(false);

  let formGrokKey = $state('');
  let formGrokBaseUrl = $state('https://api.x.ai/v1');
  let showGrokKey = $state(false);

  let formQwenKey = $state('');
  let formQwenBaseUrl = $state('https://dashscope-intl.aliyuncs.com/compatible-mode/v1');
  let showQwenKey = $state(false);

  let formDeepseekKey = $state('');
  let formDeepseekBaseUrl = $state('https://api.deepseek.com');
  let showDeepseekKey = $state(false);

  let formGeminiKey = $state('');
  let formGeminiBaseUrl = $state('https://generativelanguage.googleapis.com/v1beta/openai');
  let showGeminiKey = $state(false);

  // Provider Connection Test States
  let testStates = $state<Record<string, { loading: boolean; success?: boolean; message?: string }>>({});

  let formTgEnabled = $state(false);
  let formTgToken = $state('');
  let formTgUsers = $state('');
  let formTgPersonaId = $state('persona-default');

  let formWaEnabled = $state(false);
  let formWaNumbers = $state('');
  let formWaPersonaId = $state('persona-default');

  let formTunnelSubdomain = $state('');

  let formVoiceProvider = $state<'groq' | 'openai' | 'gemini'>('groq');
  let formVoiceGroqKey = $state('');
  let formVoiceOpenaiKey = $state('');
  let formVoiceGeminiKey = $state('');
  let formVoiceLang = $state('id');

  let isSaving = $state(false);

  function getSafeEmoji(avatar?: string | null): string {
    if (!avatar) return '⚡';
    if (avatar.startsWith('data:') || avatar.startsWith('http') || avatar.length > 8) {
      return '🎭';
    }
    return avatar;
  }

  $effect(() => {
    if (isOpen) {
      if (initialTab) {
        activeTab = initialTab;
      }
    }
  });

  $effect(() => {
    if (config && isOpen) {
      formPort = config.port || 3888;
      formPin = config.securityPin || '';
      formActiveProj = config.activeProject || '';
      formRecentProjects = [...(config.recentProjects || [])];

      formCliPath = config.antigravity?.cliPath || '';
      formDefaultModel = config.antigravity?.defaultModel || 'gemini-3.8-flash-high';

      // AI Providers
      const ai = config.aiProviders;
      formOpenaiKey = ai?.openai?.apiKey || '';
      formOpenaiBaseUrl = ai?.openai?.baseUrl || 'https://api.openai.com/v1';

      formGrokKey = ai?.grok?.apiKey || '';
      formGrokBaseUrl = ai?.grok?.baseUrl || 'https://api.x.ai/v1';

      formQwenKey = ai?.qwen?.apiKey || '';
      formQwenBaseUrl = ai?.qwen?.baseUrl || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';

      formDeepseekKey = ai?.deepseek?.apiKey || '';
      formDeepseekBaseUrl = ai?.deepseek?.baseUrl || 'https://api.deepseek.com';

      formGeminiKey = ai?.gemini?.apiKey || '';
      formGeminiBaseUrl = ai?.gemini?.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai';

      formTgEnabled = !!config.telegram?.enabled;
      formTgToken = config.telegram?.botToken || '';
      formTgUsers = (config.telegram?.allowedUsers || []).join(', ');
      formTgPersonaId = config.telegram?.personaId || 'persona-default';

      formWaEnabled = !!config.whatsapp?.enabled;
      formWaNumbers = (config.whatsapp?.allowedNumbers || []).join(', ');
      formWaPersonaId = config.whatsapp?.personaId || 'persona-default';

      formTunnelSubdomain = config.tunnel?.subdomain || '';

      formVoiceProvider = config.voice?.provider || 'groq';
      formVoiceGroqKey = config.voice?.groqApiKey || '';
      formVoiceOpenaiKey = config.voice?.openaiApiKey || '';
      formVoiceGeminiKey = config.voice?.geminiApiKey || '';
      formVoiceLang = config.voice?.language || 'id';
    }
  });

  function addRecentProject() {
    if (!newRecentProjInput.trim()) return;
    if (!formRecentProjects.includes(newRecentProjInput.trim())) {
      formRecentProjects = [...formRecentProjects, newRecentProjInput.trim()];
    }
    newRecentProjInput = '';
  }

  function removeRecentProject(idx: number) {
    formRecentProjects = formRecentProjects.filter((_, i) => i !== idx);
  }

  async function handleTestConnection(provider: string, apiKey: string, baseUrl?: string) {
    testStates[provider] = { loading: true };
    try {
      const res = await api.testAIProvider({ provider, apiKey, baseUrl });
      testStates[provider] = {
        loading: false,
        success: res.success,
        message: res.message
      };
    } catch (err: any) {
      testStates[provider] = {
        loading: false,
        success: false,
        message: err.message || 'Gagal menghubungi server API'
      };
    }
  }

  async function handleSave() {
    isSaving = true;
    try {
      const updates: Partial<AppConfig> = {
        port: Number(formPort),
        securityPin: formPin.trim(),
        activeProject: formActiveProj.trim(),
        recentProjects: formRecentProjects,
        antigravity: {
          cliPath: formCliPath.trim(),
          defaultModel: formDefaultModel,
          availableModels: config?.antigravity?.availableModels || []
        },
        aiProviders: {
          openai: {
            apiKey: formOpenaiKey.trim(),
            baseUrl: formOpenaiBaseUrl.trim()
          },
          grok: {
            apiKey: formGrokKey.trim(),
            baseUrl: formGrokBaseUrl.trim()
          },
          qwen: {
            apiKey: formQwenKey.trim(),
            baseUrl: formQwenBaseUrl.trim()
          },
          deepseek: {
            apiKey: formDeepseekKey.trim(),
            baseUrl: formDeepseekBaseUrl.trim()
          },
          gemini: {
            apiKey: formGeminiKey.trim(),
            baseUrl: formGeminiBaseUrl.trim()
          }
        },
        telegram: {
          enabled: formTgEnabled,
          botToken: formTgToken.trim(),
          allowedUsers: formTgUsers.split(',').map(s => s.trim()).filter(Boolean),
          personaId: formTgPersonaId
        },
        whatsapp: {
          enabled: formWaEnabled,
          allowedNumbers: formWaNumbers.split(',').map(s => s.trim()).filter(Boolean),
          personaId: formWaPersonaId
        },
        tunnel: {
          enabled: config?.tunnel?.enabled || false,
          provider: config?.tunnel?.provider || 'localtunnel',
          subdomain: formTunnelSubdomain.trim(),
          publicUrl: config?.tunnel?.publicUrl || ''
        },
        voice: {
          provider: formVoiceProvider,
          groqApiKey: formVoiceGroqKey.trim(),
          openaiApiKey: formVoiceOpenaiKey.trim(),
          geminiApiKey: formVoiceGeminiKey.trim(),
          language: formVoiceLang
        }
      };

      const ok = await onSave(updates);
      if (ok) {
        onClose();
      }
    } finally {
      isSaving = false;
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
    <div class="w-full max-w-3xl rounded-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] bg-[#FCFCFA] border border-[#C8C5BC] shadow-2xl overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-200">
      
      <!-- Modal Header -->
      <div class="px-4 sm:px-6 py-4 border-b border-[#C8C5BC] flex items-center justify-between shrink-0 bg-[#E9E7E0]">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-[#FF5500] text-white flex items-center justify-center font-bold shadow-xs">
            <Sliders class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm sm:text-base font-bold text-[#191B1D] tracking-tight uppercase font-mono">Pengaturan Sistem zhiEnd Agent</h3>
            <p class="text-[11px] text-[#5C6066]">Konfigurasi seluruh modul, API Keys, model AI, remote bot & keamanan</p>
          </div>
        </div>
        <button onclick={onClose} class="text-[#5C6066] hover:text-[#191B1D] p-1.5 rounded-lg hover:bg-[#DEDBD2] transition cursor-pointer">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Settings Navigation Tabs -->
      <div class="flex border-b border-[#C8C5BC] px-3 sm:px-5 gap-1 sm:gap-2 text-xs font-semibold overflow-x-auto bg-[#E9E7E0] shrink-0 scrollbar-none">
        <button
          onclick={() => activeTab = 'general'}
          class="py-2.5 sm:py-3 px-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition {activeTab === 'general' ? 'border-[#FF5500] text-[#FF5500] font-bold' : 'border-transparent text-[#5C6066] hover:text-[#191B1D]'}"
        >
          <Shield class="w-3.5 h-3.5" /> Umum & PIN
        </button>
        <button
          onclick={() => activeTab = 'ai_providers'}
          class="py-2.5 sm:py-3 px-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition {activeTab === 'ai_providers' ? 'border-[#FF5500] text-[#FF5500] font-bold' : 'border-transparent text-[#5C6066] hover:text-[#191B1D]'}"
        >
          <Key class="w-3.5 h-3.5 text-[#FF5500]" /> AI API Keys & Model
        </button>
        <button
          onclick={() => activeTab = 'antigravity'}
          class="py-2.5 sm:py-3 px-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition {activeTab === 'antigravity' ? 'border-[#FF5500] text-[#FF5500] font-bold' : 'border-transparent text-[#5C6066] hover:text-[#191B1D]'}"
        >
          <Cpu class="w-3.5 h-3.5" /> Antigravity Core
        </button>
        <button
          onclick={() => activeTab = 'telegram'}
          class="py-2.5 sm:py-3 px-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition {activeTab === 'telegram' ? 'border-[#FF5500] text-[#FF5500] font-bold' : 'border-transparent text-[#5C6066] hover:text-[#191B1D]'}"
        >
          <Send class="w-3.5 h-3.5" /> Telegram Bot
        </button>
        <button
          onclick={() => activeTab = 'whatsapp'}
          class="py-2.5 sm:py-3 px-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition {activeTab === 'whatsapp' ? 'border-[#FF5500] text-[#FF5500] font-bold' : 'border-transparent text-[#5C6066] hover:text-[#191B1D]'}"
        >
          <MessageSquare class="w-3.5 h-3.5" /> WhatsApp Bot
        </button>
        <button
          onclick={() => activeTab = 'tunnel'}
          class="py-2.5 sm:py-3 px-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition {activeTab === 'tunnel' ? 'border-[#FF5500] text-[#FF5500] font-bold' : 'border-transparent text-[#5C6066] hover:text-[#191B1D]'}"
        >
          <Globe class="w-3.5 h-3.5" /> Remote Tunnel
        </button>
        <button
          onclick={() => activeTab = 'voice'}
          class="py-2.5 sm:py-3 px-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition {activeTab === 'voice' ? 'border-[#FF5500] text-[#FF5500] font-bold' : 'border-transparent text-[#5C6066] hover:text-[#191B1D]'}"
        >
          <Mic class="w-3.5 h-3.5" /> Voice / Audio
        </button>
      </div>

      <!-- Tab Content Area -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 text-xs bg-[#F4F3EE]">
        
        <!-- ========================================== -->
        <!-- AI PROVIDERS & API KEYS                    -->
        <!-- ========================================== -->
        {#if activeTab === 'ai_providers'}
          <div class="flex flex-col gap-5">
            <!-- Hero Banner -->
            <div class="p-3.5 sm:p-4 rounded-xl bg-[#E9E7E0] border border-[#C8C5BC] flex flex-col gap-2">
              <div class="flex items-center gap-2 text-[#191B1D] font-bold text-xs sm:text-sm font-mono uppercase tracking-wider">
                <Key class="w-4 h-4 text-[#FF5500]" />
                <span>Konfigurasi AI Provider & API Key Eksternal</span>
              </div>
              <p class="text-[11px] text-[#5C6066] leading-relaxed">
                Tautkan Persona Anda ke model AI pihak ketiga selain default Antigravity CLI (Gemini). Masukkan API Key untuk provider yang ingin Anda gunakan. Persona dapat langsung memilih model ini di jendela Persona.
              </p>
            </div>

            <!-- Provider 1: OpenAI -->
            <div class="p-4 rounded-xl bg-[#FCFCFA] border border-[#C8C5BC] hover:border-[#8C9097] transition flex flex-col gap-3 shadow-xs">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs border border-emerald-300">
                    ⚡
                  </div>
                  <span class="font-bold text-[#191B1D] text-xs sm:text-sm font-mono">OpenAI</span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E9E7E0] text-[#5C6066] border border-[#C8C5BC]">
                    GPT-4o, GPT-4o Mini, o3-mini, o1
                  </span>
                </div>
                {#if formOpenaiKey}
                  <span class="text-[10px] text-emerald-700 flex items-center gap-1 font-mono font-bold">
                    <CheckCircle2 class="w-3 h-3" /> Terkonfigurasi
                  </span>
                {:else}
                  <span class="text-[10px] text-[#8C9097] font-mono">Belum Diisi</span>
                {/if}
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="openai-key" class="text-[#191B1D] font-semibold flex items-center justify-between">
                  <span>OpenAI API Key:</span>
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" class="text-[10px] text-[#FF5500] hover:underline flex items-center gap-1 font-bold">
                    Dapatkan Key <ExternalLink class="w-2.5 h-2.5" />
                  </a>
                </label>
                <div class="relative flex items-center">
                  <input
                    id="openai-key"
                    type={showOpenaiKey ? 'text' : 'password'}
                    bind:value={formOpenaiKey}
                    placeholder="sk-proj-..."
                    class="w-full bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl p-2.5 pr-10 text-[#191B1D] font-mono outline-none focus:border-[#FF5500] shadow-xs"
                  />
                  <button
                    type="button"
                    onclick={() => showOpenaiKey = !showOpenaiKey}
                    class="absolute right-2.5 text-[#5C6066] hover:text-[#191B1D] cursor-pointer p-1"
                    title={showOpenaiKey ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {#if showOpenaiKey}
                      <EyeOff class="w-3.5 h-3.5" />
                    {:else}
                      <Eye class="w-3.5 h-3.5" />
                    {/if}
                  </button>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <div class="flex items-center gap-1.5 text-[10px] text-[#5C6066] font-mono">
                  <span>Base URL:</span>
                  <input
                    type="text"
                    bind:value={formOpenaiBaseUrl}
                    class="bg-[#FCFCFA] border border-[#C8C5BC] rounded-lg px-2 py-1 text-[#191B1D] text-[11px] font-mono outline-none focus:border-[#FF5500] w-52 shadow-xs"
                  />
                </div>
                <button
                  type="button"
                  disabled={!formOpenaiKey || testStates['openai']?.loading}
                  onclick={() => handleTestConnection('openai', formOpenaiKey, formOpenaiBaseUrl)}
                  class="btn-hardware px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 shadow-xs"
                >
                  {#if testStates['openai']?.loading}
                    <Loader2 class="w-3.5 h-3.5 animate-spin text-[#FF5500]" />
                    <span>Menguji...</span>
                  {:else}
                    <RefreshCw class="w-3.5 h-3.5 text-emerald-600" />
                    <span>Uji Koneksi API</span>
                  {/if}
                </button>
              </div>

              {#if testStates['openai']?.message}
                <div class="p-2.5 rounded-xl text-xs flex items-center gap-2 {testStates['openai']?.success ? 'bg-emerald-50 border border-emerald-300 text-emerald-800' : 'bg-rose-50 border border-rose-300 text-rose-800'}">
                  {#if testStates['openai']?.success}
                    <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
                  {:else}
                    <AlertCircle class="w-4 h-4 text-rose-600 shrink-0" />
                  {/if}
                  <span class="truncate">{testStates['openai']?.message}</span>
                </div>
              {/if}
            </div>

            <!-- Provider 2: xAI / Grok -->
            <div class="p-4 rounded-xl bg-[#FCFCFA] border border-[#C8C5BC] hover:border-[#8C9097] transition flex flex-col gap-3 shadow-xs">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-lg bg-orange-100 text-[#FF5500] flex items-center justify-center font-bold text-xs border border-orange-200">
                    X
                  </div>
                  <span class="font-bold text-[#191B1D] text-xs sm:text-sm font-mono">Grok (xAI)</span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E9E7E0] text-[#5C6066] border border-[#C8C5BC]">
                    Grok 2, Grok 2 Mini, Grok Beta
                  </span>
                </div>
                {#if formGrokKey}
                  <span class="text-[10px] text-emerald-700 flex items-center gap-1 font-mono font-bold">
                    <CheckCircle2 class="w-3 h-3" /> Terkonfigurasi
                  </span>
                {:else}
                  <span class="text-[10px] text-[#8C9097] font-mono">Belum Diisi</span>
                {/if}
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="grok-key" class="text-[#191B1D] font-semibold flex items-center justify-between">
                  <span>xAI Grok API Key:</span>
                  <a href="https://console.x.ai" target="_blank" rel="noopener noreferrer" class="text-[10px] text-[#FF5500] hover:underline flex items-center gap-1 font-bold">
                    Dapatkan Key di console.x.ai <ExternalLink class="w-2.5 h-2.5" />
                  </a>
                </label>
                <div class="relative flex items-center">
                  <input
                    id="grok-key"
                    type={showGrokKey ? 'text' : 'password'}
                    bind:value={formGrokKey}
                    placeholder="xai-..."
                    class="w-full bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl p-2.5 pr-10 text-[#191B1D] font-mono outline-none focus:border-[#FF5500] shadow-xs"
                  />
                  <button
                    type="button"
                    onclick={() => showGrokKey = !showGrokKey}
                    class="absolute right-2.5 text-[#5C6066] hover:text-[#191B1D] cursor-pointer p-1"
                    title={showGrokKey ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {#if showGrokKey}
                      <EyeOff class="w-3.5 h-3.5" />
                    {:else}
                      <Eye class="w-3.5 h-3.5" />
                    {/if}
                  </button>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <div class="flex items-center gap-1.5 text-[10px] text-[#5C6066] font-mono">
                  <span>Base URL:</span>
                  <input
                    type="text"
                    bind:value={formGrokBaseUrl}
                    class="bg-[#FCFCFA] border border-[#C8C5BC] rounded-lg px-2 py-1 text-[#191B1D] text-[11px] font-mono outline-none focus:border-[#FF5500] w-52 shadow-xs"
                  />
                </div>
                <button
                  type="button"
                  disabled={!formGrokKey || testStates['grok']?.loading}
                  onclick={() => handleTestConnection('grok', formGrokKey, formGrokBaseUrl)}
                  class="btn-hardware px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 shadow-xs"
                >
                  {#if testStates['grok']?.loading}
                    <Loader2 class="w-3.5 h-3.5 animate-spin text-[#FF5500]" />
                    <span>Menguji...</span>
                  {:else}
                    <RefreshCw class="w-3.5 h-3.5 text-[#FF5500]" />
                    <span>Uji Koneksi API</span>
                  {/if}
                </button>
              </div>

              {#if testStates['grok']?.message}
                <div class="p-2.5 rounded-xl text-xs flex items-center gap-2 {testStates['grok']?.success ? 'bg-emerald-50 border border-emerald-300 text-emerald-800' : 'bg-rose-50 border border-rose-300 text-rose-800'}">
                  {#if testStates['grok']?.success}
                    <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
                  {:else}
                    <AlertCircle class="w-4 h-4 text-rose-600 shrink-0" />
                  {/if}
                  <span class="truncate">{testStates['grok']?.message}</span>
                </div>
              {/if}
            </div>

            <!-- Provider 3: Qwen (Alibaba DashScope) -->
            <div class="p-4 rounded-xl bg-[#FCFCFA] border border-[#C8C5BC] hover:border-[#8C9097] transition flex flex-col gap-3 shadow-xs">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs border border-amber-300">
                    Q
                  </div>
                  <span class="font-bold text-[#191B1D] text-xs sm:text-sm font-mono">Qwen (Alibaba DashScope)</span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E9E7E0] text-[#5C6066] border border-[#C8C5BC]">
                    Qwen 2.5 Coder 32B, Qwen Max, Qwen Plus
                  </span>
                </div>
                {#if formQwenKey}
                  <span class="text-[10px] text-emerald-700 flex items-center gap-1 font-mono font-bold">
                    <CheckCircle2 class="w-3 h-3" /> Terkonfigurasi
                  </span>
                {:else}
                  <span class="text-[10px] text-[#8C9097] font-mono">Belum Diisi</span>
                {/if}
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="qwen-key" class="text-[#191B1D] font-semibold flex items-center justify-between">
                  <span>DashScope API Key:</span>
                  <a href="https://dashscope.console.aliyun.com" target="_blank" rel="noopener noreferrer" class="text-[10px] text-[#FF5500] hover:underline flex items-center gap-1 font-bold">
                    Dapatkan Key di DashScope Console <ExternalLink class="w-2.5 h-2.5" />
                  </a>
                </label>
                <div class="relative flex items-center">
                  <input
                    id="qwen-key"
                    type={showQwenKey ? 'text' : 'password'}
                    bind:value={formQwenKey}
                    placeholder="sk-..."
                    class="w-full bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl p-2.5 pr-10 text-[#191B1D] font-mono outline-none focus:border-[#FF5500] shadow-xs"
                  />
                  <button
                    type="button"
                    onclick={() => showQwenKey = !showQwenKey}
                    class="absolute right-2.5 text-[#5C6066] hover:text-[#191B1D] cursor-pointer p-1"
                    title={showQwenKey ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {#if showQwenKey}
                      <EyeOff class="w-3.5 h-3.5" />
                    {:else}
                      <Eye class="w-3.5 h-3.5" />
                    {/if}
                  </button>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <div class="flex items-center gap-1.5 text-[10px] text-[#5C6066] font-mono">
                  <span>Base URL:</span>
                  <input
                    type="text"
                    bind:value={formQwenBaseUrl}
                    class="bg-[#FCFCFA] border border-[#C8C5BC] rounded-lg px-2 py-1 text-[#191B1D] text-[11px] font-mono outline-none focus:border-[#FF5500] w-52 truncate shadow-xs"
                  />
                </div>
                <button
                  type="button"
                  disabled={!formQwenKey || testStates['qwen']?.loading}
                  onclick={() => handleTestConnection('qwen', formQwenKey, formQwenBaseUrl)}
                  class="btn-hardware px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 shadow-xs"
                >
                  {#if testStates['qwen']?.loading}
                    <Loader2 class="w-3.5 h-3.5 animate-spin text-[#FF5500]" />
                    <span>Menguji...</span>
                  {:else}
                    <RefreshCw class="w-3.5 h-3.5 text-amber-600" />
                    <span>Uji Koneksi API</span>
                  {/if}
                </button>
              </div>

              {#if testStates['qwen']?.message}
                <div class="p-2.5 rounded-xl text-xs flex items-center gap-2 {testStates['qwen']?.success ? 'bg-emerald-50 border border-emerald-300 text-emerald-800' : 'bg-rose-50 border border-rose-300 text-rose-800'}">
                  {#if testStates['qwen']?.success}
                    <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
                  {:else}
                    <AlertCircle class="w-4 h-4 text-rose-600 shrink-0" />
                  {/if}
                  <span class="truncate">{testStates['qwen']?.message}</span>
                </div>
              {/if}
            </div>

            <!-- Provider 4: DeepSeek -->
            <div class="p-4 rounded-xl bg-[#FCFCFA] border border-[#C8C5BC] hover:border-[#8C9097] transition flex flex-col gap-3 shadow-xs">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-xs border border-sky-300">
                    🐋
                  </div>
                  <span class="font-bold text-[#191B1D] text-xs sm:text-sm font-mono">DeepSeek</span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E9E7E0] text-[#5C6066] border border-[#C8C5BC]">
                    DeepSeek V3, DeepSeek R1 (Thinking)
                  </span>
                </div>
                {#if formDeepseekKey}
                  <span class="text-[10px] text-emerald-700 flex items-center gap-1 font-mono font-bold">
                    <CheckCircle2 class="w-3 h-3" /> Terkonfigurasi
                  </span>
                {:else}
                  <span class="text-[10px] text-[#8C9097] font-mono">Belum Diisi</span>
                {/if}
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="deepseek-key" class="text-[#191B1D] font-semibold flex items-center justify-between">
                  <span>DeepSeek API Key:</span>
                  <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer" class="text-[10px] text-[#FF5500] hover:underline flex items-center gap-1 font-bold">
                    Dapatkan Key di platform.deepseek.com <ExternalLink class="w-2.5 h-2.5" />
                  </a>
                </label>
                <div class="relative flex items-center">
                  <input
                    id="deepseek-key"
                    type={showDeepseekKey ? 'text' : 'password'}
                    bind:value={formDeepseekKey}
                    placeholder="sk-..."
                    class="w-full bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl p-2.5 pr-10 text-[#191B1D] font-mono outline-none focus:border-[#FF5500] shadow-xs"
                  />
                  <button
                    type="button"
                    onclick={() => showDeepseekKey = !showDeepseekKey}
                    class="absolute right-2.5 text-[#5C6066] hover:text-[#191B1D] cursor-pointer p-1"
                    title={showDeepseekKey ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {#if showDeepseekKey}
                      <EyeOff class="w-3.5 h-3.5" />
                    {:else}
                      <Eye class="w-3.5 h-3.5" />
                    {/if}
                  </button>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <div class="flex items-center gap-1.5 text-[10px] text-[#5C6066] font-mono">
                  <span>Base URL:</span>
                  <input
                    type="text"
                    bind:value={formDeepseekBaseUrl}
                    class="bg-[#FCFCFA] border border-[#C8C5BC] rounded-lg px-2 py-1 text-[#191B1D] text-[11px] font-mono outline-none focus:border-[#FF5500] w-52 shadow-xs"
                  />
                </div>
                <button
                  type="button"
                  disabled={!formDeepseekKey || testStates['deepseek']?.loading}
                  onclick={() => handleTestConnection('deepseek', formDeepseekKey, formDeepseekBaseUrl)}
                  class="btn-hardware px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 shadow-xs"
                >
                  {#if testStates['deepseek']?.loading}
                    <Loader2 class="w-3.5 h-3.5 animate-spin text-[#FF5500]" />
                    <span>Menguji...</span>
                  {:else}
                    <RefreshCw class="w-3.5 h-3.5 text-sky-600" />
                    <span>Uji Koneksi API</span>
                  {/if}
                </button>
              </div>

              {#if testStates['deepseek']?.message}
                <div class="p-2.5 rounded-xl text-xs flex items-center gap-2 {testStates['deepseek']?.success ? 'bg-emerald-50 border border-emerald-300 text-emerald-800' : 'bg-rose-50 border border-rose-300 text-rose-800'}">
                  {#if testStates['deepseek']?.success}
                    <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
                  {:else}
                    <AlertCircle class="w-4 h-4 text-rose-600 shrink-0" />
                  {/if}
                  <span class="truncate">{testStates['deepseek']?.message}</span>
                </div>
              {/if}
            </div>

            <!-- Provider 5: Google Gemini Direct API -->
            <div class="p-4 rounded-xl bg-[#FCFCFA] border border-[#C8C5BC] hover:border-[#8C9097] transition flex flex-col gap-3 shadow-xs">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-lg bg-orange-100 text-[#FF5500] flex items-center justify-center font-bold text-xs border border-orange-200">
                    ✨
                  </div>
                  <span class="font-bold text-[#191B1D] text-xs sm:text-sm font-mono">Google Gemini (Direct API)</span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E9E7E0] text-[#5C6066] border border-[#C8C5BC]">
                    Gemini 2.0 Flash, Gemini 1.5 Pro
                  </span>
                </div>
                {#if formGeminiKey}
                  <span class="text-[10px] text-emerald-700 flex items-center gap-1 font-mono font-bold">
                    <CheckCircle2 class="w-3 h-3" /> Terkonfigurasi
                  </span>
                {:else}
                  <span class="text-[10px] text-[#8C9097] font-mono">Belum Diisi</span>
                {/if}
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="gemini-key" class="text-[#191B1D] font-semibold flex items-center justify-between">
                  <span>Gemini API Key:</span>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" class="text-[10px] text-[#FF5500] hover:underline flex items-center gap-1 font-bold">
                    Dapatkan Key di Google AI Studio <ExternalLink class="w-2.5 h-2.5" />
                  </a>
                </label>
                <div class="relative flex items-center">
                  <input
                    id="gemini-key"
                    type={showGeminiKey ? 'text' : 'password'}
                    bind:value={formGeminiKey}
                    placeholder="AIzaSy..."
                    class="w-full bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl p-2.5 pr-10 text-[#191B1D] font-mono outline-none focus:border-[#FF5500] shadow-xs"
                  />
                  <button
                    type="button"
                    onclick={() => showGeminiKey = !showGeminiKey}
                    class="absolute right-2.5 text-[#5C6066] hover:text-[#191B1D] cursor-pointer p-1"
                    title={showGeminiKey ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {#if showGeminiKey}
                      <EyeOff class="w-3.5 h-3.5" />
                    {:else}
                      <Eye class="w-3.5 h-3.5" />
                    {/if}
                  </button>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <div class="flex items-center gap-1.5 text-[10px] text-[#5C6066] font-mono">
                  <span>Base URL:</span>
                  <input
                    type="text"
                    bind:value={formGeminiBaseUrl}
                    class="bg-[#FCFCFA] border border-[#C8C5BC] rounded-lg px-2 py-1 text-[#191B1D] text-[11px] font-mono outline-none focus:border-[#FF5500] w-52 truncate shadow-xs"
                  />
                </div>
                <button
                  type="button"
                  disabled={!formGeminiKey || testStates['gemini']?.loading}
                  onclick={() => handleTestConnection('gemini', formGeminiKey, formGeminiBaseUrl)}
                  class="btn-hardware px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 shadow-xs"
                >
                  {#if testStates['gemini']?.loading}
                    <Loader2 class="w-3.5 h-3.5 animate-spin text-[#FF5500]" />
                    <span>Menguji...</span>
                  {:else}
                    <RefreshCw class="w-3.5 h-3.5 text-[#FF5500]" />
                    <span>Uji Koneksi API</span>
                  {/if}
                </button>
              </div>

              {#if testStates['gemini']?.message}
                <div class="p-2.5 rounded-xl text-xs flex items-center gap-2 {testStates['gemini']?.success ? 'bg-emerald-50 border border-emerald-300 text-emerald-800' : 'bg-rose-50 border border-rose-300 text-rose-800'}">
                  {#if testStates['gemini']?.success}
                    <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
                  {:else}
                    <AlertCircle class="w-4 h-4 text-rose-600 shrink-0" />
                  {/if}
                  <span class="truncate">{testStates['gemini']?.message}</span>
                </div>
              {/if}
            </div>

          </div>
        {/if}

        <!-- GENERAL & PIN -->
        {#if activeTab === 'general'}
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label for="form-pin" class="font-bold text-[#191B1D] font-mono uppercase tracking-wider">Security PIN (Kunci Akses Web):</label>
              <input
                id="form-pin"
                type="password"
                bind:value={formPin}
                placeholder="PIN 4-8 digit angka (opsional)"
                class="bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl p-2.5 text-[#191B1D] font-mono outline-none focus:border-[#FF5500] shadow-xs"
              />
              <span class="text-[11px] text-[#5C6066]">Kosongkan jika tidak ingin memproteksi akses Web UI dengan PIN sandi.</span>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-port" class="font-bold text-[#191B1D] font-mono uppercase tracking-wider">Port Server Backend:</label>
              <input
                id="form-port"
                type="number"
                bind:value={formPort}
                class="bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl p-2.5 text-[#191B1D] font-mono outline-none focus:border-[#FF5500] shadow-xs"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-active-project" class="font-bold text-[#191B1D] font-mono uppercase tracking-wider">Active Project Workspace:</label>
              <input
                id="form-active-project"
                type="text"
                bind:value={formActiveProj}
                class="bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl p-2.5 text-[#191B1D] font-mono outline-none focus:border-[#FF5500] shadow-xs"
              />
            </div>

            <!-- Recent projects manager -->
            <div class="flex flex-col gap-1.5">
              <span class="font-bold text-[#191B1D] font-mono uppercase tracking-wider">Daftar Project Favorit:</span>
              <div class="flex gap-2">
                <input
                  type="text"
                  bind:value={newRecentProjInput}
                  placeholder="D:\Works\my-other-project"
                  class="flex-1 bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl p-2 text-[#191B1D] font-mono outline-none focus:border-[#FF5500] shadow-xs"
                />
                <button
                  type="button"
                  onclick={addRecentProject}
                  class="btn-safety px-3 py-2 rounded-xl text-white font-semibold cursor-pointer transition shadow-xs"
                >
                  <Plus class="w-4 h-4" />
                </button>
              </div>

              <div class="flex flex-col gap-1 mt-1 max-h-32 overflow-y-auto">
                {#each formRecentProjects as proj, idx}
                  <div class="flex items-center justify-between p-2 rounded-xl bg-[#FCFCFA] border border-[#C8C5BC] font-mono text-[11px] shadow-xs">
                    <span class="truncate text-[#191B1D]">{proj}</span>
                    <button onclick={() => removeRecentProject(idx)} class="text-rose-600 hover:text-rose-800 p-1 cursor-pointer">
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {/if}

        <!-- ANTIGRAVITY AI -->
        {#if activeTab === 'antigravity'}
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label for="form-cli-path" class="font-bold text-[#191B1D] font-mono uppercase tracking-wider">Path Binary Antigravity CLI (agy.exe):</label>
              <input
                id="form-cli-path"
                type="text"
                bind:value={formCliPath}
                placeholder="C:\Users\zhien\AppData\Local\agy\bin\agy.exe"
                class="bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl p-2.5 text-[#191B1D] font-mono outline-none focus:border-[#FF5500] shadow-xs"
              />
              <span class="text-[11px] text-[#5C6066]">Executable agy yang digunakan server untuk menjalankan instruksi coding dan tools core.</span>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-default-model" class="font-bold text-[#191B1D] font-mono uppercase tracking-wider">Default Model Antigravity CLI:</label>
              <div class="relative">
                <select
                  id="form-default-model"
                  bind:value={formDefaultModel}
                  class="w-full bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl p-2.5 text-[#191B1D] outline-none focus:border-[#FF5500] cursor-pointer shadow-xs font-mono"
                >
                  {#if config?.antigravity?.availableModels}
                    {#each config.antigravity.availableModels as m}
                      <option value={m.id}>{m.name}</option>
                    {/each}
                  {:else}
                    <option value="gemini-3.8-flash-high">Gemini 3.8 Flash (High)</option>
                    <option value="gemini-3.8-flash-medium">Gemini 3.8 Flash (Medium)</option>
                    <option value="gemini-3.8-flash-low">Gemini 3.8 Flash (Fast)</option>
                    <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                    <option value="claude-opus-4-6-thinking">Claude Opus 4.6</option>
                  {/if}
                </select>
              </div>
            </div>
          </div>
        {/if}

        <!-- TELEGRAM BOT -->
        {#if activeTab === 'telegram'}
          <div class="flex flex-col gap-4">
            <div class="flex items-center gap-2">
              <input type="checkbox" id="form-tg-enabled" bind:checked={formTgEnabled} class="w-4 h-4 rounded cursor-pointer accent-[#FF5500]" />
              <label for="form-tg-enabled" class="font-bold text-[#191B1D] cursor-pointer font-mono">Aktifkan Telegram Bot Otomatis Saat Server Start</label>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-tg-persona" class="font-bold text-[#191B1D] font-mono uppercase tracking-wider">Persona AI Default Telegram:</label>
              <select
                id="form-tg-persona"
                bind:value={formTgPersonaId}
                class="bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl p-2.5 text-[#191B1D] font-mono outline-none focus:border-[#FF5500] cursor-pointer shadow-xs"
              >
                {#each personas as p}
                  <option value={p.id}>{getSafeEmoji(p.avatar)} {p.name} ({p.preferred_model || 'Flash'})</option>
                {/each}
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-tg-token" class="font-bold text-[#191B1D] font-mono uppercase tracking-wider">Telegram Bot Token:</label>
              <input
                id="form-tg-token"
                type="password"
                bind:value={formTgToken}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                class="bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl p-2.5 text-[#191B1D] font-mono outline-none focus:border-[#FF5500] shadow-xs"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-tg-users" class="font-bold text-[#191B1D] font-mono uppercase tracking-wider">Allowed Telegram User IDs / Usernames (Pisahkan koma):</label>
              <input
                id="form-tg-users"
                type="text"
                bind:value={formTgUsers}
                placeholder="Contoh: 12345678, @username"
                class="bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl p-2.5 text-[#191B1D] font-mono outline-none focus:border-[#FF5500] shadow-xs"
              />
              <span class="text-[11px] text-[#5C6066]">Jika kosong, semua pesan yang masuk ke bot akan diizinkan.</span>
            </div>
          </div>
        {/if}

        <!-- WHATSAPP BOT -->
        {#if activeTab === 'whatsapp'}
          <div class="flex flex-col gap-4">
            <div class="flex items-center gap-2">
              <input type="checkbox" id="form-wa-enabled" bind:checked={formWaEnabled} class="w-4 h-4 rounded cursor-pointer accent-[#FF5500]" />
              <label for="form-wa-enabled" class="font-bold text-[#191B1D] cursor-pointer font-mono">Aktifkan WhatsApp Bot Otomatis Saat Server Start</label>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-wa-persona" class="font-bold text-[#191B1D] font-mono uppercase tracking-wider">Persona AI Default WhatsApp:</label>
              <select
                id="form-wa-persona"
                bind:value={formWaPersonaId}
                class="bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl p-2.5 text-[#191B1D] font-mono outline-none focus:border-[#FF5500] cursor-pointer shadow-xs"
              >
                {#each personas as p}
                  <option value={p.id}>{getSafeEmoji(p.avatar)} {p.name} ({p.preferred_model || 'Flash'})</option>
                {/each}
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-wa-numbers" class="font-bold text-[#191B1D] font-mono uppercase tracking-wider">Allowed Phone Numbers (Pisahkan koma):</label>
              <input
                id="form-wa-numbers"
                type="text"
                bind:value={formWaNumbers}
                placeholder="Contoh: 6281234567890, 6289876543210"
                class="bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl p-2.5 text-[#191B1D] font-mono outline-none focus:border-[#FF5500] shadow-xs"
              />
              <span class="text-[11px] text-[#5C6066]">Hanya nomor yang terdaftar di atas yang dapat menjalankan perintah remote coding.</span>
            </div>
          </div>
        {/if}

        <!-- TUNNEL -->
        {#if activeTab === 'tunnel'}
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label for="form-tunnel-subdomain" class="font-bold text-[#191B1D] font-mono uppercase tracking-wider">Default Subdomain Public Tunnel:</label>
              <input
                id="form-tunnel-subdomain"
                type="text"
                bind:value={formTunnelSubdomain}
                placeholder="Contoh: zhiend-agent"
                class="bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl p-2.5 text-[#191B1D] font-mono outline-none focus:border-[#FF5500] shadow-xs"
              />
              <span class="text-[11px] text-[#5C6066]">Subdomain permanen yang akan digunakan saat memulai Public Tunnel.</span>
            </div>
          </div>
        {/if}

        <!-- VOICE / SPEECH-TO-TEXT -->
        {#if activeTab === 'voice'}
          <div class="flex flex-col gap-4">
            <div class="p-3.5 rounded-xl bg-[#E9E7E0] border border-[#C8C5BC] text-[#191B1D] flex flex-col gap-1.5">
              <span class="font-bold text-[#FF5500] flex items-center gap-1.5 font-mono uppercase tracking-wider">
                <Mic class="w-4 h-4" /> Pengaturan Transkripsi Suara (Voice Command)
              </span>
              <p class="text-[11px] text-[#5C6066] leading-relaxed">
                Digunakan untuk mengubah pesan suara (Voice Note di WhatsApp & Telegram) serta fallback suara Web Chat menjadi teks instruksi coding secara otomatis.
              </p>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-voice-provider" class="font-bold text-[#191B1D] font-mono uppercase tracking-wider">Penyedia Layanan (Transcription Engine):</label>
              <select
                id="form-voice-provider"
                bind:value={formVoiceProvider}
                class="bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl p-2.5 text-[#191B1D] outline-none focus:border-[#FF5500] cursor-pointer shadow-xs font-mono"
              >
                <option value="groq">Groq Whisper (Sangat Cepat ~0.8s & Gratis - Rekomendasi)</option>
                <option value="openai">OpenAI Whisper (whisper-1)</option>
                <option value="gemini">Google Gemini API (Multimodal Audio)</option>
              </select>
            </div>

            {#if formVoiceProvider === 'groq'}
              <div class="flex flex-col gap-1.5">
                <label for="form-voice-groq" class="font-bold text-[#191B1D] font-mono uppercase tracking-wider">Groq API Key:</label>
                <input
                  id="form-voice-groq"
                  type="password"
                  bind:value={formVoiceGroqKey}
                  placeholder="gsk_..."
                  class="bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl p-2.5 text-[#191B1D] font-mono outline-none focus:border-[#FF5500] shadow-xs"
                />
                <span class="text-[11px] text-[#5C6066]">
                  Dapatkan API Key gratis di <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" class="text-[#FF5500] hover:underline font-bold">console.groq.com/keys</a>.
                </span>
              </div>
            {:else if formVoiceProvider === 'openai'}
              <div class="flex flex-col gap-1.5">
                <label for="form-voice-openai" class="font-bold text-[#191B1D] font-mono uppercase tracking-wider">OpenAI API Key (Whisper):</label>
                <input
                  id="form-voice-openai"
                  type="password"
                  bind:value={formVoiceOpenaiKey}
                  placeholder="sk-..."
                  class="bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl p-2.5 text-[#191B1D] font-mono outline-none focus:border-[#FF5500] shadow-xs"
                />
              </div>
            {:else if formVoiceProvider === 'gemini'}
              <div class="flex flex-col gap-1.5">
                <label for="form-voice-gemini" class="font-bold text-[#191B1D] font-mono uppercase tracking-wider">Google Gemini API Key:</label>
                <input
                  id="form-voice-gemini"
                  type="password"
                  bind:value={formVoiceGeminiKey}
                  placeholder="AIzaSy..."
                  class="bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl p-2.5 text-[#191B1D] font-mono outline-none focus:border-[#FF5500] shadow-xs"
                />
              </div>
            {/if}

            <div class="flex flex-col gap-1.5">
              <label for="form-voice-lang" class="font-bold text-[#191B1D] font-mono uppercase tracking-wider">Bahasa Utama Perintah Suara:</label>
              <select
                id="form-voice-lang"
                bind:value={formVoiceLang}
                class="bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl p-2.5 text-[#191B1D] outline-none focus:border-[#FF5500] cursor-pointer shadow-xs font-mono"
              >
                <option value="id">Bahasa Indonesia (id)</option>
                <option value="en">English (en)</option>
                <option value="auto">Deteksi Otomatis (Auto)</option>
              </select>
            </div>
          </div>
        {/if}
      </div>

      <!-- Modal Footer -->
      <div class="px-4 sm:px-6 py-3.5 border-t border-[#C8C5BC] flex items-center justify-end gap-3 bg-[#E9E7E0] shrink-0">
        <button
          onclick={onClose}
          class="btn-hardware px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition shadow-xs"
        >
          Batal
        </button>
        <button
          onclick={handleSave}
          disabled={isSaving}
          class="btn-safety px-5 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <Save class="w-3.5 h-3.5" />
          {isSaving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
        </button>
      </div>

    </div>
  </div>
{/if}
