/**
 * Deadline Recovery Template System
 * All template content lives here. Components never contain hardcoded strings.
 * Placeholder tokens are replaced at render time by fillTemplate() in DeadlineRecovery.tsx
 *
 * Tokens:
 *   {{assignmentName}}  — assignment.name
 *   {{dueDate}}         — formatLongDate(assignment.dueDate)
 *   {{daysPastDue}}     — Math.abs(daysUntil(assignment.dueDate))
 *   {{teacherName}}     — user-supplied in the UI
 *   {{className}}       — assignment.className
 *   {{studentName}}     — settings.studentName
 *   {{proposedDate}}    — user-supplied date input
 *   {{counselorName}}   — user-supplied or default 'Counselor'
 */

export type RecoveryTier = 1 | 2 | 3 | 4;
export type TemplateId   = string;

export interface TemplateOption {
  id:        TemplateId;
  label:     string;       // shown in the picker UI
  situation: string;       // one-line description of when to use this
  subject:   string;       // email subject line with placeholder tokens
  body:      string;       // email body with placeholder tokens
  tone:      'formal' | 'honest' | 'brief';
  /** Whether this template sends to the teacher (true) or counselor (false) */
  toTeacher: boolean;
}

export interface TierConfig {
  tier:         RecoveryTier;
  /** Days relative to due date. Negative = before due. Positive = past due. */
  dayRange:     { min: number; max: number | null };
  title:        string;
  subtitle:     string;
  urgencyColor: 'teal' | 'amber' | 'orange' | 'red';
  actionLabel:  string;
  templates:    TemplateOption[];
  inPersonScript: string | null;
  /** Short message shown inside the card to reduce avoidance */
  emotionalNote: string;
}

// ── Tier 1 — Early Warning (before deadline) ──────────────────────────────────

const tier1: TierConfig = {
  tier: 1,
  dayRange: { min: -5, max: -1 },
  title: "Ask before it's late",
  subtitle: 'Proactive requests have the highest success rate of any approach.',
  urgencyColor: 'teal',
  actionLabel: 'Request an extension',
  emotionalNote:
    'Asking before the deadline is not admitting failure. It is evidence of self-awareness. ' +
    'Teachers grant extension requests to students who ask proactively far more often than to students who submit late without warning.',
  templates: [
    {
      id:        't1_standard',
      label:     'Standard extension request',
      situation: 'You have made some progress and need more time',
      toTeacher: true,
      tone:      'formal',
      subject:   'Extension Request — {{assignmentName}} — {{studentName}}',
      body:
`Dear {{teacherName}},

I am writing because I want to be upfront with you rather than wait until the last minute.

I have been working on {{assignmentName}} and have made progress, but I can see that I will not be able to finish to the standard I want to meet by {{dueDate}}.

I am asking if I could have until {{proposedDate}} to submit a complete assignment. I understand this is a request and not a guarantee, and I am happy to show you my current progress to confirm I have been working on it.

Thank you for considering this.

{{studentName}}
{{className}}`,
    },
    {
      id:        't1_iep_504',
      label:     'Extension request (with IEP or 504)',
      situation: 'You have a documented accommodation and want to reference it',
      toTeacher: true,
      tone:      'formal',
      subject:   'Extension Request — {{assignmentName}} — {{studentName}}',
      body:
`Dear {{teacherName}},

I want to reach out proactively about {{assignmentName}}, which is due {{dueDate}}.

I have been working on this assignment and have made progress. I am finding that the [specific phase — e.g. research / writing / problem-solving] section is taking longer than I planned, in part because of the executive functioning difficulties we have discussed previously.

I would like to request an extension to {{proposedDate}}. I want to submit work that represents my actual understanding of the material, and I believe the additional time would allow me to do that.

I am available to talk about this if that would be helpful.

Thank you,

{{studentName}}
{{className}}`,
    },
    {
      id:        't1_brief',
      label:     'Short message (informal)',
      situation: 'You have a good relationship with this teacher',
      toTeacher: true,
      tone:      'brief',
      subject:   'Quick question — {{assignmentName}}',
      body:
`Hi {{teacherName}},

I am working on {{assignmentName}} and making progress, but I can see I will need a couple more days to finish it properly. Would it be okay to turn it in by {{proposedDate}} instead of {{dueDate}}?

I can show you where I am if that helps.

Thanks,
{{studentName}}`,
    },
  ],
  inPersonScript:
`BEFORE YOU GO IN — write down these three things:
1. What progress have you made? (Be specific)
2. What exact date are you asking for?
3. One reason you need more time (one reason only)

WHAT TO SAY:
"Hi {{teacherName}}, I wanted to talk to you about {{assignmentName}}. I've been working on it but I can see I won't be done by {{dueDate}}. Would it be possible to turn it in by {{proposedDate}}?"

Then stop talking. Let them respond.

IF THEY SAY YES:
"Thank you. I'll have it to you by [date]."
→ Add the new date to your app right now.

IF THEY SAY NO OR ASK QUESTIONS:
"I understand. What would you recommend?"
→ Listen. Thank them. Leave.

DO NOT: apologize more than once, over-explain, ask for an open-ended extension.`,
};

// ── Tier 2 — Same-Day Response ────────────────────────────────────────────────

const tier2: TierConfig = {
  tier: 2,
  dayRange: { min: 0, max: 1 },
  title: 'Send something today',
  subtitle: 'Every hour of silence makes the conversation harder. Send it now.',
  urgencyColor: 'amber',
  actionLabel: 'Send a message',
  emotionalNote:
    'You do not need to have the assignment finished to send this email. ' +
    'An email without the assignment is still better than silence. ' +
    'Attach or submit whatever you have at the same time you send it.',
  templates: [
    {
      id:        't2_complete',
      label:     'Assignment is done — submitting now',
      situation: 'You finished it, just past the deadline',
      toTeacher: true,
      tone:      'honest',
      subject:   'Late Submission — {{assignmentName}} — {{studentName}}',
      body:
`Dear {{teacherName}},

I am submitting {{assignmentName}} late and I want to acknowledge that directly.

It was due {{dueDate}} and I did not meet that deadline. I have completed the assignment and am submitting it now. I understand there may be a late penalty and I accept that.

Thank you,

{{studentName}}
{{className}}`,
    },
    {
      id:        't2_partial',
      label:     'Assignment is not finished — submitting what I have',
      situation: 'You have some work done but are not finished',
      toTeacher: true,
      tone:      'honest',
      subject:   'Late Submission — {{assignmentName}} — {{studentName}}',
      body:
`Dear {{teacherName}},

I want to be honest: {{assignmentName}} was due {{dueDate}} and I have not finished it.

I am writing now rather than waiting because I did not want you to think I had forgotten or given up. I would like to submit what I have now and ask if I could submit the remaining portion by {{proposedDate}}.

I understand if the answer is no. Whatever you decide, I wanted to communicate rather than stay silent.

Thank you,

{{studentName}}
{{className}}`,
    },
    {
      id:        't2_emergency',
      label:     'Urgent same-day extension — something genuinely happened',
      situation: 'An unexpected event today made the deadline impossible',
      toTeacher: true,
      tone:      'honest',
      subject:   'Urgent — {{assignmentName}} — {{studentName}}',
      body:
`Dear {{teacherName}},

{{assignmentName}} is due today and I am writing because I am not going to make the deadline.

[One sentence: what specifically happened today. Keep it factual, not dramatic.]

I am asking if I could have until {{proposedDate}} to submit. I am actively working on it right now and understand completely if this is not possible.

{{studentName}}
{{className}}`,
    },
  ],
  inPersonScript: null,
};

// ── Tier 3 — Recovery (2-7 days past) ────────────────────────────────────────

const tier3: TierConfig = {
  tier: 3,
  dayRange: { min: 2, max: 7 },
  title: 'Break the silence',
  subtitle: `It has been {{daysPastDue}} days. The longer the silence, the harder it gets.`,
  urgencyColor: 'orange',
  actionLabel: 'Send a recovery message',
  emotionalNote:
    'Reaching out is hard when you have been avoiding something. ' +
    'That is understandable. The email you send is not a confession — ' +
    'it is evidence that you handle hard things instead of hiding from them. ' +
    'Teachers respond to honesty.',
  templates: [
    {
      id:        't3_standard',
      label:     'Standard recovery — first message since missing the deadline',
      situation: 'You have not communicated at all since the due date',
      toTeacher: true,
      tone:      'honest',
      subject:   '{{assignmentName}} — {{studentName}}',
      body:
`Dear {{teacherName}},

I am writing about {{assignmentName}}, which was due {{dueDate}}.

I did not submit it on time, and I have not reached out until now. I want to be honest that I should have communicated sooner.

I am still committed to completing this work. I am asking if there is any possibility of submitting late for partial credit, receiving an incomplete, or making up the work in another way. I will accept whatever you decide and I will not ask again after this message.

I am also happy to meet briefly if that would be more appropriate.

Thank you for reading this.

{{studentName}}
{{className}}`,
    },
    {
      id:        't3_direct',
      label:     'Fully honest — no emergency, just fell behind',
      situation: 'Nothing extraordinary happened — you fell behind and avoided it',
      toTeacher: true,
      tone:      'honest',
      subject:   '{{assignmentName}} — {{studentName}}',
      body:
`Dear {{teacherName}},

I want to be straightforward: {{assignmentName}} was due {{dueDate}} and I did not turn it in. I do not have an emergency to explain it — I fell behind and then avoided dealing with it, which made everything worse.

I am writing now because continuing to avoid it is not something I want to do.

Is there any form of late credit or makeup available for this assignment? I understand completely if the answer is no.

{{studentName}}
{{className}}`,
    },
    {
      id:        't3_following_up',
      label:     'Following up — I sent a message and never heard back',
      situation: 'You already sent something and got no reply',
      toTeacher: true,
      tone:      'formal',
      subject:   'Following Up — {{assignmentName}} — {{studentName}}',
      body:
`Dear {{teacherName}},

I am following up on a message I sent about {{assignmentName}}. I wanted to make sure it reached you and that you know I am still hoping to resolve this.

I understand if the late policy does not allow credit at this point. I wanted to make sure we had at least connected about it rather than leave it unaddressed.

Thank you,

{{studentName}}
{{className}}`,
    },
  ],
  inPersonScript:
`THIS IS HARD. THAT IS NORMAL.

PREPARE BEFORE YOU GO:
1. The assignment name and how many days ago it was due
2. Your honest progress update (even "I haven't started")
3. One specific ask — partial credit? an incomplete? a makeup?

WHAT TO SAY:
"Hi {{teacherName}}. I wanted to talk to you about {{assignmentName}}. I know it was due {{daysPastDue}} days ago and I haven't turned it in. I should have come to you sooner and I didn't — I'm sorry for that. I'm asking whether there is any possibility of [your specific ask]. I understand completely if there isn't."

THEN STOP TALKING. Let them respond. Do not keep explaining.

IF YES: Thank them once. Confirm the new deadline. Add it to your app immediately.

IF NO: "I understand. Thank you for talking to me about it." Leave. Do not argue.
Even a no-conversation is better than silence — they know you tried.`,
};

// ── Tier 4 — Last Resort (8+ days past) ──────────────────────────────────────

const tier4: TierConfig = {
  tier: 4,
  dayRange: { min: 8, max: null },
  title: "It's not too late to reach out",
  subtitle: 'The goal now is the relationship and your standing, not just one grade.',
  urgencyColor: 'red',
  actionLabel: 'Send a message',
  emotionalNote:
    'Even if the grade cannot be recovered, reaching out now prevents the situation ' +
    'from affecting your overall grade, your teacher\'s perception of you, and your own ' +
    'ability to stay in this class. One missed assignment is not a failing grade unless the silence compounds it.',
  templates: [
    {
      id:        't4_standard',
      label:     'Late recovery — grade may be unrecoverable',
      situation: 'More than a week has passed with no communication',
      toTeacher: true,
      tone:      'formal',
      subject:   '{{assignmentName}} — {{studentName}}',
      body:
`Dear {{teacherName}},

I am writing about {{assignmentName}} from {{dueDate}}. I know significant time has passed and I have not been in contact.

I am not writing to ask you to change your late policy or to argue for special treatment. I am writing because I do not want the silence to continue, and I do not want this situation to represent how I approach your class.

If submitting for any credit at all is no longer possible, I understand completely. What I am asking is whether we could briefly connect so I understand where I stand and what I should focus on going forward.

Thank you,

{{studentName}}
{{className}}`,
    },
    {
      id:        't4_meeting_request',
      label:     'Request a meeting with parent or counselor included',
      situation: 'Multiple assignments missed — situation needs adult support',
      toTeacher: true,
      tone:      'formal',
      subject:   'Request to Connect — {{studentName}}, {{className}}',
      body:
`Dear {{teacherName}},

I am writing because I know the situation with my grade in your class has reached a point where an email alone is not the right response.

I would like to request a brief meeting that could include my parent or school counselor so that we can talk honestly about where I stand and what a realistic path forward looks like.

I am not asking for special treatment. I am asking for a conversation with the right people in the room so I can understand my situation and make a real plan.

I am available at [list 2-3 specific times].

Thank you for considering this.

{{studentName}}
{{className}}`,
    },
    {
      id:        't4_counselor',
      label:     'Message to school counselor — request support',
      situation: 'You need help having the conversation or want an adult in the room',
      toTeacher: false,
      tone:      'honest',
      subject:   'I need help with a class situation — {{studentName}}',
      body:
`Hi {{counselorName}},

I need some help with a situation in {{className}} with {{teacherName}}.

I have missed assignments and have not communicated well with my teacher about it. The situation has been going on for a while and I have been avoiding dealing with it, which has made it worse.

I think I might need someone to help me have the conversation or to be in the room with me when I talk to my teacher.

Can we meet soon?

{{studentName}}`,
    },
  ],
  inPersonScript: null,
};

// ── Absence recovery (Tier 0) ─────────────────────────────────────────────────

export const tier0AbsenceTemplate: TemplateOption = {
  id:        't0_absence',
  label:     'I missed class — checking in on what I missed',
  situation: 'You were absent and need to catch up',
  toTeacher: true,
  tone:      'formal',
  subject:   'Missed Class — {{dueDate}} — {{studentName}}, {{className}}',
  body:
`Dear {{teacherName}},

I was absent on {{dueDate}} and I want to make sure I understand what I missed and what I need to do.

Could you let me know:
— Were any assignments due or given on that day?
— Was there a quiz or test I need to make up?
— Is there anything specific from the lesson I should review before the next class?

I am ready to make up any work and will do so according to the school's makeup policy.

Thank you,

{{studentName}}
{{className}}`,
};

// ── Exports ───────────────────────────────────────────────────────────────────

export const DEADLINE_TIERS: TierConfig[] = [tier1, tier2, tier3, tier4];

export function getTierForDays(daysPastDue: number): TierConfig {
  if (daysPastDue < 0) return tier1; // before due date
  const match = DEADLINE_TIERS.find(t => {
    return daysPastDue >= t.dayRange.min &&
      (t.dayRange.max === null || daysPastDue <= t.dayRange.max);
  });
  return match ?? tier4;
}

export function fillTemplate(text: string, tokens: Record<string, string>): string {
  return Object.entries(tokens).reduce(
    (result, [key, value]) => result.split(`{{${key}}}`).join(value),
    text,
  );
}
