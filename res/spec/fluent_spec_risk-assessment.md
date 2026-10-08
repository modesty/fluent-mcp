# **Context:** RiskAssessment API spec (SDK v4.12.0+): Defines a **change risk assessment** — scored questions plus thresholds that map a score to a change `risk` level — as one nested entity. One `RiskAssessment()` call writes the definition row (`change_risk_asmt`, which extends `asmt_metric_type`) plus one `change_risk_asmt_threshold` per `thresholds` entry and the same categories (`asmt_metric_category`), metrics (`asmt_metric`) and answer options (`asmt_metric_definition`) as `Assessment`; the `assessment`, `metric_type`, `category` and `metric` foreign keys are wired from the nesting. Import `RiskAssessment` from `@servicenow/sdk/core`. The build **fixes** `table` to `change_request` and **forces** `evaluation_method` to `risk_assessment` — `RiskAssessmentConfig` has **no `table` and no `evaluationMethod` property**. Unlike `Assessment`, it generates **no `sys_script` business rule and no `sys_trigger` job**, and it runs only the publish-state and definition-key build checks (no integer `scaleFactor` check, no 'condscript' check). The tables exist only when the Change Management - Risk Assessment plugin (`com.snc.change_management.risk_assessment`) is active on the target instance. Categories/metrics/definitions have exactly the shapes documented in `fluent_spec_assessment.md`.

```typescript
RiskAssessment({
  $id: Now.ID['change_risk_1'], // Now.ID | string | number, mandatory - identity; becomes the change_risk_asmt sys_id
  name: 'Change Risk Assessment', // string, mandatory - the ONLY other required property (translated_text, max 255)
  // NOTE: there is NO `table` property (always change_request) and NO `evaluationMethod` property (always
  //   risk_assessment). Both are type errors. Do not try to retarget a risk assessment - use Assessment instead.
  condition: 'active=true', // string (encoded query), optional - which change_request records get risk-assessed
    // (max 1000; the build appends ^EQ). ALWAYS set it explicitly, even to cover every change
  scaleFactor: 10, // number, optional (default 0) - score scale factor. Use an INTEGER (1, 10, 100): unlike Assessment,
    // the RiskAssessment build does NOT reject a float - 10.5 is written as-is into an integer column
  scoringType: 'percentage', // 'percentage' | 'allOrNothing', optional (default 'percentage') - DB percent | absolute
  description: '', // string, optional - rich text (max 1000)
  introduction: '', // string, optional - HTML shown before the assessment begins (max 8000)
  endNote: '', // string, optional - HTML shown after submit; DB end_note (max 8000)
  hideSurveyIntroductionNotes: false, // boolean, optional (default false) - DB not_show_intro_note
  active: true, // boolean, optional (default true)
  // sourceTable: 'change_request', // TableName, optional - alternate source table for candidate records
  assessmentDuration: Duration({ days: 14 }), // Duration ({ days?, hours?, minutes?, seconds? }), optional (default 14 days)
  allowRetake: false, // boolean, optional (default false)
  anonymizeResponses: false, // boolean, optional (default false) - DB anonymize
  roles: ['itil'], // (string | Role)[], optional - roles required to take it; stored as comma-separated role NAMES
  // userField: 'assigned_to', // keyof change_request | string, optional - DB user_field
  // filterField: 'assignment_group', // keyof change_request | string, optional - DB display_field (the build leaves filter_table empty)
  // filterCondition: '', defaultMatrixFilter: '', displayAllFilters: false, enforceCondition: false - optional, same as Assessment
  // returnUrl: '', liveFeed: false, chatSurvey: false, oneClickSurvey: false - optional, same as Assessment
  portalPagination: 'category', // 'category' | 'question' | 'none', optional (default 'category')
  owners: [], // (string | Record<'sys_user'>)[], optional - DB survey_owners (sys_ids)
  sendNotifications: true, // boolean, optional (default true) - DB notify_user
  notifyIfOverdue: false, // boolean, optional (default false)
  // assessmentManager / signature / sampleMetric: optional references, same as Assessment
  scheduleType: 'onDemand', // 'scheduled' | 'onDemand', optional (default 'onDemand') - keep 'onDemand': 'scheduled' only
    // writes schedule_type and does NOT create any sys_trigger job for a risk assessment
  state: 'draft', // 'draft' | 'published', optional (default 'draft') - 'published' requires >= 1 category and >= 1 metric
    // per category (build errors, same as Assessment)
  // allowPublic: READ-ONLY on the platform; leave unset
  // businessRule / deleteBusinessRule / scheduleJob / userFieldBusinessRule: inherited round-trip fields. NEVER set them -
  //   no business rule is generated, and scheduleJob / userFieldBusinessRule are ignored by the RiskAssessment build

  // ── Cross-cutting (Now.Internal.WithIdAndMetadata) ──
  protectionPolicy: 'read', // 'read' | 'protected', optional - written as sys_policy on every row
  // $override: { u_custom: 'x' }, // optional - root row only; sys_domain is hard-coded to global and cannot be overridden
  // NOTE: RiskAssessment does NOT accept `$meta` (no installMethod, no useEsLatest)

  // ── THRESHOLDS (change_risk_asmt_threshold): map a score to a risk level ──
  thresholds: [
    {
      $id: Now.ID['change_risk_high'], // Now.ID | string | number, MANDATORY - thresholds have no coalesce key; $id is the identity
      risk: 'high', // 'high' | 'moderate' | 'low', mandatory - written as the change_request.risk value: high = 2, moderate = 3, low = 4
      scoreGreaterThan: 70, // number, mandatory - minimum score for this level (integer column). Not validated by the build:
        // keep it an integer and keep the levels ordered (high > moderate > low); the platform checks the highest first
    },
    { $id: Now.ID['change_risk_moderate'], risk: 'moderate', scoreGreaterThan: 30 },
    { $id: Now.ID['change_risk_low'], risk: 'low', scoreGreaterThan: 0 },
  ],

  // ── CATEGORIES / METRICS: identical shapes to Assessment (see fluent_spec_assessment.md for every field and the
  //    full 19-value dataType union). Each category's `table` is always written as change_request. ──
  categories: [
    {
      $id: Now.ID['change_risk_cat_impact'], // Now.ID | string | number, mandatory
      name: 'Change Impact', // string, mandatory
      weight: 60, // number, optional (default 10) - relative weight in the overall score
      order: 100, // number, optional (default 1)
      filter: 'active=true', // string (encoded query), optional - set it explicitly and keep it a SUBSET of `condition`;
        // a disjoint filter leaves the section blank on the change's Risk Assessment view, with no step to fix it afterwards
      metrics: [
        {
          $id: Now.ID['change_risk_q_downtime'], // mandatory
          name: 'Downtime required', // string, mandatory
          question: 'Does this change require production downtime?', // string, mandatory
          dataType: 'yesNo', // mandatory discriminant
          correctAnswerYesNo: '0', // string, optional - '1' = Yes, '0' = No
          scored: true, // boolean, optional (default false)
          weight: 40, // number, optional (default 10)
          order: 100, // number, optional (default 100)
          mandatory: true, // boolean, optional (default false)
        },
        {
          $id: Now.ID['change_risk_q_rollback_details'],
          name: 'Rollback details',
          question: 'Describe how downtime will be minimised.',
          dataType: 'string',
          stringOption: 'multiline', // 'singleLine' | 'singleLineWide' | 'multiline', optional
          order: 200,
          dependsOn: Now.ref('asmt_metric', 'change_risk_q_downtime'), // use Now.ref('asmt_metric', '<key>'), not Now.ID['<key>']
          displayedWhenYesNo: '1', // reveal only when the parent is answered Yes ('1')
        },
        {
          $id: Now.ID['change_risk_q_type'],
          name: 'Change type',
          question: 'What type of change is this?',
          dataType: 'choice',
          scored: true,
          weight: 60,
          order: 300,
          correctAnswerChoice: ['1'], // ALWAYS the ARRAY form - a bare string is silently written empty
          definitions: { // integer-string keys only (build error otherwise); no $id on definitions
            '1': { label: 'Standard', normalizationInput: 0 },
            '2': { label: 'Normal', normalizationInput: 50 },
            '3': { label: 'Emergency', normalizationInput: 100 },
          },
        },
      ],
    },
  ],
})
```
