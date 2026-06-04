import React from 'react';
import { Colors, getUrgencyConfig } from '../../theme';
import { daysUntil } from '../../data/store';
import type { Assignment } from '../../types';
import { isTestOrQuiz, toKey, today, sortedMarkers, DAYS, MONTHS } from './calendarUtils';
import { CellMarker, DayPanel, UpcomingTestsBanner } from './DayPanel';

export function MonthView({ year, month, byDate, allAssignments, selectedKey, onSelectDay, onNavigate }: {
  year: number; month: number;
  byDate: Record<string, Assignment[]>;
  allAssignments: Assignment[];
  selectedKey: string | null;
  onSelectDay: (key: string) => void;
  onNavigate: (screen: any, id?: string) => void;
}) {
  const t = today();
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const stepDates = new Set<string>();
  for (const a of allAssignments) {
    for (const s of a.subtasks ?? []) {
      if (s.dueDate && !s.done) stepDates.add(s.dueDate);
    }
  }

  const selectedItems = selectedKey ? (byDate[selectedKey] ?? []) : [];

  return (
    <div>
      {/* Day-of-week header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 10px', marginBottom: 2 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: Colors.textHint, padding: '4px 0', letterSpacing: '0.04em' }}>
            {d.charAt(0)}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, padding: '0 10px' }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const key    = toKey(year, month, day);
          const items  = byDate[key] ?? [];
          const active = items.filter(a => !a.done);
          const isToday    = year === t.y && month === t.m && day === t.d;
          const isSelected = key === selectedKey;
          const hasStep    = stepDates.has(key) && active.length === 0;
          const tappable   = items.length > 0 || stepDates.has(key);
          const sorted     = sortedMarkers(active).slice(0, 3);

          return (
            <div
              key={key}
              onClick={() => tappable ? onSelectDay(key) : undefined}
              style={{
                minHeight: 50,
                borderRadius: 10,
                padding: '5px 3px 4px',
                background: isSelected
                  ? Colors.forest
                  : isToday
                  ? '#E8F4F5'
                  : 'transparent',
                border: isToday && !isSelected
                  ? `1.5px solid ${Colors.forest}`
                  : '1.5px solid transparent',
                cursor: tappable ? 'pointer' : 'default',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                transition: 'background 0.12s',
              }}
            >
              <div style={{
                fontSize: 13,
                fontWeight: isToday || isSelected ? 700 : 400,
                color: isSelected ? '#fff' : isToday ? Colors.forest : Colors.textPrimary,
                lineHeight: 1.3,
              }}>
                {day}
              </div>

              {/* Markers */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2, minHeight: 8 }}>
                {sorted.map((a, idx) => (
                  <span key={idx} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {isTestOrQuiz(a.type) ? (
                      <svg width="7" height="7" viewBox="0 0 8 8">
                        <rect x="1" y="1" width="6" height="6" rx="1"
                          transform="rotate(45 4 4)"
                          fill={isSelected ? '#fff' : getUrgencyConfig(daysUntil(key)).accent}
                        />
                      </svg>
                    ) : (
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: isSelected ? 'rgba(255,255,255,0.7)' : getUrgencyConfig(daysUntil(key)).accent,
                        display: 'inline-block',
                      }} />
                    )}
                  </span>
                ))}
                {active.length > 3 && (
                  <span style={{ fontSize: 8, color: isSelected ? 'rgba(255,255,255,0.7)' : Colors.textHint, lineHeight: 1.8 }}>
                    +{active.length - 3}
                  </span>
                )}
                {hasStep && (
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: Colors.textHint, display: 'inline-block' }} />
                )}
              </div>

              {/* Lime pip on today */}
              {isToday && !isSelected && (
                <div style={{ width: 16, height: 2.5, borderRadius: 2, background: '#B8E04A' }} />
              )}
            </div>
          );
        })}
      </div>

      {selectedKey && (
        <DayPanel
          dateKey={selectedKey}
          items={selectedItems}
          allAssignments={allAssignments}
          onNavigate={onNavigate}
        />
      )}

      <UpcomingTestsBanner byDate={byDate} onNavigate={onNavigate} />
    </div>
  );
}
// Identical visual to DayView — 7 columns side by side, same hour axis,
// same class blocks, same free windows, same current-time line.
