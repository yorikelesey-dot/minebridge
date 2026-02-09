// Вспомогательные функции для бота

export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function getProjectTypeEmoji(type: string): string {
  const emojis: Record<string, string> = {
    mod: '🔧',
    shader: '✨',
    resourcepack: '🎨',
    modpack: '📦',
    plugin: '🔌',
  };
  return emojis[type] || '📄';
}

export function getLoaderEmoji(loader: string): string {
  const emojis: Record<string, string> = {
    forge: '🔨',
    fabric: '🧵',
    quilt: '🪡',
    neoforge: '⚒️',
  };
  return emojis[loader.toLowerCase()] || '⚙️';
}

export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function isValidMinecraftVersion(version: string): boolean {
  // Проверка формата версии Minecraft (например, 1.20.1)
  return /^\d+\.\d+(\.\d+)?$/.test(version);
}

export function sortVersions(versions: string[]): string[] {
  return versions.sort((a, b) => {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aNum = aParts[i] || 0;
      const bNum = bParts[i] || 0;
      if (aNum !== bNum) return bNum - aNum;
    }
    return 0;
  });
}
