<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let {
    isBusy = false,
    isListening = false,
    hasError = false,
    size = 'md',
    mousePos = null
  }: {
    isBusy?: boolean;
    isListening?: boolean;
    hasError?: boolean;
    size?: 'sm' | 'md' | 'lg';
    mousePos?: { x: number; y: number } | null;
  } = $props();

  const scaleClasses = {
    sm: 'scale-75 -my-2',
    md: 'scale-90 sm:scale-100',
    lg: 'scale-110 sm:scale-125'
  };

  let mascotRef = $state<HTMLDivElement | null>(null);
  let headRef = $state<HTMLDivElement | null>(null);

  let isHovered = $state(false);
  let isPoked = $state(false);
  let isBlinking = $state(false);

  // Directly reactive gaze offsets
  let eyeX = $state(0);
  let eyeY = $state(0);
  let headTiltX = $state(0);
  let headTiltY = $state(0);

  let blinkTimer: any = null;
  let pokeTimer: any = null;

  function updateGaze(clientX: number, clientY: number) {
    if (!mascotRef || isBusy || isListening || hasError) return;
    const rect = mascotRef.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 6) {
      eyeX = 0;
      eyeY = 0;
      headTiltX = 0;
      headTiltY = 0;
      return;
    }

    const angle = Math.atan2(dy, dx);

    // Fast, responsive saturation: reaches full gaze range within 150px radius
    const saturationDist = 150;
    const factor = Math.min(dist / saturationDist, 1);

    // Generous, clearly visible gaze bounds inside CRT screen
    const maxEyeX = 16;
    const maxEyeY = 11;

    eyeX = Math.round(Math.cos(angle) * factor * maxEyeX * 10) / 10;
    eyeY = Math.round(Math.sin(angle) * factor * maxEyeY * 10) / 10;

    // Responsive 3D physical head tilt
    const headFactor = Math.min(dist / 350, 1);
    headTiltY = Math.round(Math.max(-8, Math.min(8, (dx / 350) * 8 * headFactor)) * 10) / 10;
    headTiltX = Math.round(Math.max(-6, Math.min(6, (-dy / 350) * 6 * headFactor)) * 10) / 10;
  }

  // React immediately whenever parent passes mouse coordinates
  $effect(() => {
    if (mousePos && typeof mousePos.x === 'number' && typeof mousePos.y === 'number') {
      updateGaze(mousePos.x, mousePos.y);
    }
  });

  function handleWindowMouseMove(e: MouseEvent) {
    updateGaze(e.clientX, e.clientY);
  }

  function handleMouseLeave() {
    eyeX = 0;
    eyeY = 0;
    headTiltX = 0;
    headTiltY = 0;
  }

  function handlePoke() {
    isPoked = true;
    if (pokeTimer) clearTimeout(pokeTimer);
    pokeTimer = setTimeout(() => {
      isPoked = false;
    }, 850);
  }

  function scheduleBlink() {
    const delay = Math.random() * 3200 + 2000;
    blinkTimer = setTimeout(() => {
      isBlinking = true;
      setTimeout(() => {
        isBlinking = false;
        if (Math.random() < 0.25) {
          setTimeout(() => {
            isBlinking = true;
            setTimeout(() => {
              isBlinking = false;
              scheduleBlink();
            }, 75);
          }, 95);
        } else {
          scheduleBlink();
        }
      }, 110);
    }, delay);
  }

  onMount(() => {
    scheduleBlink();
    window.addEventListener('mousemove', handleWindowMouseMove, { passive: true });
    window.addEventListener('pointermove', handleWindowMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });
  });

  onDestroy(() => {
    window.removeEventListener('mousemove', handleWindowMouseMove);
    window.removeEventListener('pointermove', handleWindowMouseMove);
    window.removeEventListener('mouseleave', handleMouseLeave);
    if (blinkTimer) clearTimeout(blinkTimer);
    if (pokeTimer) clearTimeout(pokeTimer);
  });
</script>

<svelte:window onmousemove={handleWindowMouseMove} onmouseleave={handleMouseLeave} />

<!-- Retro-Futuristic CRT Robot Mascot (ChainGPT Labs & Teenage Engineering Reference Style) -->
<div 
  bind:this={mascotRef}
  class="relative flex flex-col items-center select-none {scaleClasses[size] || scaleClasses.md}"
  role="img"
  aria-label="zhiEnd CRT Robot Mascot"
  style="perspective: 700px;"
>
  
  <!-- Main Robot Monitor Head with 3D Parallax Follow -->
  <div 
    bind:this={headRef}
    role="button"
    tabindex="0"
    aria-label="Interactive CRT Robot Mascot"
    class="relative w-40 h-36 bg-[#FCFCFA] rounded-none border-2 border-[#D0CEC7] shadow-[0_16px_32px_-6px_rgba(0,0,0,0.14),0_4px_8px_rgba(0,0,0,0.04)] flex items-center justify-center p-2.5 cursor-pointer will-change-transform"
    style="transform: rotateX({headTiltX}deg) rotateY({headTiltY}deg) {isPoked ? 'scale(0.96)' : (isHovered ? 'scale(1.02)' : 'scale(1)')}; transition: transform 0.08s ease-out;"
    onmouseenter={() => isHovered = true}
    onmouseleave={() => isHovered = false}
    onclick={handlePoke}
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePoke(); }}
  >
    
    <!-- Left & Right Hardware Pivot Dials -->
    <div class="absolute -left-2.5 top-1/2 -translate-y-1/2 w-3 h-8 bg-[#E5E3DD] border border-[#D0CEC7] rounded-none shadow-xs"></div>
    <div class="absolute -right-2.5 top-1/2 -translate-y-1/2 w-3 h-8 bg-[#E5E3DD] border border-[#D0CEC7] rounded-none shadow-xs"></div>

    <!-- Glowing Safety Orange/Amber Bevel Frame -->
    <div class="w-full h-full rounded-none border-4 border-[#FFAA00] p-1.5 shadow-[0_0_18px_rgba(255,170,0,0.4),inset_0_0_10px_rgba(255,85,0,0.25)] flex items-center justify-center bg-gradient-to-br from-[#FF9500] to-[#FF5500]">
      
      <!-- Inner Deep Charcoal CRT Screen -->
      <div class="relative w-full h-full rounded-none bg-[#101114] overflow-hidden flex items-center justify-center border border-black/40 shadow-inner crt-screen">
        
        <!-- Subtle Scanline Lines Overlay -->
        <div class="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]"></div>

        <!-- Dot-Matrix Pixel Face Displays -->
        {#if hasError}
          <!-- Error State: Alert Crosses -->
          <div class="flex items-center gap-5 text-rose-500 font-mono text-xl font-black animate-pulse">
            <span>✖</span>
            <span>✖</span>
          </div>
        {:else if isListening}
          <!-- Voice Listening State: Audio Reactive Concentric Dots -->
          <div class="flex items-center gap-5 text-amber-300 text-lg">
            <span class="w-4 h-4 rounded-none border-2 border-amber-300 flex items-center justify-center animate-ping">
              <span class="w-2 h-2 rounded-none bg-white"></span>
            </span>
            <span class="w-4 h-4 rounded-none border-2 border-amber-300 flex items-center justify-center animate-ping delay-100">
              <span class="w-2 h-2 rounded-none bg-white"></span>
            </span>
          </div>
        {:else if isBusy}
          <!-- Busy / Thinking State: Arrow Nodes -->
          <div class="flex items-center gap-5 text-[#FF5500] font-mono text-base font-black">
            <span class="animate-bounce">▲</span>
            <span class="animate-bounce delay-150">▲</span>
          </div>
        {:else}
          <!-- Idle / Nominal State: Interactive Glowing Dot-Matrix Eyes with Smooth Cursor Tracking & Organic Blinking -->
          <div 
            class="flex items-center gap-6 will-change-transform"
            style="transform: translate3d({eyeX}px, {eyeY}px, 0); transition: transform 0.08s cubic-bezier(0.2, 0, 0, 1);"
          >
            {#if isBlinking}
              <!-- Blinking State: Narrow horizontal slit -->
              <span class="w-4 h-0.5 rounded-none bg-white/90 shadow-[0_0_8px_#ffffff]"></span>
              <span class="w-4 h-0.5 rounded-none bg-white/90 shadow-[0_0_8px_#ffffff]"></span>
            {:else if isPoked}
              <!-- Poked / Surprised Sparkle State -->
              <span class="text-amber-300 font-mono font-black text-xl select-none leading-none drop-shadow-[0_0_10px_#fde047] animate-pulse">✦</span>
              <span class="text-amber-300 font-mono font-black text-xl select-none leading-none drop-shadow-[0_0_10px_#fde047] animate-pulse">✦</span>
            {:else if isHovered}
              <!-- Hovered State: Happy Smile Arcs -->
              <span class="text-white font-mono font-black text-xl select-none leading-none drop-shadow-[0_0_8px_#ffffff] -translate-y-0.5">◠</span>
              <span class="text-white font-mono font-black text-xl select-none leading-none drop-shadow-[0_0_8px_#ffffff] -translate-y-0.5">◠</span>
            {:else}
              <!-- Nominal Glowing Pixel Eyes (Bold Square Dot-Matrix) -->
              <span class="w-4 h-4 rounded-none bg-white shadow-[0_0_12px_#ffffff,0_0_24px_rgba(255,255,255,0.7)]"></span>
              <span class="w-4 h-4 rounded-none bg-white shadow-[0_0_12px_#ffffff,0_0_24px_rgba(255,255,255,0.7)]"></span>
            {/if}
          </div>
        {/if}

        <!-- Subtle Screen Glare Arc -->
        <div class="absolute top-1 left-2 w-8 h-2 rounded-none bg-white/10 blur-[1px] -rotate-12 pointer-events-none"></div>
      </div>
    </div>
  </div>

  <!-- Robot Mount / Plinth Pedestal (Like in Reference Image) -->
  <div class="w-24 h-4 bg-[#E5E3DD] border-x border-b border-[#D0CEC7] rounded-none shadow-xs"></div>
  <div class="w-32 h-2 bg-[#DEDBD2] border-x border-b border-[#D0CEC7] rounded-none"></div>
</div>
