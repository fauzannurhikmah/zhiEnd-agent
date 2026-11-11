<script lang="ts">
  // Reusable Subtle Retro-Futuristic HUD Background Matrix
  // Non-distracting, zero white panels, pure raw architectural telemetry
  // Engineered with strict collision avoidance for laptop/medium displays and ultra-wide monitors
  let { className = '' }: { className?: string } = $props();
</script>

<div class="absolute inset-0 pointer-events-none select-none overflow-hidden z-0 font-stencil text-[#7A7E85] {className}">
  <!-- ============================================================ -->
  <!-- TOP LEFT: CAD DRAFTING SPEC & TELEMETRY                      -->
  <!-- ============================================================ -->
  <!-- 2xl+ (Ultra-wide displays >= 1536px): Full blueprint paragraph spec -->
  <div class="absolute top-5 left-5 hidden 2xl:flex flex-col gap-1 max-w-[220px]">
    <div class="flex items-center gap-1.5 text-[9px] font-bold text-[#60646C] tracking-wider uppercase">
      <span class="w-1.5 h-1.5 bg-[#FF5500] inline-block shrink-0"></span>
      <span>SEC_01 // CAD_DRAFTING_SPEC</span>
      <span class="text-[#8C9097] text-[8px]">[042, 180]</span>
    </div>
    <div class="text-[7.5px] font-mono leading-tight text-[#7A7E85]/65 uppercase pl-3 border-l border-[#D0CEC7]/60">
      FIELD INSTRUMENT CORE REV_2.4.1<br />
      CHASSIS TOLERANCE: ±0.002 AL-6061<br />
      CALIBRATION: ARCHITECTURAL DATUM<br />
      CRC-32: 0x8F4E2A19 // VERIFIED OK
    </div>
  </div>

  <!-- xl only (Laptop displays 1280px-1535px): Compact single-line micro tag (zero card overlap) -->
  <div class="absolute top-4 left-4 hidden xl:flex 2xl:hidden items-center gap-1.5 text-[8.5px] font-bold text-[#60646C] tracking-wider uppercase font-mono">
    <span class="w-1.5 h-1.5 bg-[#FF5500] inline-block shrink-0"></span>
    <span>SEC_01</span>
    <span class="text-[#8C9097] text-[7.5px]">[042, 180]</span>
  </div>

  <!-- ============================================================ -->
  <!-- TOP RIGHT: INGRESS TELEMETRY & GATEWAY                        -->
  <!-- ============================================================ -->
  <!-- 2xl+ (Ultra-wide displays >= 1536px): Full ingress paragraph -->
  <div class="absolute top-5 right-6 text-right hidden 2xl:flex flex-col gap-1 max-w-[240px] items-end">
    <div class="flex items-center gap-1.5 text-[9px] font-mono font-bold text-[#60646C] tracking-widest uppercase">
      <span>[SYS_LAT: 38.88°N // LONG: 121.04°E]</span>
      <span class="text-[#FF5500]">✕</span>
    </div>
    <div class="text-[7.5px] font-mono leading-tight text-[#7A7E85]/65 uppercase pr-3 border-r border-[#D0CEC7]/60">
      SEC_02 // INGRESS REGISTER & TELEMETRY<br />
      FREQ: 144.00MHZ // CH_01A PASS-THROUGH<br />
      SPECTRAL DENSITY: 122.40 MICROVOLTS<br />
      BANDWIDTH GATE: UNCONGESTED // 100% OK
    </div>
  </div>

  <!-- xl only (Laptop displays 1280px-1535px): Compact single-line micro tag -->
  <div class="absolute top-4 right-5 hidden xl:flex 2xl:hidden items-center gap-1.5 text-[8.5px] font-mono font-bold text-[#60646C] tracking-wider uppercase">
    <span>[SYS_LAT: 38.88°N]</span>
    <span class="text-[#FF5500]">✕</span>
  </div>

  <!-- ============================================================ -->
  <!-- LEFT GUTTER: UNIFIED NON-OVERLAPPING VERTICAL RAIL           -->
  <!-- ============================================================ -->
  <!-- Uses flex justify-between inside fixed vertical track to guarantee zero overlapping text -->
  <div class="absolute top-16 bottom-24 left-2.5 sm:left-3 hidden lg:flex flex-col justify-between items-center [writing-mode:vertical-lr] text-[7.5px] font-mono tracking-widest uppercase pointer-events-none select-none max-h-[calc(100vh-160px)]">
    <!-- Top Segment -->
    <div class="flex items-center gap-1.5 text-[#8C9097]/70">
      <span class="text-[#FF5500]">■</span>
      <span class="font-bold text-[#60646C]">:: CAD_STREAM // REV_2.4</span>
    </div>

    <!-- Mid Segment (Adaptive for xl+) -->
    <div class="hidden xl:flex items-center gap-2 text-[#7A7E85]/55 text-[7px]">
      <span>SYS_LAT: 38.88°N</span>
      <span class="text-[#FF5500]/60">·</span>
      <span>DATUM: NOMINAL</span>
    </div>

    <!-- Bottom Segment (Adaptive for 2xl+) -->
    <div class="hidden 2xl:block text-[#8C9097]/45 text-[7px]">
      ISOLATION: HW_ENFORCED // BUFFER: 100%
    </div>
  </div>

  <!-- ============================================================ -->
  <!-- RIGHT GUTTER: UNIFIED NON-OVERLAPPING VERTICAL RAIL          -->
  <!-- ============================================================ -->
  <!-- Uses flex justify-between inside fixed vertical track to guarantee zero overlapping text -->
  <div class="absolute top-16 bottom-24 right-2.5 sm:right-3 hidden lg:flex flex-col justify-between items-center [writing-mode:vertical-lr] text-[7.5px] font-mono tracking-widest uppercase pointer-events-none select-none max-h-[calc(100vh-160px)]">
    <!-- Top Segment -->
    <div class="flex items-center gap-1.5 text-[#8C9097]/70">
      <span class="font-bold text-[#60646C]">:: GRID_SEAMS_NOMINAL</span>
      <span class="text-[#FF5500]">✕</span>
    </div>

    <!-- Mid Segment (Adaptive for xl+) -->
    <div class="hidden xl:flex items-center gap-2 text-[#7A7E85]/55 text-[7px]">
      <span>TEL_BUS // TX-3888</span>
      <span class="text-[#FF5500]/60">·</span>
      <span>SYNC: STABLE</span>
    </div>

    <!-- Bottom Segment (Adaptive for 2xl+) -->
    <div class="hidden 2xl:block text-[#8C9097]/45 text-[7px]">
      RF_CARRIER: 144MHZ // PASS_THROUGH
    </div>
  </div>

  <!-- ============================================================ -->
  <!-- BOTTOM LEFT: RUNTIME PROTOCOL (2xl+ Only)                     -->
  <!-- ============================================================ -->
  <div class="absolute bottom-14 left-5 hidden 2xl:flex flex-col gap-1 max-w-[240px]">
    <div class="flex items-center gap-1.5 text-[8.5px] font-bold text-[#60646C] tracking-wider uppercase">
      <span class="w-1.5 h-1.5 bg-[#FF5500] inline-block shrink-0"></span>
      <span>RUNTIME PROTOCOL // TX-3888</span>
    </div>
    <div class="text-[7.5px] font-mono leading-tight text-[#7A7E85]/65 uppercase pl-3 border-l border-[#D0CEC7]/60">
      PROTOCOL: AGY_SUBSYSTEM_V2.4<br />
      ENCRYPTION: SHA-256 HARDWARE MATRIX<br />
      LATENCY: 24MS // PASS-THROUGH // STATUS: READY
    </div>
  </div>

  <!-- ============================================================ -->
  <!-- BOTTOM RIGHT: MEMORY REGISTER (2xl+ Only)                    -->
  <!-- ============================================================ -->
  <div class="absolute bottom-14 right-6 text-right hidden 2xl:flex flex-col gap-1 max-w-[240px] items-end">
    <div class="font-mono text-[8.5px] font-bold text-[#60646C] tracking-widest uppercase">
      REG_ADDR: 0x7FFE_4A2B_0019
    </div>
    <div class="text-[7.5px] font-mono leading-tight text-[#7A7E85]/65 uppercase pr-3 border-r border-[#D0CEC7]/60">
      MEMORY TELEMETRY HEAP: 42.8MB<br />
      ALLOCATION LEAK: 0.000% // CLEAN GC<br />
      DUAL-CHANNEL RETICLE TX/RX: NOMINAL<br />
      SUBSYSTEM RUNTIME: CONTINUOUS STREAM
    </div>
  </div>

  <!-- ============================================================ -->
  <!-- PERIMETER ACCENTS: VIEWFINDER RETICLES (2xl+ Only, Outer Gutters) -->
  <!-- ============================================================ -->
  <!-- Strictly kept in wide outer margins (> 1536px), never intersecting central content -->
  <div class="absolute top-[20%] left-8 hidden 2xl:block text-[#9A9EA6]/50 font-mono text-[7px] leading-tight select-none">
    <div>┌ RETICLE [042, 180] ┐</div>
    <div class="pl-2 text-[#7A7E85]/50">STABILITY: NOMINAL</div>
    <div>└ DATUM OK ┘</div>
  </div>

  <div class="absolute bottom-[24%] right-8 hidden 2xl:block text-right text-[#9A9EA6]/50 font-mono text-[7px] leading-tight select-none">
    <div>┌ AL-6061 CHASSIS ┐</div>
    <div class="pr-2 text-[#7A7E85]/50">TOLERANCE ±0.002</div>
    <div>└ REGISTERED ┘</div>
  </div>

  <!-- Subtle Outer Crosshair Coordinate Marks (Perimeter Only, hidden on narrow viewports) -->
  <div class="absolute top-24 left-8 text-[9px] text-[#8C9097]/30 select-none font-mono hidden xl:block">✕ [042, 180]</div>
  <div class="absolute bottom-28 left-8 text-[9px] text-[#8C9097]/30 select-none font-mono hidden xl:block">+ [128, 480]</div>
  <div class="absolute top-24 right-8 text-[9px] text-[#8C9097]/30 select-none font-mono hidden xl:block">✕ [980, 720]</div>
  <div class="absolute bottom-28 right-8 text-[9px] text-[#8C9097]/30 select-none font-mono hidden xl:block">+ [860, 310]</div>

  <!-- Dot Matrix Triple Array Accent (Far Perimeter, 2xl+ Only) -->
  <div class="absolute top-[48%] left-2 text-[7px] tracking-widest text-[#8C9097]/35 [writing-mode:vertical-lr] hidden 2xl:block">
    :: :: :: :: ::
  </div>
  <div class="absolute top-[48%] right-2 text-[7px] tracking-widest text-[#8C9097]/35 [writing-mode:vertical-lr] hidden 2xl:block">
    :: :: :: :: ::
  </div>
</div>
