# action

Built-in action steps for use inside a Flow or Subflow via `wfa.action()`.

```typescript
import { action } from '@servicenow/sdk/automation'
```

## action.core

| Key | Name | Description |
|-----|------|-------------|
| `addWorknoteLinkToContext` | Add Worknote Link to Context | Adds a Worknote link referencing to the execution context. |
| `askForApproval` | Ask For Approval | Create Approvals on any record in the ServiceNow system. You can configure a rule set for an approval, rejection, or cancellation. You can add additional rule sets to further define approval rule(s) and rejection rule(s). If a Due Date is added to an approval, it automatically approves, rejects, or cancels the approvals if the approvers have not responded. |
| `associateRecordToEmail` | Associate Record to Email | Associate a record with an Email [sys_email] record so that you can track which record is affected by the email. This action updates the Target field on the email record. |
| `copyAttachment` | Copy Attachment | Copies an attachment to a target record. The source is an attachment record. You can dynamically add and configure fields for the record. Server-side validation rules are enforced (data policy, business rules, dictionary-defined mandatory fields), but UI policy does not apply. |
| `createCatalogTask` | Create Catalog Task | Creates a Catalog Task on a Service Catalog Request Item [sc_req_item]. The task can be configured to be blocking or non-blocking. |
| `createOrUpdateRecord` | Create or Update Record | Create or update a record in a ServiceNow table by determining if it already exists. Add records that do not exist, and update existing ones. Identify existing records by selecting unique fields. Set field values dynamically and enforce server-side validation rules (data policy, business rules, dictionary-defined mandatory fields). UI policy does not apply. |
| `createRecord` | Create Record | Creates a record on any ServiceNow table. You can dynamically add and configure fields for the record. Server-side validation rules are enforced (data policy, business rules, dictionary-defined mandatory fields), but UI policy does not apply. |
| `createTask` | Create Task | Creates a task on any ServiceNow task table. After you choose the task table, you can dynamically select the fields to configure the action. A Parent field associates to a Parent record (Incident Task to Incident record).  To block the flow until this task is completed, select 'Wait'. |
| `deleteAttachment` | Delete Attachment | Deletes one or more attachment(s) associated with the record. You could delete a single attachment by providing File Name input field .You could also delete all the attachments bound to the record by using Delete All Attachment checbox. Either File Name input field or Delete All Attachments checkbox should be used. If a record has multiple attachments with same name, all such matching  attachments will be deleted. |
| `deleteRecord` | Delete Record | Deletes a record on any ServiceNow table. |
| `fireEvent` | Fire Event | This action can be used to fire a specific system event. This action typically passes four parameters that can be used within the event. |
| `getAttachmentsOnRecord` | Get Attachments on Record | Returns a list and count of the attachments associated with the provided source record. Use flow logic or scripting to process individual attachments. Returns an error if server-side validation such as ACLs, business rules, or data policies prevent the look up. |
| `getCatalogVariables` | Get Catalog Variables | Surface Catalog Variables on the Flow and/or on a given record. |
| `getEmailHeader` | Get Email Header | Access an email header value as a data pill. If multiple headers have the same name, then the action gets the value of the first header that appears. |
| `getLatestResponseTextFromEmail` | Get Latest Response Text From Email | This action provides the latest response text from body text of the email thread |
| `log` | Log | Log a message |
| `lookUpEmailAttachments` | Look Up Email Attachments | Retrieve attachment records associated with a particular email record |
| `lookUpRecord` | Look Up Record | Look up a singular record on any ServiceNow table. You can configure the conditions for the record lookup. If multiple records are found, only the first record returns. |
| `lookUpRecords` | Look Up Records | Look up multiple records on any ServiceNow table. You can configure the conditions for the records found. The output includes a list of records and the number of records found. Note: The maximum number of records that can be returned is configured by a property and by default is 10K records. If more than 10K records are found, only the first 10K are returned. |
| `lookupAttachment` | Look Up Attachment | Looks up an attachment and returns the Sys ID of the attachment. If more than one attachment is present, it searches by the file name and returns the Sys ID and if there are duplicate file names then it returns the first Sys ID encountered. A JSON Object is also returned that has all the attachments returned with File name and File size properties. Server-side validation rules are enforced (data policy, business rules, dictionary-defined mandatory fields), but UI policy does not apply. |
| `moveAttachment` | Move Attachment | Moves an attachment to a target record. The source is an attachment record. You can dynamically add and configure fields for the record. Server-side validation rules are enforced (data policy, business rules, dictionary-defined mandatory fields), but UI policy does not apply. |
| `moveEmailAttachmentsToRecord` | Move Email Attachments to Record | Moves all email attachments to a record and updates the email attachments table. To prevent issues with large email messages, the system enforces configured limits on the maximum allowed email body size, total attachment file size, and number of attachments per email. |
| `recordProducer` | Record Producer | Creates a record on a table in the system. |
| `sendEmail` | Send Email | Send rich text emails to a comma separated list of email addresses, user records, and group records. If user records do not have an email address configured, the email will not be sent to that user.   Use pills to decorate the subject line and email body. Note: Commas are not required between pills, only static email addresses |
| `sendNotification` | Send Notification | Send a notification in one or more formats as specified by a notification record. The notification record you select determines the notification format and recipients. |
| `sendSms` | Send SMS | Send SMS to user records and group records using email-based SMS. If user records do not have an SMS device configured, an SMS will not be sent to that user. |
| `slaPercentageTimer` | SLA Percentage Timer | Timer action for SLA percentage tracking. |
| `submitCatalogItemRequest` | Submit Catalog Item Request | Creates a requested item [sc_req_item] on a Service Catalog Request [sc_req]. The request can be configured to be a blocking or non-blocking task. |
| `updateMultipleRecords` | Update Multiple Records | Update Multiple Records on a ServiceNow table. You can configure the conditions for the records to be updated. Server-side validation rules are enforced (data policy, business rules, dictionary-defined mandatory fields), but UI policy does not apply. |
| `updateRecord` | Update Record | Update an existing record on a ServiceNow table. You can dynamically add and configure fields for the record. Server-side validation rules are enforced (data policy, business rules, dictionary-defined mandatory fields), but UI policy does not apply. |
| `waitForCondition` | Wait For Condition | Wait for condition action causes the flow to wait until the record matches the specified condition. Use this activity to block the flow indefinitely until a particular condition is met. You must populate the condition field. |
| `waitForEmailReply` | Wait For Email Reply | Wait for email reply action causes the flow to wait until an email reply is recieved to the input email record. Use this activity to block the flow indefinitely until the inbound email is received. You must populate the record field with a sys_email record. |
| `waitForMessage` | Wait For Message | Pause a flow until it receives a specific message from the flow API. Specify the string message that resumes running the flow, and optionally provide a time-out value to resume the flow if no message is received after a specific amount of time. |
