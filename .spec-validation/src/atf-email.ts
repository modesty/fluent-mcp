// filters the Email [sys_email] table to find an email that was sent from a notification during testing
atf.email.validateOutboundEmail({
  $id: Now.ID[''], // string | guid, mandatory
  conditions: '', //string, Servicenow encoded query
});

// Filters the Email [sys_email] table to find an email that was sent from a flow during testing.
atf.email.validateOutboundEmailGeneratedByFlow({
  $id: Now.ID[''], // string | guid, mandatory
  sourceFlow: get_sys_id('sys_hub_flow', ''), // sys_id | Record&lt;'sys_hub_flow'&gt;;
  conditions: '', //string, Servicenow encoded query
});

// Filters the Email [sys_email] table to find an email that was sent from a notification during testing.
atf.email.validateOutboundEmailGeneratedByNotification({
  $id: Now.ID[''], // string | guid, mandatory
  sourceNotification: get_sys_id('sysevent_email_action', ''), // sys_id | Record&lt;'sysevent_email_action'&gt;;
  conditions: '', //string, Servicenow encoded query
});

// Generates a new inbound email. This step also creates an email.read event upon step completion
atf.email.generateInboundEmail({ 
  $id: Now.ID[''], // string | guid, mandatory
  from: '',
  to: '', 
  subject: '',
  body: '' 
});

// generates an Email [sys_email] record that looks like an email sent in reply to a system notification. This step also creates an email.read event upon step completion.
atf.email.generateInboundReplyEmail({
  $id: Now.ID[''], // string | guid, mandatory
  targetTable: '', 
  targetRecord: '', // string | Record&lt;'targetTable'&gt;;
  subject: '',
  body: '',
  from: '',
  to: '',
}); // recordId of the inbound reply email

// Generates a string that can be used as test data for another test step. By default, the string is 10 characters long. The maximum length of the string is 10,000 characters.
atf.email.generateRandomString({ 
  $id: Now.ID[''], // string | guid, mandatory
  length: 1024, // number
});