// Creates a new Inbound Email Action (`sys_email_action`)
import { InboundEmailAction } from '@servicenow/sdk/core'

InboundEmailAction({
  $id: '',                    // string | number | ExplicitKey<string>, mandatory
  action: 'record_action',    // 'record_action' | 'reply_email', mandatory — default: 'record_action'
  name: '',                   // string, optional — admin-facing name
  description: '',            // string, optional — documents the purpose
  table: 'incident',          // keyof Tables, optional — target table (e.g. 'incident', 'sc_req_item')
  type: 'new',                // 'new' | 'reply' | 'forward', optional — when to trigger (default 'new')
  active: false,              // boolean, optional — default false
  order: 100,                 // number, optional — execution order when multiple actions match (default 100)
  eventName: 'email.read',    // string, optional — event name that triggers this action
  stopProcessing: false,      // boolean, optional — stop downstream actions after this one runs (default false)
  conditionScript: '',        // string, optional — server-side condition that must evaluate true
  filterCondition: '',        // string, optional — encoded query to filter target records
  from: '',                   // string | Record<'sys_user'>, optional — restrict to specific sender
  requiredRoles: [],          // (string | Role)[], optional — roles the sender must have
  fieldAction: '',            // string, optional — field action template (record_action only). See format below.
  assignmentOperator: '',     // string, optional — assignment operator for field actions (record_action only)
  replyEmail: '',             // string, optional — HTML auto-reply content (reply_email only)
  script: '',                 // string | (args) => void, optional — runs when action triggers
                              //   Available in scope: current (GlideRecord target), event (sysevent),
                              //                       email (EmailWrapper), logger (ScopedEmailLogger),
                              //                       classifier (EmailClassifier)
                              //   Prefer Now.include('./script.js') over inline strings.
})