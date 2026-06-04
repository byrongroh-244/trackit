import type { UrgencyConfig, Section } from './types';

export type { Section };

// Subject icon SVG paths — keyed by keyword matched against class name
// Each entry is { path: SVG path data, viewBox? }
const SUBJECT_ICON_MAP: { keywords: string[]; paths: string[] }[] = [
  {
    // Math — four operators on a grid with center dividers
    keywords: ['calc', 'math', 'algebra', 'geometry', 'statistics', 'stat', 'pre-calc', 'precalc', 'trig', 'calculus'],
    paths: [
      'M10 1 L10 21',
      'M1 11 L21 11',
      'M3 4 L8 4', 'M5.5 1.5 L5.5 6.5',
      'M14 4 L19 4',
      'M3 15 L7 19', 'M7 15 L3 19',
      'M14 16.5 L19 16.5',
      'M16.5 13.5 L16.5 14.5',
      'M16.5 18.5 L16.5 19.5',
    ],
  },
  {
    // Science — flask with liquid wave and bubble
    keywords: ['bio', 'science', 'chem', 'physics', 'lab', 'anatomy', 'environ', 'biology', 'chemistry'],
    paths: [
      'M7 2 L7 9 L2 18 Q1 20 3 20 L17 20 Q19 20 18 18 L13 9 L13 2',
      'M5 2 L15 2',
      'M4 16 Q6 14 10 15 Q14 16 16 14',
    ],
  },
  {
    // History / Social — globe with lat/lon lines
    keywords: ['hist', 'social', 'gov', 'politics', 'econ', 'geography', 'civics', 'world', 'global'],
    paths: [
      'M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z',
      'M12 2 L12 22',
      'M2 12 L22 12',
      'M4 7 Q12 5 20 7',
      'M4 17 Q12 19 20 17',
    ],
  },
  {
    // English / Literature — document with folded corner and text lines
    keywords: ['english', 'essay', 'writing', 'lit', 'literature', 'language arts', 'read', 'rhetoric', 'grammar', 'humanities'],
    paths: [
      'M3 1 L13 1 L19 7 L19 21 L3 21 Z',
      'M13 1 L13 7 L19 7',
      'M6 11 L16 11',
      'M6 14 L16 14',
      'M6 17 L12 17',
    ],
  },
  {
    // Foreign language — two speech bubbles
    keywords: ['spanish', 'french', 'german', 'latin', 'mandarin', 'chinese', 'japanese', 'foreign', 'lang', 'esl', 'asl'],
    paths: [
      'M1 2 Q1 0 3 0 L10 0 Q12 0 12 2 L12 7 Q12 9 10 9 L6 9 L4 12 L4 9 L3 9 Q1 9 1 7 Z',
      'M8 11 Q8 9 10 9 L17 9 Q19 9 19 11 L19 16 Q19 18 17 18 L16 18 L16 21 L14 18 L10 18 Q8 18 8 16 Z',
    ],
  },
  {
    // Art — easel with canvas and horizontal line detail
    keywords: ['art', 'studio', 'design', 'draw', 'paint', 'visual', 'photo', 'film', 'media', 'ceramics', 'sculpture', 'theater', 'drama'],
    paths: [
      'M3 1 L17 1 L17 12 L3 12 Z',
      'M4 12 L1 21',
      'M16 12 L19 21',
      'M10 12 L10 21',
      'M3 17 L17 17',
      'M6 7 L14 7',
    ],
  },
  {
    // Music — eighth note (oval head + stem + flag, all stroke)
    keywords: ['music', 'band', 'choir', 'orchestra', 'theory', 'chorus'],
    paths: [
      'M9.5 17 Q6 18 5.5 16 Q5 14 9 13.5 Q13 13 13 15 Q13 17 9.5 17 Z',
      'M13 15 L13 3',
      'M13 3 Q19 5 17 10 Q14 8 13 9',
    ],
  },
  {
    // Health / PE — heart with pulse line
    keywords: ['pe', 'gym', 'phys ed', 'health', 'sport', 'athletic', 'fitness', 'wellness', 'kinesiology'],
    paths: [
      'M10 18 Q2 12 2 7 Q2 2 6.5 2 Q8.5 2 10 5 Q11.5 2 13.5 2 Q18 2 18 7 Q18 12 10 18 Z',
      'M3.5 9 L6 9 L7 6.5 L9.5 12 L11.5 7 L13 9 L16.5 9',
    ],
  },
  {
    // CS / Coding — angle brackets
    keywords: ['computer', 'cs', 'coding', 'program', 'tech', 'software', 'web', 'data', 'engineering'],
    paths: [
      'M16 18 L22 12 L16 6',
      'M8 6 L2 12 L8 18',
    ],
  },
  {
    // Psychology — brain outline
    keywords: ['psychology', 'psych', 'sociology', 'anthropology', 'philosophy', 'counseling'],
    paths: [
      'M12 4 Q16 2 18 5 Q21 5 21 9 Q22 12 20 14 Q21 17 19 18 Q18 21 15 20 Q13 22 12 20 Q11 22 9 20 Q6 21 5 18 Q3 17 4 14 Q2 12 3 9 Q3 5 6 5 Q8 2 12 4 Z',
      'M12 4 L12 20',
      'M8 8 Q12 10 16 8',
      'M7 13 Q12 15 17 13',
    ],
  },
];

// Default icon — generic document
const DEFAULT_ICON_PATHS = [
  'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
  'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8',
];

/** Returns SVG path strings for a given class name. */
export function getSubjectIconPaths(className: string): string[] {
  const lower = className.toLowerCase();
  for (const entry of SUBJECT_ICON_MAP) {
    if (entry.keywords.some(k => lower.includes(k))) {
      return entry.paths;
    }
  }
  return DEFAULT_ICON_PATHS;
}

export const Colors = {
  forest:      '#1c4a4f',
  forestDark:  '#152f33',
  lime:        '#B8E04A',
  purple:      '#534AB7',
  purpleLight: '#EEEDFE',
  purpleDark:  '#3C3489',
  teal:        '#1D9E75',
  tealLight:   '#E1F5EE',
  tealDark:    '#085041',
  red:         '#E24B4A',
  redLight:    '#FCEBEB',
  redDark:     '#791F1F',
  amber:       '#BA7517',
  amberAccent: '#EF9F27',
  amberLight:  '#FAEEDA',
  amberDark:   '#633806',
  blue:        '#378ADD',
  blueLight:   '#E6F1FB',
  blueDark:    '#0C447C',
  green:       '#639922',
  greenLight:  '#EAF3DE',
  greenDark:   '#27500A',
  gray:        '#888780',
  grayLight:   '#F1EFE8',
  grayDark:    '#444441',
  background:  '#F8F8F6',
  surface:     '#FFFFFF',
  border:      'rgba(0,0,0,0.1)',
  textPrimary:   '#1A1A18',
  textSecondary: '#6B6A64',
  textHint:      '#9B9A94',
} as const;

export const CLASS_COLORS = [
  '#534AB7', '#1D9E75', '#E24B4A',
  '#378ADD', '#BA7517', '#D4537E',
  '#639922', '#993C1D',
] as const;

export function getUrgencyConfig(days: number): UrgencyConfig {
  if (days < 0)   return { accent: Colors.red,         bg: Colors.redLight,   text: Colors.redDark,   label: `${Math.abs(days)}d late` };
  if (days === 0) return { accent: Colors.red,         bg: Colors.redLight,   text: Colors.redDark,   label: 'Due today' };
  if (days === 1) return { accent: Colors.amberAccent, bg: Colors.amberLight, text: Colors.amberDark, label: '1 day left' };
  if (days <= 3)  return { accent: Colors.amberAccent, bg: Colors.amberLight, text: Colors.amberDark, label: `${days} days left` };
  if (days <= 7)  return { accent: Colors.blue,        bg: Colors.blueLight,  text: Colors.blueDark,  label: `${days} days` };
  return                 { accent: Colors.green,       bg: Colors.greenLight, text: Colors.greenDark, label: `${days} days` };
}

export function getSectionForDays(days: number): Section {
  if (days <= 3) return 'needs_attention';
  if (days <= 7) return 'coming_up';
  return 'on_track';
}

export const SECTION_META: Record<Section, { label: string; color: string }> = {
  needs_attention: { label: 'Needs attention', color: Colors.red },
  coming_up:       { label: 'Coming up',       color: Colors.blue },
  on_track:        { label: 'On track',        color: Colors.green },
};
