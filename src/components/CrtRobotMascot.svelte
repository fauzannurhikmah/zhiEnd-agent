<script lang="ts">
  let {
    isBusy = false,
    isListening = false,
    hasError = false,
    size = 'md'
  }: {
    isBusy?: boolean;
    isListening?: boolean;
    hasError?: boolean;
    size?: 'sm' | 'md' | 'lg';
  } = $props();

  const scaleClasses = {
    sm: 'scale-75 -my-2',
    md: 'scale-90 sm:scale-100',
    lg: 'scale-110 sm:scale-125'
  };

  let mascotRef = $state<HTMLDivElement | null>(null);
  let eyeOffsetX = $state(0);
  let eyeOffsetY = $state(0);
  let isHovered = $state(false);

  function handleMouseMove(e: MouseEvent) {
    if (!mascotRef || isBusy || isListening || hasError) return;
    const rect = mascotRef.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    // Bounded maximum offset for the pupil (-7px to +7px X, -5px to +5px Y)
    eyeOffsetX = Math.max(-7, Math.min(7, dx / 35));
    eyeOffsetY = Math.max(-5, Math.min(5, dy / 45));
  }
</script>

<svelte:window onmousemove={handleMouseMove} />

<!-- Retro-Futuristic CRT Robot Mascot (ChainGPT Labs Reference Style) -->
<div 
  bind:this={mascotRef}
  class="relative flex flex-col items-center select-none {scaleClasses[size] || scaleClasses.md}"
  role="img"
  aria-label="zhiEnd CRT Robot Mascot"
>
  
  <!-- Main Robot Monitor Head -->
  <div 
    role="img"
    aria-label="Interactive CRT Robot Mascot"
    class="relative w-40 h-36 bg-[#FCFCFA] rounded-none-[24px] border-2 border-[#D0CEC7] shadow-[0_16px_32px_-6px_rgba(0,0,0,0.12),0_4px_8px_rgba(0,0,0,0.04)] flex items-center justify-center p-2.5 transition-transform duration-200 hover:scale-[1.02] cursor-pointer"
    onmouseenter={() => isHovered = true}
    onmouseleave={() => isHovered = false}
  >
    
    <!-- Left & Right Hardware Pivot Dials -->
    <div class="absolute -left-2.5 top-1/2 -translate-y-1/2 w-3 h-8 bg-[#E5E3DD] border border-[#D0CEC7] rounded-none-l-md shadow-xs"></div>
    <div class="absolute -right-2.5 top-1/2 -translate-y-1/2 w-3 h-8 bg-[#E5E3DD] border border-[#D0CEC7] rounded-none-r-md shadow-xs"></div>

    <!-- Glowing Safety Orange/Amber Bevel Frame -->
    <div class="w-full h-full rounded-none-[18px] border-4 border-[#FFAA00] p-1.5 shadow-[0_0_18px_rgba(255,170,0,0.4),inset_0_0_10px_rgba(255,85,0,0.25)] flex items-center justify-center bg-gradient-to-br from-[#FF9500] to-[#FF5500]">
      
      <!-- Inner Deep Charcoal CRT Screen -->
      <div class="relative w-full h-full rounded-none-[12px] bg-[#101114] overflow-hidden flex items-center justify-center border border-black/40 shadow-inner crt-screen">
        
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
          <!-- Idle / Nominal State: Interactive Glowing Circular Dot-Matrix Eyes with Cursor Tracking -->
          <div 
            class="flex items-center gap-6 crt-eye transition-transform duration-100 ease-out"
            style="transform: translate({eyeOffsetX}px, {eyeOffsetY}px);"
          >
            {#if isHovered}
              <span class="text-white font-mono font-black text-xl select-none leading-none drop-shadow-[0_0_8px_#ffffff]">◠</span>
              <span class="text-white font-mono font-black text-xl select-none leading-none drop-shadow-[0_0_8px_#ffffff]">◠</span>
            {:else}
              <span class="w-3.5 h-3.5 rounded-none bg-white shadow-[0_0_10px_#ffffff,0_0_20px_#ffffff]"></span>
              <span class="w-3.5 h-3.5 rounded-none bg-white shadow-[0_0_10px_#ffffff,0_0_20px_#ffffff]"></span>
            {/if}
          </div>
        {/if}

        <!-- Subtle Screen Glare Arc -->
        <div class="absolute top-1 left-2 w-8 h-2 rounded-none bg-white/10 blur-[1px] -rotate-12 pointer-events-none"></div>
      </div>
    </div>
  </div>

  <!-- Robot Mount / Plinth Pedestal (Like in Reference Image) -->
  <div class="w-24 h-4 bg-[#E5E3DD] border-x border-b border-[#D0CEC7] rounded-none-b-md shadow-xs"></div>
  <div class="w-32 h-2 bg-[#DEDBD2] border-x border-b border-[#D0CEC7] rounded-none-b-lg"></div>
</div>

