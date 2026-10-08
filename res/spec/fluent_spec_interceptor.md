# **Context:** Interceptor API spec (SDK v4.13.0+): Defines an **Interceptor** — the platform's "What type of X would you like to create?" decision panel, shown before a user creates a new record on an intercepted table and routing them through answers to a destination URL, a follow-up question, or a button script. One `Interceptor()` call writes `sys_wizard` (coalesced on `name`) plus one `sys_wizard_answer` per `answers` entry. Import `Interceptor` from `@servicenow/sdk/core`; it appears in no release note. `name` is the identity, so a top-level `$id` is **not accepted**, and neither is `$meta`; `protectionPolicy` and `$override` are, and both land on `sys_wizard` only. `'multipleChoice'` sub-choices (`sys_wizard_choice`) are never written by `Interceptor()` — see the separate `Record()` call at the end of the block.

```typescript
import { Interceptor, Record } from '@servicenow/sdk/core'

// A follow-up question. Declare it BEFORE anything references it (normal declare-before-use).
// Interceptor() returns Interceptor & TableBrand<'sys_wizard'>, so the value is usable as a reference.
const followUpQuestion = Interceptor({
  name: 'Hardware issue type',
  question: 'Which hardware is affected?',
})

Interceptor({
  // NOT accepted: a top-level `$id` (TS2353 — `name` is the identity; the JSDoc's "via Now.Internal.WithIdAndMetadata"
  // is wrong, the type is Now.Internal.WithMetadata) and `$meta` (TS2353 — no installMethod, no useEsLatest).
  name: 'Choose incident type', // string, mandatory - internal label (not shown to users) and coalesce key on sys_wizard.name.
    // Same name = same record ACROSS THE INSTANCE: an accidental match silently coalesces into, and overwrites, an existing
    // (possibly out-of-box) wizard — query sys_wizard by name first. No scope-prefix rule, so choose a distinctive name.
    // Renaming creates a new record and ORPHANS the old one (it is not deleted).
  question: 'What would you like to report?', // string, optional (default '') - question text shown to the user
  intercepts: 'incident.do', // string, optional (default '') - ONE '*.do' page path this panel replaces the default
    // new-record form on. Setting it creates no answers — always author at least one
  backPanel: '82ca0be019af4745b235703c4c68a675', // string | Record<'sys_wizard'> | Interceptor, optional - previous panel.
    // A raw sys_id only for a question that already exists on the instance (deployed separately or in another app)
  nextPanel: followUpQuestion, // string | Record<'sys_wizard'> | Interceptor, optional - DEFAULT next panel, used when the
    // selected answer has no nextQuestion. Pass the Interceptor(...) return value for a same-project question
  protectionPolicy: 'read', // 'read' | 'protected', optional - written to sys_wizard ONLY; NOT propagated to the
    // sys_wizard_answer rows. Omit to allow other developers to customize
  // $override: { ... } // optional - extra sys_wizard columns, ROOT record only

  // ── ANSWERS: InterceptorAnswer[], optional - one sys_wizard_answer each. `type` decides which other fields have any
  //    effect, so each entry below shows ONE variant with only its own fields. Valid on EVERY variant: $id, name, answer,
  //    type, script, roles, order, active. ──
  answers: [
    // ── 'answer' (default): navigate to targetUrl ──
    {
      $id: Now.ID['answer_url'], // Now.ID | string | number, MANDATORY on every answer - sys_wizard_answer has no safe
        // natural key. Missing -> TS2322 and a failed build
      type: 'answer', // InterceptorAnswerType | string, optional (default 'answer'). Stored codes: 'answer'=1,
        // 'leadingQuestion'=2, 'multipleChoice'=3, 'yesNo'=4, 'freeformText'=5, 'button'=6, 'externalChoice'=9.
        // Open union: an unknown string is stored verbatim as the code with NO diagnostic
      answer: 'A general issue', // string, optional - option text shown to the user ("User Prompt" on the form)
      name: 'General issue', // string, optional - internal label; when omitted the build copies `answer` into it
      targetUrl: 'incident.do?sys_id=-1', // string, optional - used by 'answer'. The destination needs an active form/view;
        // every sysparm_query pre-fill field must be on that form (else silently dropped); write a multi-word value with
        // a literal space, never '+' or '%20'. None of this is build-checked
      script: '', // string, optional, ANY type - server script run when this answer is selected. A string literal or
        // Now.include('./x.js'); an inline arrow/function expression is a hard build error
      roles: ['itil'], // (string | Role)[], optional, ANY type - RUNTIME visibility filter only, stored as comma-joined role
        // names; not a build-time or access-control check
      order: 100, // number, optional (default 100) - give EVERY sibling a distinct value: ties emit a build warning and the
        // display order becomes unpredictable
      active: true, // boolean, optional (default true) - whether the answer is presented
    },
    // ── 'leadingQuestion': advance to another Interceptor question ──
    {
      $id: Now.ID['answer_leading'],
      type: 'leadingQuestion',
      answer: 'A hardware problem',
      nextQuestion: followUpQuestion, // string | Record<'sys_wizard'> | Interceptor, optional - used by 'leadingQuestion';
        // overrides the Interceptor's nextPanel for this answer only
      order: 200,
    },
    // ── 'externalChoice': PREFER over 'multipleChoice' whenever the options already exist as a sys_choice dropdown ──
    {
      $id: Now.ID['answer_external'],
      type: 'externalChoice',
      answer: 'Pick a category',
      table: 'incident', // TableName, optional - used by 'externalChoice'. Reads the sys_choice values defined for `element`;
        // it does NOT list records of the table. Not validated at build time. In a scoped app the table must be in the same
        // scope (<scope>_ prefix) — advisory only, the build does not enforce it
      element: 'category', // string, optional - choice column on `table`. Set `table` AND `element` together: an incomplete
        // pair is ignored by the platform (`element` without `table` emits a build warning)
      // dependentValue: 'hardware', // string, optional - ONLY when `element` is itself a dependent choice list
      //   (e.g. element 'subcategory', which depends on 'category'); omit for simple lists such as 'state'
      order: 300,
    },
    // ── 'yesNo' / 'freeformText': capture input; ONLY payloadName has runtime effect ──
    {
      $id: Now.ID['answer_yes_no'],
      type: 'yesNo', // or 'freeformText' for a text box. Other fields are stored but inert
      answer: 'Is this blocking your work?',
      payloadName: 'is_blocking', // string, optional in the type, but always set it for these two types (a missing one
        // is only a hint the CLI never prints)
      order: 400,
    },
    // ── 'button': a labeled button, usually running `script` ──
    {
      $id: Now.ID['answer_button'],
      type: 'button',
      buttonLabel: 'Escalate now', // string, optional - used by 'button'; the visible text. Do NOT also set `answer` on a
        // button: it is stored but not displayed (build warning)
      script: "current.priority = '1'; current.update();",
      roles: ['itil'],
      order: 500,
    },
    // ── 'multipleChoice': options come from sys_wizard_choice rows, which Interceptor() never writes ──
    {
      $id: Now.ID['answer_multiple_choice'],
      type: 'multipleChoice', // every multipleChoice answer emits a hint the CLI never prints. Choices: see Record() below
      answer: 'Pick a severity',
      order: 600,
    },
  ],
})

// ── sys_wizard_choice: the sub-choices of a 'multipleChoice' answer (typed table, SDK v4.13.0+) ──
// The .d.ts says to create these with the Record API, and the build supports it. interceptor-guide.md instead says to add
// them by hand on the instance after deploying. Install-time behaviour of this Record() path was NOT verified against an
// instance. sys_wizard_choice has no coalesce key: choices edited on the instance drift from source (reconcile with a new
// Record() call plus Now.del() of the duplicate).
Record({
  $id: Now.ID['answer_multiple_choice_high'], // Now.ID | string | number, mandatory
  table: 'sys_wizard_choice',
  data: {
    answer: Now.ref('sys_wizard_answer', 'answer_multiple_choice'), // reference to the parent answer, by its Now.ID KEY.
      // WARNING: Now.ID['answer_multiple_choice'] here writes the literal key string, a BROKEN reference — use Now.ref(...)
    text: 'High', // string (max 80) - label shown to the user
    value: 'high', // string (max 80) - value stored when the choice is selected
    order: 100, // number (default 100) - distinct per choice under the same answer (ties are scoped per parent answer)
  },
})
```
