<script lang="ts">
  // Reusable Subtle Retro-Futuristic HUD Background Matrix
  // Non-distracting, zero white panels, pure raw architectural telemetry & random paragraphs
  let { className = '' }: { className?: string } = $props();
</script>

<div class="absolute inset-0 pointer-events-none select-none overflow-hidden z-0 font-stencil text-[#7A7E85] {className}">
  <!-- Top Left: Section 01 Header & Paragraph Spec -->
  <div class="absolute top-5 left-5 hidden sm:flex flex-col gap-1 max-w-[220px]">
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

  <!-- Top Left: Micro Vertical Spec -->
  <div class="absolute top-28 left-4 text-[7px] [writing-mode:vertical-lr] tracking-widest uppercase hidden lg:block text-[#8C9097]/50 font-mono">
    SYS_LAT: 38.88°N // REF_GRID: ASYM_04 // DATUM_NOMINAL
  </div>

  <!-- Mid Left Gutter: Vertical Ribbon & Status -->
  <div class="absolute top-[38%] left-3 text-[8px] [writing-mode:vertical-lr] tracking-widest uppercase hidden md:flex items-center gap-2 text-[#7A7E85]/70">
    <span class="text-[#FF5500]">■</span>
    <span class="font-bold">:: SEC_04 // CAD_MATRIX_STREAM :: REV_2.4.1</span>
    <span class="text-[#9A9EA6] text-[7.5px]">BUS_RATE: 1024KB/S // PACKET_BUFFER: 100% NOMINAL</span>
  </div>

  <!-- Mid Left Gutter: Micro Isolation Note -->
  <div class="absolute top-[58%] left-4 text-[7px] [writing-mode:vertical-lr] tracking-widest uppercase hidden lg:block text-[#8C9097]/45 font-mono">
    ISOLATION GATE: HARDWARE ENFORCED // NO LEAK DETECTED
  </div>

  <!-- Lower Left Gutter: Telemetry Gateway Paragraph -->
  <div class="absolute bottom-16 left-5 hidden sm:flex flex-col gap-1 max-w-[240px]">
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

  <!-- Top Right: Section 02 Telemetry Header & Ingress Paragraph -->
  <div class="absolute top-5 right-6 text-right hidden sm:flex flex-col gap-1 max-w-[240px] items-end">
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

  <!-- Top Right: Micro Vertical Ingress Trace -->
  <div class="absolute top-28 right-4 text-[7px] [writing-mode:vertical-lr] tracking-widest uppercase hidden lg:block text-[#8C9097]/50 font-mono">
    RF_CARRIER: NOMINAL // BAND_WIDTH: 20MHZ // CH_01A
  </div>

  <!-- Mid Right Gutter: Vertical System Ribbon -->
  <div class="absolute top-[38%] right-3 text-[8px] [writing-mode:vertical-lr] tracking-widest uppercase hidden md:flex items-center gap-2 text-[#7A7E85]/70">
    <span class="font-bold">:: DRAFTING GRID SEAMS NOMINAL :: BUFFER 100% OK</span>
    <span class="text-[#FF5500]">✕</span>
    <span class="text-[#9A9EA6] text-[7.5px]">TEL_BUS // TX-3888 // PASS_THROUGH // SYNC: STABLE</span>
  </div>

  <!-- Mid Right Gutter: Cooling & Thermal Vertical Note -->
  <div class="absolute top-[60%] right-4 text-[7px] [writing-mode:vertical-lr] tracking-widest uppercase hidden lg:block text-[#8C9097]/45 font-mono">
    PASSIVE CONVECTIVE CHASSIS COOLING // 18.2°C NOMINAL
  </div>

  <!-- Lower Right Gutter: Memory Register & Buffer Paragraph -->
  <div class="absolute bottom-16 right-6 text-right hidden sm:flex flex-col gap-1 max-w-[240px] items-end">
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

  <!-- Subtle Scattered Viewfinder Reticles & Drafting Coordinates (Perimeter Accents) -->
  <div class="absolute top-[18%] left-[16%] hidden xl:block text-[#9A9EA6]/60 font-mono text-[7px] leading-tight select-none">
    <div>┌ RETICLE [042, 180] ┐</div>
    <div class="pl-2 text-[#7A7E85]/55">STABILITY: NOMINAL</div>
    <div>└ DATUM OK ┘</div>
  </div>

  <div class="absolute bottom-[24%] right-[18%] hidden xl:block text-right text-[#9A9EA6]/60 font-mono text-[7px] leading-tight select-none">
    <div>┌ AL-6061 CHASSIS ┐</div>
    <div class="pr-2 text-[#7A7E85]/55">TOLERANCE ±0.002</div>
    <div>└ REGISTERED ┘</div>
  </div>

  <!-- Subtle Corner Crosshairs & Registration Markers -->
  <div class="absolute top-20 left-[24%] text-[10px] text-[#8C9097]/35 select-none font-mono">✕ [042, 180]</div>
  <div class="absolute top-[54%] left-[26%] text-[10px] text-[#8C9097]/35 select-none font-mono">+ [128, 480]</div>
  <div class="absolute top-[28%] right-[22%] text-[10px] text-[#8C9097]/35 select-none font-mono">✕ [980, 720]</div>
  <div class="absolute bottom-[32%] right-[25%] text-[10px] text-[#8C9097]/35 select-none font-mono">+ [860, 310]</div>

  <!-- Dot Matrix Triple Array Accent -->
  <div class="absolute top-[50%] left-[2.5%] text-[7px] tracking-widest text-[#8C9097]/40 [writing-mode:vertical-lr] hidden 2xl:block">
    :: :: :: :: :: :: ::
  </div>
  <div class="absolute top-[50%] right-[2.5%] text-[7px] tracking-widest text-[#8C9097]/40 [writing-mode:vertical-lr] hidden 2xl:block">
    :: :: :: :: :: :: ::
  </div>
</div>

