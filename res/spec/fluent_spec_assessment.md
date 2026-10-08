# **Context:** Assessment API spec (SDK v4.12.0+): Defines a ServiceNow **assessment or survey** as one nested entity — one `Assessment()` call writes the definition row (`asmt_metric_type`) plus every category (`asmt_metric_category`), question/metric (`asmt_metric`) and answer option (`asmt_metric_definition`); the `metric_type`, `category` and `metric` foreign keys are wired from the nesting, so never set them. Import `Assessment` from `@servicenow/sdk/core`. **Side effects of a scored assessment** (`evaluationMethod: 'assessment'`, the default): two `sys_script` business rules on `table` — a trigger rule (`when: 'after'`, insert/update) that runs `AssessmentUtils.checkRecord()` guarded by `AssessmentUtils.conditionCheck()` against `condition`, and a delete rule (`when: 'before'`) that runs `AssessmentUtils.checkDeleteRecord()` — plus a **third** `sys_script` (after update, order 300) only when the assessment is scored, `scheduleType: 'scheduled'`, `userField` is set and `state: 'published'`, all together; and whenever `scheduleType: 'scheduled'`, a `sys_trigger` job that ships **inactive** (state 0, no `next_action`). Surveys (`evaluationMethod: 'survey'`) get none of these. **Build-time rules:** a scored assessment needs `table` and an **integer** `scaleFactor` (a **build diagnostic** — the type marks both optional, and `now-sdk build` does not type-check); definition keys must be integer strings; `state: 'published'` needs at least one category and at least one metric per category. Use `RiskAssessment` (`fluent_spec_risk-assessment.md`) for change-request risk.

```typescript
// ══ FORM 1 of 2 — SCORED ASSESSMENT (evaluationMethod 'assessment', the default) ══
Assessment({
  $id: Now.ID['assessment_1'], // Now.ID | string | number, mandatory - identity; becomes the asmt_metric_type sys_id
  name: 'Service Security Assessment', // string, mandatory - display name (translated_text, max 255)
  evaluationMethod: 'assessment', // 'assessment' | 'survey', optional (default 'assessment') - ONLY these two values are accepted.
    // 'quiz', 'attestation', 'testPlan', 'riskAssessment', 'vendorRiskAssessment' etc. are NOT authorable here.
    // Omitting it means 'assessment', which makes `table` + `scaleFactor` mandatory at build time - set it explicitly
  table: 'cmdb_ci_service', // TableName, REQUIRED for 'assessment' (build error "'table' is required when 'evaluationMethod'
    // is 'assessment' (the default)."), optional for 'survey'. The records being assessed; also written to filter_table
  condition: 'operational_status=1', // string (encoded query), optional - which `table` records get assessed at all
    // (max 1000; the build appends ^EQ). Evaluated by the generated trigger rule. ALWAYS set it explicitly - empty = every record
  scaleFactor: 10, // number, REQUIRED for 'assessment' and must be an INTEGER (build errors: "'scaleFactor' is required when
    // 'evaluationMethod' is 'assessment' (the default)." / "'scaleFactor' must be an integer."). Typical 1, 10, 100. Default 0
  scoringType: 'percentage', // 'percentage' | 'allOrNothing', optional (default 'percentage') - DB percent | absolute
  description: '', // string, optional - rich text (max 1000)
  introduction: '', // string, optional - HTML shown before the assessment begins (max 8000)
  endNote: '', // string, optional - HTML shown after submit; DB end_note (max 8000)
  hideSurveyIntroductionNotes: false, // boolean, optional (default false) - DB not_show_intro_note
  active: true, // boolean, optional (default true)
  // sourceTable: 'cmdb_ci', // TableName, optional - alternate table the candidate records are pulled from; `table` stays the target
  scheduleType: 'onDemand', // 'scheduled' | 'onDemand', optional (default 'onDemand'; DB on_demand) - 'onDemand' = instances only
    // via UI actions/scripts. 'scheduled' adds a sys_trigger job that ships INACTIVE - activate it in System Scheduler after deploy
  // schedulePeriod: 'weekly', // 'noLimit' | 'onlyOnce' | 'weekly' | 'monthly' | 'yearly' | 'daily', optional (default 'noLimit')
  //   - recurrence, only meaningful with scheduleType 'scheduled' (DB 0 / 2 / 3 / 4 / 6 / 11)
  assessmentDuration: Duration({ days: 14 }), // Duration ({ days?, hours?, minutes?, seconds? }), optional (default 14 days)
    // - how long an instance stays open. Duration() is a Fluent global (no import). A glide_duration string is NOT accepted by the type
  allowRetake: false, // boolean, optional (default false)
  anonymizeResponses: false, // boolean, optional (default false) - DB anonymize
  roles: ['itil'], // (string | Role)[], optional - roles required to take it; stored as comma-separated role NAMES
  userField: 'owned_by', // keyof table | string, optional - column identifying the user being assessed (DB user_field).
    // Together with 'scheduled' + 'published' it adds the third (user-field sync) business rule
  filterField: 'support_group', // keyof table | string, optional - DB display_field. Adds a scorecard / decision-matrix filter menu;
    // it SEGMENTS the comparison pool, it does not rank groups
  filterCondition: '', // string (encoded query), optional - restricts which records appear in the decision matrix
  defaultMatrixFilter: '', // string (encoded query), optional - DB default_filter
  displayAllFilters: false, // boolean, optional (default false)
  enforceCondition: false, // boolean, optional (default false)
  returnUrl: '', // string, optional - public URL for anonymous / one-click surveys (DB url, max 500)
  liveFeed: false, // boolean, optional (default false)
  chatSurvey: false, // boolean, optional (default false) - expose through Virtual Agent
  oneClickSurvey: false, // boolean, optional (default false)
  portalPagination: 'category', // 'category' | 'question' | 'none', optional (default 'category')
  owners: [], // (string | Record<'sys_user'>)[], optional - survey owners (DB survey_owners, sys_ids)
  sendNotifications: true, // boolean, optional (default TRUE) - DB notify_user. This is NOT email delivery of the survey -
    // pair with an EmailNotification to actually send a link
  notifyIfOverdue: false, // boolean, optional (default false)
  // assessmentManager: '<sys_user sys_id>', // string | Record<'sys_user'>, optional - overdue-notification user (DB overdue_notify_user)
  // signature: '<asmt_signature sys_id>', // string | Record<'asmt_signature'>, optional - signature required on completion
  // sampleMetric: Now.ref('asmt_metric', 'q_mfa'), // string | Record<'asmt_metric'>, optional - metric used for previews
  state: 'draft', // 'draft' | 'published', optional (default 'draft') - DB publish_state. 'published' on a scored assessment
    // requires >= 1 category and >= 1 metric per category (build errors). Surveys are not checked
  // allowPublic: false, // boolean, optional (default false) - READ-ONLY on the platform; leave unset
  // businessRule / deleteBusinessRule / scheduleJob / userFieldBusinessRule: string - AUTO-GENERATED round-trip sys_ids.
  //   NEVER set them. businessRule/deleteBusinessRule input is ignored (keys are derived from $id); a non-GUID
  //   scheduleJob/userFieldBusinessRule is a build error

  // ── Cross-cutting (Now.Internal.WithIdAndMetadata) ──
  protectionPolicy: 'read', // 'read' | 'protected', optional - written as sys_policy on EVERY row, including the generated business rules
  // $override: { u_custom: 'x' }, // Record<string, string | boolean | number>, optional - root row only. sys_domain is
  //   hard-coded to global by the plugin, so a sys_domain override is IGNORED with a warning
  // NOTE: Assessment does NOT accept `$meta` (no installMethod, no useEsLatest) - the type has no Now.Internal.Meta

  // ── CATEGORIES (asmt_metric_category): sections of the assessment ──
  categories: [
    {
      $id: Now.ID['cat_access'], // Now.ID | string | number, mandatory
      name: 'Access Control', // string, mandatory (translated_text, max 255)
      description: '', // string, optional (max 1000)
      details: '', // string, optional - rich text (max 8000)
      weight: 100, // number, optional (default 10) - relative weight in the overall score. Weights are relative; nothing requires a sum of 100
      order: 100, // number, optional (default 1) - display order, lower first
      scoringType: 'percentage', // 'percentage' | 'allOrNothing', optional (default 'percentage') - per-category override
      roles: [], // (string | Role)[], optional - roles required to view/take this category (role NAMES)
      filter: 'operational_status=1', // string (encoded query), optional (max 4000; the build appends ^EQ) - which records this
        // category applies to. Set it EXPLICITLY on every category and keep it a SUBSET of the assessment `condition` -
        // a disjoint filter leaves the category with zero assessable records and blocks assignment
      createStakeholders: false, // boolean, optional (default false)
      // table / questionBankEvaluationMethod: READ-ONLY on the platform. Do not set `table` - the build overwrites it
      //   with the assessment's own table. total_metrics is auto-computed

      // ── METRICS (asmt_metric): a discriminated union keyed on `dataType` ──
      metrics: [
        // Metric A — the BASE fields (valid on every dataType), shown on a yesNo question
        {
          $id: Now.ID['q_mfa'], // Now.ID | string | number, mandatory
          name: 'MFA enforced', // string, mandatory - question label (max 255)
          question: 'Is MFA enforced for all privileged accounts?', // string, mandatory - question body (translated_text, max 512)
          dataType: 'yesNo', // mandatory discriminant - see the dataType table below
          correctAnswerYesNo: '1', // string, optional (yesNo only) - '1' = Yes, '0' = No
          description: '', // string, optional - help text (max 1000)
          details: '', // string, optional - rich text (max 8000)
          scored: true, // boolean, optional (default FALSE) - only scored metrics contribute to the score
          weight: 60, // number, optional (default 10) - relative weight within the category
          order: 100, // number, optional (default 100)
          mandatory: true, // boolean, optional (default false)
          readOnly: false, // boolean, optional (default false)
          active: true, // boolean, optional (default true)
          allowNotApplicable: false, // boolean, optional (default false)
          allowAdditionalInformation: false, // boolean, optional (default false)
          additionalInformationLabel: 'Additional Information', // string, optional (default 'Additional Information')
          hideLabel: false, // boolean, optional (default false)
          condition: '', // string (encoded query), optional - whether this ONE question applies, evaluated against the assessable
            // record (written verbatim, no ^EQ appended). Use dependsOn/displayedWhen* to key off a sibling's ANSWER instead
          maximumNormalizationInput: false, // boolean, optional (default false)
          // maxWeight: 0, // number, optional - maximum weight used when normalizing scores
          // valueParameters: '', // string, optional - name/value parameters (simple_name_values)
          // fieldValidation: '<sys_cs_field_script_validator sys_id>', // string | Record<'sys_cs_field_script_validator'>, optional
          // context: '<sys_cs_virtual_agent_context sys_id>', // string | Record<'sys_cs_virtual_agent_context'>, optional (chat surveys)
          // sourceField: '', // string, optional - field the metric reads from (data-collection metrics)
          // definitions: { ... } // base field, but only meaningful for choice / likertScale / numericScale / imageScale /
          //   multipleSelection / ranking (the type does not stop you putting it elsewhere) - see Metric C
        },

        // Metric B — CONDITIONAL question (revealed by a sibling's answer)
        {
          $id: Now.ID['q_mfa_gap'],
          name: 'MFA gap details',
          question: 'Describe why MFA is not enforced.',
          dataType: 'string', // string branch: stringOption only
          stringOption: 'multiline', // 'singleLine' | 'singleLineWide' | 'multiline', optional (default 'singleLine')
          order: 200,
          dependsOn: Now.ref('asmt_metric', 'q_mfa'), // string | Record<'asmt_metric'>, optional - the parent metric.
            // Use Now.ref('asmt_metric', '<sibling $id key>'). NOT Now.ID['<key>']: it builds, but once keys.ts registers the key
            // its ExplicitKey type is no longer assignable to dependsOn and tsc fails
          displayedWhenYesNo: '0', // string, optional - reveal value when the parent is yesNo: '1' = Yes, '0' = No
          // Pick the ONE reveal field matching the PARENT's dataType:
          //   displayedWhen: ['3'],          // parent choice / multipleSelection - definition KEYS, ALWAYS AN ARRAY
          //   displayedWhenCheckbox: '1',    // parent checkbox
          //   displayedWhenTemplate: ['<asmt_template_definition sys_id>'], // parent template - ALWAYS AN ARRAY
          //   The string form of displayedWhen / displayedWhenTemplate type-checks but is SILENTLY WRITTEN EMPTY by the build
          condQuestion: 'always', // 'ifFieldEmpty' | 'ifScriptEmpty' | 'always', optional (default 'always') - DB emptyfield | emptyscript | always
        },

        // Metric C — choice with answer options (asmt_metric_definition)
        {
          $id: Now.ID['q_review'],
          name: 'Access review cadence',
          question: 'How often are access reviews performed?',
          dataType: 'choice', // choice branch: correctAnswerChoice, randomizeAnswers
          scored: true,
          weight: 40,
          order: 300,
          correctAnswerChoice: ['1'], // string | (string | Record<'asmt_metric_definition'>)[], optional - ALWAYS use the ARRAY form;
            // a bare string type-checks but is SILENTLY WRITTEN EMPTY by the build
          randomizeAnswers: false, // boolean, optional (default false)
          definitions: { // { [value: string]: string | MetricDefinitionConfig }, optional - the KEY is the stored numeric `value`.
            // Keys MUST be integer strings ('1', '-2'); 'abc' or '1.5' is a build error. Coalesced on (metric, value), so NO $id here
            '1': { label: 'Quarterly', normalizationInput: 100, order: 100 }, // { label: string (mandatory), order?: number (default
              // position x 100), normalizationInput?: number, selectedImage?: string, unselectedImage?: string (imageScale only) }
            '2': { label: 'Annually', normalizationInput: 50 },
            '3': 'Never', // shorthand: value -> label
          },
        },

        // Metric D — numeric (number / percentage / numericScale share min, max, correctAnswer)
        {
          $id: Now.ID['q_privileged'],
          name: 'Privileged account count',
          question: 'Rate the number of privileged accounts (1 = few, 5 = many).',
          dataType: 'numericScale',
          order: 400,
          min: 1, // number, optional (default 0)
          max: 5, // number, optional (default 10). numericScale with NO `definitions` auto-generates one definition per integer
            // min..max (default 0..10 = 11 rows); a reversed range (min > max) silently generates none
          correctAnswer: 2, // number, optional - expected answer for scored numeric questions
        },

        // Metric E — reference (referenceTable is REQUIRED on this branch - a tsc error without it)
        {
          $id: Now.ID['q_owner'],
          name: 'Security owner',
          question: 'Who owns security for this service?',
          dataType: 'reference',
          referenceTable: 'sys_user', // TableName, MANDATORY for dataType 'reference'
          order: 500,
        },

        // Metric F — default answer pre-filled from a script (method defaults to 'assessment' = answered by the assessor)
        {
          $id: Now.ID['q_ci_count'],
          name: 'Dependent CI count',
          question: 'How many CIs depend on this service?',
          dataType: 'number',
          order: 600,
          method: 'defaultAnswerFromScript', // 'assessment' | 'defaultAnswerFromField' | 'defaultAnswerFromScript' | 'script',
            // optional (default 'assessment') - DB assessment | condfield | condscript | script.
            // 'defaultAnswerFromScript' REQUIRES `script` AND `dependentPlugin` (build errors name it 'condscript')
          script: '<server script that produces the default answer>', // string, optional (max 4000) - only evaluated for
            // 'script' / 'defaultAnswerFromScript'. For 'defaultAnswerFromScript' it MUST be an INLINE string literal: the
            // build's script check does not see Now.include(...), so Now.include fails with "must also set 'script'"
          dependentPlugin: 'CMDB', // 'Software Asset Management' | 'Core' | 'CMDB' | 'Procurement' | 'Cost Management' | 'Asset Management',
            // optional - friendly labels only (DB com.snc.*); passing 'com.snc.cmdb' is a type error
          condQuestion: 'ifScriptEmpty', // ask the question only when the script returned no default answer
          // For 'defaultAnswerFromField' set defaultAnswer: '<column on table>' (DB default_value_field) with condQuestion 'ifFieldEmpty'
        },
      ],
      // dataType (friendly -> DB datatype) and the ONLY extra fields each branch accepts:
      //   'string'            -> string             stringOption?
      //   'reference'         -> reference          referenceTable (MANDATORY)
      //   'likertScale'       -> scale              scaleDefinition?: 'low' | 'high' (default 'high'); use definitions for the points
      //   'choice'            -> choice             correctAnswerChoice? (array form), randomizeAnswers?; use definitions
      //   'checkbox'          -> checkbox           correctAnswerCheckbox?: string ('1' checked)
      //   'yesNo'             -> boolean            correctAnswerYesNo?: string ('1' = Yes, '0' = No)
      //   'template'          -> template           template?: string | Record<'asmt_template'>, correctAnswerTemplate? (array form)
      //   'duration'          -> duration           duration?: string (glide_duration)
      //   'custom'            -> custom             customMetric?: string | Record<'asmt_custom_metric'>
      //   'number'            -> long               min?, max?, correctAnswer?
      //   'percentage'        -> percentage         min?, max?, correctAnswer?
      //   'numericScale'      -> numericscale       min?, max?, correctAnswer? (definitions auto-generated when omitted)
      //   'attachment' -> attachment, 'date' -> date, 'dateTime' -> datetime, 'imageScale' -> imagescale (definitions with
      //   selectedImage/unselectedImage), 'ranking' -> ranking (definitions), 'ratings' -> rating,
      //   'multipleSelection' -> multiplecheckbox (definitions)   - no branch-only fields
      // A branch field on the wrong dataType (e.g. min on 'yesNo') is a tsc error - but NOT a build error.
    },
  ],
})

// ══ FORM 2 of 2 — UNSCORED SURVEY ══
// No table, no scaleFactor, no business rules. The build forces the definition row's table to asmt_metric_type and its
// condition to the survey's own sys_id, so do not set `table` or `condition` on a survey (a `table` would still leak into
// filter_table and every category's table).
Assessment({
  $id: Now.ID['survey_1'],
  name: 'Employee Onboarding Survey',
  evaluationMethod: 'survey', // REQUIRED for a survey - omitting it makes this a scored assessment and the build fails
  anonymizeResponses: true,
  categories: [
    {
      $id: Now.ID['survey_cat_1'],
      name: 'Workspace',
      metrics: [
        { $id: Now.ID['survey_q_1'], name: 'Laptop ready', question: 'Was your laptop ready on day one?', dataType: 'yesNo', mandatory: true },
        { $id: Now.ID['survey_q_2'], name: 'Comments', question: 'Anything else?', dataType: 'string', stringOption: 'multiline' },
      ],
    },
  ],
})
```
