<script lang="ts">
  import { onMount } from 'svelte';

  let {
    isBusy = false,
    isUserTyping = false,
    messageText = '',
    personaTraits = ''
  }: {
    isBusy?: boolean;
    isUserTyping?: boolean;
    messageText?: string;
    personaTraits?: string;
  } = $props();

  let isHovered = $state(false);
  let isBlinking = $state(false);
  let blinkTimer: any = null;

  // Periodic natural eye-blink (every 3.5 to 5.5 seconds)
  onMount(() => {
    function scheduleBlink() {
      const delay = 3200 + Math.random() * 2400;
      blinkTimer = setTimeout(() => {
        isBlinking = true;
        setTimeout(() => {
          isBlinking = false;
          scheduleBlink();
        }, 160);
      }, delay);
    }
    scheduleBlink();
    return () => {
      if (blinkTimer) clearTimeout(blinkTimer);
    };
  });

  // Dynamic Mood Analysis based on message content & persona traits
  let contentMood = $derived.by(() => {
    if (!messageText) return 'normal';
    const text = messageText.toLowerCase();

    // 1. Error / Failure
    if (/error|gagal|failed|exception|salah|warning|bahaya/.test(text)) {
      return 'error';
    }
    // 2. Playful / Flirty / Teasing (e.g. Kurumi traits, Ufufu, Ara ara, hehe)
    if (/ufufu|ara ara|nakal|senyum|sayang|manis|playful|menggoda|hehe|hihi|wkwk|gemas/.test(text) || /playful|menggoda|nakal/.test((personaTraits || '').toLowerCase())) {
      return 'playful';
    }
    // 3. Success / Completed
    if (/berhasil|sukses|selesai|completed|done|success|mantap/.test(text)) {
      return 'success';
    }
    // 4. Code / Technical / Terminal
    if (/```|git |npm |pnpm |const |function|prisma|docker|terminal|branch|commit/.test(text)) {
      return 'coding';
    }
    // 5. Question / Curious
    if (/\?|bagaimana|apakah|kenapa|mengapa/.test(text)) {
      return 'curious';
    }

    return 'normal';
  });

  // Active Display Mode Resolution
  let currentMood = $derived.by(() => {
    if (isHovered) return 'happy';
    if (isBusy) return 'confused'; // Lagi loading response: ekspresi bingung / mikir keras
    if (isUserTyping) return 'looking_down'; // User lagi ngetik: matanya melihat ke arah chatbox
    return contentMood;
  });
</script>

<!-- Mini Pixel Robot Buddy CRT Monitor -->
<div
  role="img"
  aria-label="Mini Pixel Robot Mascot Companion"
  onmouseenter={() => isHovered = true}
  onmouseleave={() => isHovered = false}
  class="relative flex flex-col items-center select-none cursor-pointer group transition-transform duration-150 hover:scale-105"
  title={isBusy ? 'Lagi menganalisis dan berpikir...' : (isUserTyping ? 'Memperhatikan Anda mengetik...' : (isHovered ? 'Senang melihat Anda!' : `Mood: ${currentMood}`))}
>
  <!-- Mini Monitor Chassis (Architectural Putty + Orange Bevel) -->
  <div class="relative w-9 h-7 bg-[#FCFCFA] border border-[#D0CEC7] p-0.5 rounded-none shadow-2xs flex items-center justify-center">
    <!-- Top Hardware Mount Notch -->
    <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-0.5 bg-[#FF5500]"></div>

    <!-- Safety Orange Inner Bevel -->
    <div class="w-full h-full bg-[#FF5500] p-0.5 rounded-none flex items-center justify-center">
      <!-- Deep Charcoal CRT Void Screen -->
      <div class="relative w-full h-full bg-[#101114] overflow-hidden flex items-center justify-center crt-screen">
        <!-- Scanline Texture Overlay -->
        <div class="absolute inset-0 pointer-events-none opacity-25 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_2px]"></div>

        <!-- Expression Visualizer Screen -->
        {#if isBlinking && currentMood !== 'confused'}
          <!-- Blinking State -->
          <div class="flex items-center gap-1.5 text-white/80 font-mono text-[9px] font-bold leading-none">
            <span>─</span>
            <span>─</span>
          </div>
        {:else if currentMood === 'happy'}
          <!-- Hover State: Senyum Lebar Bahagia (◠ ◠) -->
          <div class="flex flex-col items-center leading-none">
            <div class="flex items-center gap-1 text-emerald-400 font-mono text-[9px] font-black drop-shadow-[0_0_4px_#34d399]">
              <span>^</span>
              <span>^</span>
            </div>
            <span class="text-amber-400 font-mono text-[7px] leading-none -mt-0.5">⌣</span>
          </div>
        {:else if currentMood === 'looking_down'}
          <!-- User Lagi Ngetik: Mata melihat ke bawah ke arah chat box (▼ ▼) -->
          <div class="flex items-center gap-1.5 text-amber-300 font-mono text-[9px] font-black drop-shadow-[0_0_4px_#f59e0b] animate-bounce">
            <span class="leading-none">▼</span>
            <span class="leading-none">▼</span>
          </div>
        {:else if currentMood === 'confused'}
          <!-- Loading Response: Ekspresi Bingung / Mikir Keras (? ?) -->
          <div class="flex items-center gap-1 text-[#FF5500] font-mono text-[9px] font-black drop-shadow-[0_0_4px_#FF5500] animate-pulse">
            <span class="animate-spin inline-block">?</span>
            <span class="text-amber-300">~</span>
          </div>
        {:else if currentMood === 'playful'}
          <!-- Playful / Flirty (Tokisaki Kurumi): Wink & Star (★ <) -->
          <div class="flex items-center gap-1 text-amber-300 font-mono text-[9px] font-black drop-shadow-[0_0_4px_#f59e0b]">
            <span class="text-[#FF5500]">★</span>
            <span class="text-white font-bold">&lt;</span>
          </div>
        {:else if currentMood === 'coding'}
          <!-- Coding / Tech: Hacker Terminal Blocks ([■][■]) -->
          <div class="flex items-center gap-1 text-emerald-400 font-mono text-[8px] font-bold drop-shadow-[0_0_4px_#34d399]">
            <span class="inline-block w-1.5 h-1.5 bg-emerald-400"></span>
            <span class="inline-block w-1.5 h-1.5 bg-emerald-400"></span>
          </div>
        {:else if currentMood === 'success'}
          <!-- Success: Bintang Gembira (★ ★) -->
          <div class="flex items-center gap-1 text-amber-300 font-mono text-[9px] font-black drop-shadow-[0_0_4px_#f59e0b]">
            <span>★</span>
            <span>★</span>
          </div>
        {:else if currentMood === 'error'}
          <!-- Error / Gagal: Silang Peringatan (✖ ✖) -->
          <div class="flex items-center gap-1 text-rose-500 font-mono text-[9px] font-black animate-pulse">
            <span>✖</span>
            <span>✖</span>
          </div>
        {:else if currentMood === 'curious'}
          <!-- Tanya / Penasaran (• ?) -->
          <div class="flex items-center gap-1 text-sky-400 font-mono text-[9px] font-black">
            <span>•</span>
            <span class="text-amber-300">?</span>
          </div>
        {:else}
          <!-- Default Nominal: Dot-Matrix Pixel Eyes (● ●) -->
          <div class="flex items-center gap-1.5">
            <span class="inline-block w-1.5 h-1.5 bg-white shadow-[0_0_4px_#ffffff]"></span>
            <span class="inline-block w-1.5 h-1.5 bg-white shadow-[0_0_4px_#ffffff]"></span>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Micro Status Diode Under Chassis -->
  <div class="flex items-center gap-0.5 mt-0.5">
    <span class="w-1 h-1 {isBusy ? 'bg-[#FF5500] animate-ping' : (currentMood === 'happy' ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500')}"></span>
    <span class="font-stencil text-[7px] text-[#60646C] leading-none uppercase tracking-tighter">
      {isBusy ? 'CALC' : (isUserTyping ? 'LOOK' : 'BOT')}
    </span>
  </div>
</div>

