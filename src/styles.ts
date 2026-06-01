// Shared style constant objects.
// Usage: style={{ ...Styles.card }} or style={{ ...Styles.inputBase, color: 'red' }}
// These reduce the 3,000+ lines of inline styles to named, reusable patterns and
// make future theming changes (high-contrast mode, larger text) a single edit.

import type { CSSProperties } from 'react';
import { Colors } from './theme';

// ── Cards & surfaces ──────────────────────────────────────────────────────────

/** Standard white card with thin border and rounded corners. */
export const card: CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  border: '0.5px solid rgba(0,0,0,0.1)',
  overflow: 'hidden',
};

/** Card used inside form / edit panels — matches card but without overflow:hidden. */
export const formCard: CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  border: '0.5px solid rgba(0,0,0,0.1)',
  padding: 16,
};

/** Inset surface used inside cards for subsections. */
export const surface: CSSProperties = {
  background: Colors.surface,
  borderRadius: 10,
  border: '0.5px solid rgba(0,0,0,0.08)',
};

// ── Form inputs ───────────────────────────────────────────────────────────────

/** Base style for all text inputs, selects, and textareas. */
export const inputBase: CSSProperties = {
  width: '100%',
  fontSize: 14,
  padding: '9px 11px',
  borderRadius: 8,
  border: '0.5px solid rgba(0,0,0,0.2)',
  outline: 'none',
  fontFamily: 'inherit',
  color: Colors.textPrimary,
  background: Colors.surface,
  boxSizing: 'border-box',
};

/** Small uppercase field label above an input. */
export const fieldLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: Colors.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: 5,
};

// ── Buttons ───────────────────────────────────────────────────────────────────

/** Full-width solid primary button (purple). */
export const primaryButton: CSSProperties = {
  width: '100%',
  padding: '14px',
  borderRadius: 12,
  border: 'none',
  background: Colors.purple,
  color: '#fff',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

/** Full-width ghost / secondary button. */
export const secondaryButton: CSSProperties = {
  width: '100%',
  padding: '13px',
  borderRadius: 12,
  border: '0.5px solid rgba(0,0,0,0.15)',
  background: '#fff',
  color: Colors.textSecondary,
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

/** Small inline action button (no background). */
export const ghostButton: CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  padding: 0,
};

// ── Section headers ───────────────────────────────────────────────────────────

/** Gray bar used as a collapsible section header in lists. */
export const sectionHeader: CSSProperties = {
  width: '100%',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 18px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  background: Colors.grayLight,
  borderTop: '0.5px solid rgba(0,0,0,0.08)',
  borderBottom: '0.5px solid rgba(0,0,0,0.08)',
  marginTop: 8,
};

/** Uppercase label used inside section headers. */
export const sectionLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: Colors.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

// ── Pills & badges ────────────────────────────────────────────────────────────

/** Base for colored rounded pill badges. */
export const pill: CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  padding: '3px 9px',
  borderRadius: 999,
  whiteSpace: 'nowrap',
};

// ── Utility ───────────────────────────────────────────────────────────────────

/** Row that centres its children horizontally with a gap. */
export const centredRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

/** Full-width flex row, space-between. */
export const spreadRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

// Re-export as a namespace so callers can use Styles.card, Styles.primaryButton, etc.
export const Styles = {
  card,
  formCard,
  surface,
  inputBase,
  fieldLabel,
  primaryButton,
  secondaryButton,
  ghostButton,
  sectionHeader,
  sectionLabel,
  pill,
  centredRow,
  spreadRow,
} as const;
