<script lang="ts">
  let {
    avatar,
    name = 'Avatar',
    size = 'md',
    className = ''
  }: {
    avatar?: string | null;
    name?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
  } = $props();

  let hasImageError = $state(false);
  let retryCount = $state(0);

  $effect(() => {
    if (avatar) {
      hasImageError = false;
      retryCount = 0;
    }
  });

  const isVideo = $derived(() => {
    if (!avatar || hasImageError) return false;
    const str = avatar.trim().toLowerCase();
    return str.startsWith('data:video/') || 
           str.endsWith('.mp4') || 
           str.endsWith('.webm') || 
           str.endsWith('.mov') || 
           str.endsWith('.ogg');
  });

  const isImage = $derived(() => {
    if (!avatar || hasImageError) return false;
    const str = avatar.trim().toLowerCase();
    return str.startsWith('data:image/') || 
           str.startsWith('http://') || 
           str.startsWith('https://') || 
           str.startsWith('/uploads/') ||
           str.endsWith('.gif') || 
           str.endsWith('.png') || 
           str.endsWith('.jpg') || 
           str.endsWith('.jpeg') || 
           str.endsWith('.webp') || 
           str.endsWith('.svg');
  });

  function handleImageError(e: Event) {
    if (retryCount < 2) {
      retryCount++;
      const target = e.target as HTMLImageElement;
      if (target && avatar) {
        const sep = avatar.includes('?') ? '&' : '?';
        target.src = `${avatar}${sep}retry=${retryCount}&t=${Date.now()}`;
        return;
      }
    }
    hasImageError = true;
  }

  const sizeClasses = {
    xs: 'w-4 h-4 text-[10px] rounded-md',
    sm: 'w-6 h-6 text-xs rounded-lg',
    md: 'w-8 h-8 text-sm rounded-xl',
    lg: 'w-11 h-11 text-lg rounded-2xl',
    xl: 'w-16 h-16 text-2xl rounded-2xl'
  };
</script>

<div 
  class="relative inline-flex items-center justify-center shrink-0 overflow-hidden bg-zinc-900 border border-white/10 shadow-sm {sizeClasses[size] || sizeClasses.md} {className}"
  title={name}
>
  {#if isVideo()}
    <video
      src={avatar}
      autoplay
      loop
      muted
      playsinline
      class="w-full h-full object-cover pointer-events-none"
    ></video>
  {:else if isImage()}
    <img
      src={avatar}
      alt={name}
      loading="lazy"
      onerror={handleImageError}
      class="w-full h-full object-cover"
    />
  {:else}
    <span class="font-emoji select-none flex items-center justify-center leading-none">
      {avatar && avatar.length <= 4 ? avatar : (name ? name.slice(0, 1).toUpperCase() : '🤖')}
    </span>
  {/if}
</div>
