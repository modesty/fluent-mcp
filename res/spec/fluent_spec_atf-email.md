#**Context:** This chunk describes the Automated Test Framework (ATF) APIs used to test email functionalities within ServiceNow. It details methods for validating and generating email records, including outbound emails sent from notifications or flows, and simulating inbound emails or replies. The APIs allow for searching and filtering emails in testing scenarios, as well as mocking email content with generated strings. This chunk is relevant for automating email-related testing processes using ServiceNow's ATF.
```typescript
// filters the Email [sys_email] table to find an email that was sent from a notification during testing
atf.email.validateOutboundEmail({
  $id: Now.ID[''], // string | guid, mandatory
  conditions: '', //string, Servicenow encoded query
}):void;

// Filters the Email [sys_email] table to find an email that was sent from a flow during testing.
atf.email.validateOutboundEmailGeneratedByFlow({
  $id: Now.ID[''], // string | guid, mandatory
  sourceFlow: get_sys_id('sys_hub_flow', ''), // sys_id | Record&lt;'sys_hub_flow'&gt;;
  conditions: '', //string, Servicenow encoded query
}): void;

// Filters the Email [sys_email] table to find an email that was sent from a notification during testing.
atf.email.validateOutboundEmailGeneratedByNotification({
  $id: Now.ID[''], // string | guid, mandatory
  sourceNotification: get_sys_id('sysevent_email_action', ''), // sys_id | Record&lt;'sysevent_email_action'&gt;;
  conditions: '', //string, Servicenow encoded query
}): void;

// Generates a new inbound email. This step also creates an email.read event upon step completion
atf.email.generateInboundEmail({ 
  $id: Now.ID[''], // string | guid, mandatory
  from: '',
  to: '', 
  subject: '',
  body: '' 
}): { output_email_record: ''};

// generates an Email [sys_email] record that looks like an email sent in reply to a system notification. This step also creates an email.read event upon step completion.
atf.email.generateInboundReplyEmail({
  $id: Now.ID[''], // string | guid, mandatory
  targetTable: '', 
  targetRecord: '', // string | Record&lt;'targetTable'&gt;;
  subject: '',
  body: '',
  from: '',
  to: '',
}): { output_reply_email_record: ''}; // recordId of the inbound reply email

// Generates a string that can be used as test data for another test step. By default, the string is 10 characters long. The maximum length of the string is 10,000 characters.
atf.email.generateRandomString({ 
  $id: Now.ID[''], // string | guid, mandatory
  length: 1024, // number
}): { random_string: '' };
```