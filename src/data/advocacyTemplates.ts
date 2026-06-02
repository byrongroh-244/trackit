// ── Advocacy script templates ─────────────────────────────────────────────────
// Stored locally — no API call needed. Fill placeholders at render time.
// Placeholders: {assignment} {class} {days_late} {teacher}

export type Situation = 'overdue' | 'due_soon' | 'need_extension' | 'confused';

export interface AdvocacyTemplate {
  situation: Situation;
  subject: string;   // email subject line
  script: string;    // the message body
  tips: string[];    // delivery tips
}

export const ADVOCACY_TEMPLATES: Record<Situation, AdvocacyTemplate> = {

  overdue: {
    situation: 'overdue',
    subject: 'Missing Assignment — {assignment}',
    script: `Hi {teacher},

I'm reaching out because I missed the deadline for {assignment} in {class}. I know it was due {days_late} ago and I'm sorry for not communicating sooner.

I want to complete this work. Is there any way I can still submit it, even for partial credit? I'm prepared to turn it in as soon as possible.

Thank you for your time,
[Your name]`,
    tips: [
      'Send this as soon as possible — the sooner the better.',
      'Don\'t over-explain or make excuses. Keep it short and direct.',
      'If your teacher responds, reply within the same day.',
    ],
  },

  due_soon: {
    situation: 'due_soon',
    subject: 'Question about {assignment}',
    script: `Hi {teacher},

I'm working on {assignment} for {class} and wanted to let you know I'm having a harder time with it than I expected.

I'm still planning to submit it on time, but I wanted you to know in case the quality isn't what it usually is. Is there anything you can point me to that might help?

Thank you,
[Your name]`,
    tips: [
      'Reaching out ahead of time shows responsibility — teachers notice.',
      'You don\'t have to explain exactly why you\'re struggling.',
      'Even if they can\'t help, they\'ll know you tried.',
    ],
  },

  need_extension: {
    situation: 'need_extension',
    subject: 'Extension Request — {assignment}',
    script: `Hi {teacher},

I'm working on {assignment} for {class} and I'm writing to ask if an extension might be possible. I want to do this assignment well and I don't think I'll be able to do my best work by the original deadline.

Would it be possible to have a few extra days? I completely understand if not, and I'll submit whatever I have by the due date if that's the case.

Thank you for considering it,
[Your name]`,
    tips: [
      'Ask at least 24 hours before the deadline — not the morning it\'s due.',
      'Be specific if you can: "Could I have until Friday?" is easier to say yes to.',
      'Accept the answer gracefully either way.',
    ],
  },

  confused: {
    situation: 'confused',
    subject: 'Clarification on {assignment}',
    script: `Hi {teacher},

I'm working on {assignment} for {class} and I want to make sure I understand what's expected before I get too far.

I'm unclear on [what specifically confuses you]. Could you help clarify this, or point me to where I can find more information?

I want to make sure I'm on the right track. Thank you,
[Your name]`,
    tips: [
      'Replace [what specifically confuses you] with your actual question before sending.',
      'Check the assignment sheet or rubric first — mention it if you did.',
      'Asking questions early shows engagement, not weakness.',
    ],
  },
};

export function fillTemplate(template: string, vars: {
  assignment: string;
  class: string;
  days_late: string;
  teacher?: string;
}): string {
  return template
    .replace(/\{assignment\}/g, vars.assignment)
    .replace(/\{class\}/g, vars.class)
    .replace(/\{days_late\}/g, vars.days_late)
    .replace(/\{teacher\}/g, vars.teacher ?? '[Teacher Name]');
}
