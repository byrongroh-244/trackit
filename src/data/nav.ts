// Single source of truth for bottom navigation items.
// Import this instead of copy-pasting the NAV array in each screen.

export const NAV = [
  { label: 'Agenda',   icon: '', screen: 'today'    },
  { label: 'Calendar', icon: '', screen: 'calendar' },
  { label: 'Add',      icon: '', screen: 'add'      },
  { label: 'Classes',  icon: '', screen: 'classes'  },
  { label: 'Settings', icon: '', screen: 'settings' },
] as const;
