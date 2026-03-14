import type { HistoryEntry } from './types';

export function formatOfferDist(o: { minDistance: number; maxDistance: number }): string {
  return o.minDistance === 0 ? `< ${o.maxDistance}` : `${o.minDistance} - ${o.maxDistance}`;
}

export function getLastClearIndex(history: HistoryEntry[]): number {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].type === 'clear') return i;
  }
  return -1;
}

export function parseHelpSections(text: string): { title: string; lines: string[] }[] {
  const sections: { title: string; lines: string[] }[] = []
  const rawLines = text.split('\n')
  let currentSection: { title: string; lines: string[] } | null = null

  for (const line of rawLines) {
    const trimmed = line.trimEnd()
    if (!trimmed) {
      if (currentSection && currentSection.lines.length > 0) {
        sections.push(currentSection)
        currentSection = null
      }
      continue
    }

    const stripped = trimmed.replace(/^\s+/, '')
    const isHeader =
      stripped === 'Available commands:' ||
      (stripped.endsWith(':') &&
        !stripped.startsWith('user ') &&
        !stripped.startsWith('offer ') &&
        !stripped.startsWith('loginas') &&
        !stripped.startsWith('notifications') &&
        !stripped.startsWith('clear'))

    if (isHeader) {
      if (currentSection && currentSection.lines.length > 0) sections.push(currentSection)
      if (stripped === 'Available commands:') {
        currentSection = null
        continue
      }
      currentSection = { title: stripped.replace(/:$/, ''), lines: [] }
    } else {
      if (!currentSection) currentSection = { title: '', lines: [] }
      currentSection.lines.push(stripped)
    }
  }

  if (currentSection && currentSection.lines.length > 0) sections.push(currentSection)
  return sections
}
