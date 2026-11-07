<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

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

  // Autonomous expressions and gazes
  type MascotExpression =
    | 'center'
    | 'look_left'
    | 'look_right'
    | 'look_up'
    | 'look_down'
    | 'blink'
    | 'double_blink'
    | 'smile'
    | 'happy'
    | 'love'
    | 'angry'
    | 'sad'
    | 'shy'
    | 'wink'
    | 'surprised'
    | 'curious'
    | 'sleepy'
    | 'coding';

  let autonomousMood = $state<MascotExpression>('center');
  let loopTimer: any = null;
  let resetTimer: any = null;

  // Base mood analyzed from message text or persona traits
  let baseContentMood = $derived.by<MascotExpression>(() => {
    if (!messageText) return 'center';
    const text = messageText.toLowerCase();

    if (/error|gagal|failed|exception|salah|warning|rusak/.test(text)) {
      return 'sad';
    }
    if (/ufufu|ara ara|nakal|senyum|sayang|manis|playful|menggoda|hehe|hihi|gemas/.test(text) || /playful|menggoda|nakal/.test((personaTraits || '').toLowerCase())) {
      return 'wink';
    }
    if (/berhasil|sukses|selesai|completed|done|success|mantap|keren/.test(text)) {
      return 'happy';
    }
    if (/cinta|love|suka|terima kasih|makasih|arigatou|hebat/.test(text)) {
      return 'love';
    }
    if (/marah|kesal|benci|bug|fatal|parah/.test(text)) {
      return 'angry';
    }
    if (/malu|blush|gemes|ciye/.test(text)) {
      return 'shy';
    }
    if (/\?|bagaimana|apakah|kenapa|mengapa/.test(text)) {
      return 'curious';
    }
    if (/```|git |npm |const |function|prisma|docker|terminal/.test(text)) {
      return 'coding';
    }

    return 'center';
  });

  // Dynamic autonomous behavior scheduler
  function scheduleNextAutonomousEvent() {
    // Random cycle interval between 2.2s and 4.6s
    const nextInterval = 2200 + Math.random() * 2400;

    loopTimer = setTimeout(() => {
      // Don't interrupt when busy, typing, or hovered
      if (isBusy || isUserTyping || isHovered) {
        scheduleNextAutonomousEvent();
        return;
      }

      // Pool of rich expressions and dynamic glances
      const candidates: MascotExpression[] = [
        // Gazes
        'look_left', 'look_right', 'look_up', 'look_down',
        'blink', 'double_blink',
        // Rich Emotions
        'smile', 'happy', 'love', 'shy', 'wink',
        'angry', 'sad', 'surprised', 'curious', 'sleepy',
        // Fallback natural centers
        'center', 'center'
      ];

      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      autonomousMood = chosen;

      // Handle blink duration vs emotion hold duration
      if (chosen === 'blink') {
        resetTimer = setTimeout(() => {
          autonomousMood = baseContentMood !== 'center' && Math.random() > 0.5 ? baseContentMood : 'center';
        }, 160);
      } else if (chosen === 'double_blink') {
        resetTimer = setTimeout(() => {
          autonomousMood = 'center';
          setTimeout(() => {
            autonomousMood = 'blink';
            setTimeout(() => {
              autonomousMood = 'center';
            }, 140);
          }, 100);
        }, 140);
      } else {
        // Hold expression/glance for 1.4s to 2.8s
        const holdDuration = 1400 + Math.random() * 1400;
        resetTimer = setTimeout(() => {
          autonomousMood = baseContentMood !== 'center' && Math.random() > 0.4 ? baseContentMood : 'center';
        }, holdDuration);
      }

      scheduleNextAutonomousEvent();
    }, nextInterval);
  }

  onMount(() => {
    scheduleNextAutonomousEvent();
  });

  onDestroy(() => {
    if (loopTimer) clearTimeout(loopTimer);
    if (resetTimer) clearTimeout(resetTimer);
  });

  // Effective mood with priority overrides
  let activeDisplayMood = $derived.by<string>(() => {
    if (isHovered) return 'hover_love';
    if (isBusy) return 'confused_calculating';
    if (isUserTyping) return 'typing_look_down';
    return autonomousMood;
  });
</script>

<!-- Mini Pixel Robot Buddy CRT Monitor (Super Expressive & Animated Companion) -->
<div
  role="img"
  aria-label="Super Expressive Mini Pixel Robot Companion"
  onmouseenter={() => isHovered = true}
  onmouseleave={() => isHovered = false}
  class="relative flex flex-col items-center select-none cursor-pointer group transition-transform duration-200 hover:scale-110 opacity-90 hover:opacity-100"
  title={isBusy ? 'Sedang menganalisis & menyusun respons...' : (isUserTyping ? 'Memperhatikan Anda mengetik...' : (isHovered ? 'Robot menyayangi Anda! ♥' : `Ekspresi Robot: ${activeDisplayMood}`))}
>
  <!-- Mini Monitor Chassis (Architectural Putty + Soft Aluminum Frame) -->
  <div class="relative w-9 h-[26px] bg-[#E5E3DD] border border-[#C8C5BC] p-0.5 rounded-none shadow-xs flex items-center justify-center">
    <!-- Top Hardware Mount Notch -->
    <div class="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-[#A8A59C]"></div>

    <!-- Soft Neutral Inner Bevel Frame -->
    <div class="w-full h-full bg-[#D0CEC7] p-0.5 rounded-none flex items-center justify-center">
      <!-- Deep Matte Obsidian CRT Screen -->
      <div class="relative w-full h-full bg-[#101114] overflow-hidden flex items-center justify-center crt-screen">
        <!-- Scanline Texture Overlay -->
        <div class="absolute inset-0 pointer-events-none opacity-25 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_2px]"></div>

        <!-- Animated Expression Display Container -->
        <div class="relative z-10 flex items-center justify-center transition-transform duration-200">
          {#if activeDisplayMood === 'blink'}
            <!-- Blink: Eyelids shut -->
            <div class="flex items-center gap-1 text-[#A8A59C] font-mono text-[8px] font-bold leading-none animate-in fade-in duration-75">
              <span>─</span>
              <span>─</span>
            </div>
          {:else if activeDisplayMood === 'hover_love' || activeDisplayMood === 'love'}
            <!-- Love: Heart Eyes (♥ ♥) with soft pulse -->
            <div class="flex items-center gap-0.5 text-[#f472b6] font-mono text-[9px] font-bold leading-none animate-pulse">
              <span class="scale-110">♥</span>
              <span class="scale-110">♥</span>
            </div>
          {:else if activeDisplayMood === 'happy'}
            <!-- Happy: Cheerful Eyes (^ ^) -->
            <div class="flex items-center gap-1 text-[#86efac] font-mono text-[8px] font-black leading-none animate-bounce">
              <span>^</span>
              <span>^</span>
            </div>
          {:else if activeDisplayMood === 'smile'}
            <!-- Smile: Soft gentle smile (˘ ˘) -->
            <div class="flex items-center gap-1 text-[#86efac] font-mono text-[8px] font-bold leading-none">
              <span>˘</span>
              <span>˘</span>
            </div>
          {:else if activeDisplayMood === 'angry'}
            <!-- Angry / Marah: (> < or \ /) with micro shake & flame phosphor -->
            <div class="flex items-center gap-0.5 text-[#fb923c] font-mono text-[8px] font-black leading-none animate-pulse">
              <span class="inline-block transform -rotate-12">\</span>
              <span class="inline-block transform rotate-12">/</span>
            </div>
          {:else if activeDisplayMood === 'sad'}
            <!-- Sad / Sedih: (T T) with crying tear drops -->
            <div class="flex items-center gap-1 text-[#67e8f9] font-mono text-[8px] font-bold leading-none">
              <span class="text-[#38bdf8]">T</span>
              <span class="text-[#38bdf8]">T</span>
            </div>
          {:else if activeDisplayMood === 'shy'}
            <!-- Shy / Malu: (> <) with rosy blush dots -->
            <div class="flex flex-col items-center leading-none">
              <div class="flex items-center gap-1 text-[#fda4af] font-mono text-[7px] font-bold">
                <span>&gt;</span>
                <span>&lt;</span>
              </div>
              <div class="flex items-center gap-2 text-[#f43f5e] font-mono text-[6px] -mt-0.5 opacity-80">
                <span>·</span>
                <span>·</span>
              </div>
            </div>
          {:else if activeDisplayMood === 'wink'}
            <!-- Wink / Centil: (★ <) -->
            <div class="flex items-center gap-0.5 text-[#fde047] font-mono text-[8px] font-bold leading-none">
              <span class="text-[#FF5500]">★</span>
              <span class="text-[#DCDAD4]">&lt;</span>
            </div>
          {:else if activeDisplayMood === 'surprised'}
            <!-- Surprised / Kaget: (O O) -->
            <div class="flex items-center gap-1 text-[#fde047] font-mono text-[8px] font-black leading-none scale-105">
              <span>O</span>
              <span>O</span>
            </div>
          {:else if activeDisplayMood === 'sleepy'}
            <!-- Sleepy: (- -) or (z Z) -->
            <div class="flex items-center gap-1 text-[#A8A59C] font-mono text-[8px] font-bold leading-none">
              <span>-</span>
              <span>-</span>
            </div>
          {:else if activeDisplayMood === 'curious'}
            <!-- Curious / Penasaran: (• ?) -->
            <div class="flex items-center gap-0.5 text-[#93c5fd] font-mono text-[8px] font-bold leading-none">
              <span>•</span>
              <span class="text-[#fde047] font-black">?</span>
            </div>
          {:else if activeDisplayMood === 'coding'}
            <!-- Coding / Matrix scan: (■ ■) -->
            <div class="flex items-center gap-1 text-[#86efac] font-mono text-[7px] font-bold leading-none">
              <span class="inline-block w-1.5 h-1.5 bg-[#86efac]"></span>
              <span class="inline-block w-1.5 h-1.5 bg-[#86efac]"></span>
            </div>
          {:else if activeDisplayMood === 'look_left'}
            <!-- Looking Left (◄ ◄) -->
            <div class="flex items-center gap-0.5 text-[#DCDAD4] font-mono text-[8px] font-bold leading-none pr-1">
              <span>◄</span>
              <span>◄</span>
            </div>
          {:else if activeDisplayMood === 'look_right'}
            <!-- Looking Right (► ►) -->
            <div class="flex items-center gap-0.5 text-[#DCDAD4] font-mono text-[8px] font-bold leading-none pl-1">
              <span>►</span>
              <span>►</span>
            </div>
          {:else if activeDisplayMood === 'look_up'}
            <!-- Looking Up (▲ ▲) -->
            <div class="flex items-center gap-1 text-[#DCDAD4] font-mono text-[8px] font-bold leading-none -mt-0.5">
              <span>▲</span>
              <span>▲</span>
            </div>
          {:else if activeDisplayMood === 'look_down' || activeDisplayMood === 'typing_look_down'}
            <!-- User typing / Looking Down (▼ ▼) -->
            <div class="flex items-center gap-1 text-[#fde047] font-mono text-[8px] font-bold leading-none mt-0.5">
              <span>▼</span>
              <span>▼</span>
            </div>
          {:else if activeDisplayMood === 'confused_calculating'}
            <!-- Calculating / AI Thinking (? ~) -->
            <div class="flex items-center gap-0.5 text-[#fb923c] font-mono text-[8px] font-bold leading-none animate-pulse">
              <span class="animate-spin inline-block">?</span>
              <span class="text-amber-300">~</span>
            </div>
          {:else}
            <!-- Nominal Center: Dot-Matrix Phosphor Eyes (● ●) -->
            <div class="flex items-center gap-1 text-[#DCDAD4] font-mono text-[8px] leading-none">
              <span class="inline-block w-1 h-1 bg-[#DCDAD4] shadow-[0_0_2px_#DCDAD4]"></span>
              <span class="inline-block w-1 h-1 bg-[#DCDAD4] shadow-[0_0_2px_#DCDAD4]"></span>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Soft Micro Status Diode Under Chassis -->
  <div class="flex items-center gap-0.5 mt-0.5 opacity-70">
    <span class="w-1 h-1 {isBusy ? 'bg-[#f97316] animate-ping' : (activeDisplayMood === 'hover_love' ? 'bg-[#f472b6] animate-pulse' : 'bg-[#86efac]')}"></span>
    <span class="font-stencil text-[6.5px] text-[#71717a] leading-none uppercase tracking-tighter">
      {isBusy ? 'CALC' : (isUserTyping ? 'LOOK' : (activeDisplayMood === 'hover_love' ? 'LOVE' : 'BOT'))}
    </span>
  </div>
</div>
