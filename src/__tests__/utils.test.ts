import { parseHelpSections } from '@/core/utils';

describe('parseHelpSections', () => {
  it('should parse sections with headers and content lines', () => {
    // Given text with section headers (lines ending with :) and content
    const text = [
      'Session:',
      '  user login admin',
      '  user logout',
      '',
      'Offers:',
      '  offer list',
      '  offer add',
    ].join('\n');

    // When parsed
    const sections = parseHelpSections(text);

    // Then two sections are returned with correct titles and lines
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe('Session');
    expect(sections[0].lines).toEqual(['user login admin', 'user logout']);
    expect(sections[1].title).toBe('Offers');
    expect(sections[1].lines).toEqual(['offer list', 'offer add']);
  });

  it('should skip "Available commands:" as section header', () => {
    // Given text starting with "Available commands:"
    const text = [
      'Available commands:',
      'General:',
      '  help',
      '  clear',
    ].join('\n');

    // When parsed
    const sections = parseHelpSections(text);

    // Then "Available commands:" is not a section, only "General" appears
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('General');
    expect(sections[0].lines).toEqual(['help', 'clear']);
  });

  it('should handle lines without a section header (empty title)', () => {
    // Given text with no header line
    const text = [
      '  some command',
      '  another command',
    ].join('\n');

    // When parsed
    const sections = parseHelpSections(text);

    // Then a section with empty title is created
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('');
    expect(sections[0].lines).toEqual(['some command', 'another command']);
  });

  it('should return empty array for empty input', () => {
    // Given empty string
    const sections = parseHelpSections('');

    // Then no sections
    expect(sections).toEqual([]);
  });

  it('should handle multiple sections separated by blank lines', () => {
    // Given multiple sections separated by blanks
    const text = [
      'First:',
      '  line1',
      '',
      'Second:',
      '  line2',
      '',
      'Third:',
      '  line3',
    ].join('\n');

    // When parsed
    const sections = parseHelpSections(text);

    // Then three sections
    expect(sections).toHaveLength(3);
    expect(sections[0].title).toBe('First');
    expect(sections[1].title).toBe('Second');
    expect(sections[2].title).toBe('Third');
  });
});
