import type { UrgencyConfig, Section } from './types';

export type { Section };

// Subject icon SVG paths — keyed by keyword matched against class name
// Each entry is { path: SVG path data, viewBox? }
const SUBJECT_ICON_MAP: { keywords: string[]; paths: string[] }[] = [
  {
    keywords: ['calc', 'math', 'algebra', 'geometry', 'statistics', 'stat', 'pre-calc', 'precalc', 'trig'],
    paths: [
      'M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z',
      'M8 6h8', 'M8 10h8', 'M8 14h3', 'M8 18h3', 'M15 14h1', 'M15 18h1',
    ],
  },
  {
    keywords: ['bio', 'science', 'chem', 'physics', 'lab', 'anatomy', 'environ'],
    paths: [
      'M6 21h12', 'M9 21v-5', 'M15 21v-5',
      'M9 8H5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-4',
      'M9 8V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3',
      'M12 12v.01',
    ],
  },
  {
    keywords: ['hist', 'social', 'gov', 'politics', 'econ', 'geography', 'civics', 'world'],
    paths: [
      'M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z',
      'M16 8L2 22', 'M17.5 15H9',
    ],
  },
  {
    keywords: ['english', 'essay', 'writing', 'lit', 'language arts', 'read', 'rhetoric', 'grammar'],
    paths: [
      'M4 19.5A2.5 2.5 0 0 1 6.5 17H20',
      'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
    ],
  },
  {
    keywords: ['spanish', 'french', 'german', 'latin', 'mandarin', 'chinese', 'japanese', 'foreign', 'lang'],
    paths: [
      'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
      'M9 10h6', 'M9 13h4',
    ],
  },
  {
    keywords: ['art', 'studio', 'design', 'draw', 'paint', 'visual', 'photo', 'film', 'media'],
    paths: [
      'M12 19l7-7 3 3-7 7-3-3z',
      'M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z',
      'M2 2l7.586 7.586', 'M11 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    ],
  },
  {
    keywords: ['music', 'band', 'choir', 'orchestra', 'theory'],
    paths: [
      'M9 18V5l12-2v13',
      'M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
      'M18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    ],
  },
  {
    keywords: ['pe', 'gym', 'phys ed', 'health', 'sport', 'athletic'],
    paths: [
      'M18 8h1a4 4 0 0 1 0 8h-1',
      'M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z',
      'M6 1v3', 'M10 1v3', 'M14 1v3',
    ],
  },
  {
    keywords: ['computer', 'cs', 'coding', 'program', 'tech', 'software', 'web', 'data'],
    paths: [
      'M16 18l6-6-6-6', 'M8 6L2 12l6 6',
    ],
  },
  {
    keywords: ['psychology', 'psych', 'sociology', 'anthropology'],
    paths: [
      'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3',
      'M12 17h.01',
      'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z',
    ],
  },
];

// Default icon (generic document) when no subject matches
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
