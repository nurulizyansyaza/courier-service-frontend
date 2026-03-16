const HEADER_EXCLUSIONS = ['user ', 'offer ', 'loginas', 'notifications', 'clear'];

function isHeaderLine(stripped: string): boolean {
  if (stripped === 'Available commands:') return true;
  if (!stripped.endsWith(':')) return false;
  return !HEADER_EXCLUSIONS.some(prefix => stripped.startsWith(prefix));
}

/** Parse help text output into titled sections */
export function parseHelpSections(text: string): { title: string; lines: string[] }[] {
  const sections: { title: string; lines: string[] }[] = [];
  const rawLines = text.split('\n');
  let currentSection: { title: string; lines: string[] } | null = null;

  for (const line of rawLines) {
    const trimmed = line.trimEnd();
    if (!trimmed) {
      if (currentSection && currentSection.lines.length > 0) {
        sections.push(currentSection);
        currentSection = null;
      }
      continue;
    }

    const stripped = trimmed.replace(/^\s+/, '');

    if (isHeaderLine(stripped)) {
      if (currentSection && currentSection.lines.length > 0) sections.push(currentSection);
      if (stripped === 'Available commands:') {
        currentSection = null;
        continue;
      }
      currentSection = { title: stripped.replace(/:$/, ''), lines: [] };
    } else {
      if (!currentSection) currentSection = { title: '', lines: [] };
      currentSection.lines.push(stripped);
    }
  }

  if (currentSection && currentSection.lines.length > 0) sections.push(currentSection);
  return sections;
}
