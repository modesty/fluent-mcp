# **Context:** RetryPolicy API spec (SDK v4.8.0+): Creates a Retry Policy (`sys_retry_policy`) that controls how outbound integration connections handle **transient failures**. It defines the retry strategy, attempt count, wait interval, maximum elapsed time, and the conditions under which retries apply. Attach a RetryPolicy to a connection `Alias` to govern retry behavior for HTTP/REST, JDBC, or SFTP connections.

```typescript
// Creates a new Retry Policy (`sys_retry_policy`). Import from '@servicenow/sdk/core'.
// The type is a DISCRIMINATED UNION (RetryAfter | HttpRetry | NonHttpRetry): TypeScript enforces
// valid field combinations at compile time (see constraints below).
RetryPolicy({
 $id: '', // string | number | guid, mandatory - unique identifier for the record
 name: '', // string, optional (default '') - display name shown in the retry policy list
 connectionType: 'http_retry_conditions', // optional (default 'http_retry_conditions') - connection type this policy applies to:
   // 'http_retry_conditions' (outbound HTTP/REST), 'jdbc_retry_conditions' (JDBC database), 'basic_retry_conditions' (SFTP)
 retryStrategy: 'fixed_time_interval', // optional (default 'fixed_time_interval') - wait-time strategy between attempts:
   // 'fixed_time_interval' (constant `interval` seconds), 'exponential_backoff' (doubles wait after each failure),
   // 'retry_after' (honors the HTTP `Retry-After` response header; ONLY valid with connectionType 'http_retry_conditions')
 count: 5, // number, optional - max number of retry attempts. NOT valid when retryStrategy is 'retry_after'
 interval: 5, // number, optional - wait interval in seconds. Used with 'fixed_time_interval' and 'exponential_backoff'. NOT valid with 'retry_after'
 maxElapsedTime: 120, // number, optional - total time budget for all attempts in seconds. REQUIRED when retryStrategy is 'retry_after';
   // not valid for other strategies. Must not exceed 86400 (24 hours)
 condition: '', // string, optional (default '') - encoded query deciding when to retry after a failure. ONLY valid with 'http_retry_conditions'
   // e.g. 'status_codeIN429,500,502,503,504' or 'status_code=429^ORstatus_codeBETWEEN500@599'
 restrictTo: ['http_method', 'status_code', 'error', 'response_body', 'response_headers'], // string[], optional - fields evaluated in `condition`.
   // Omit to use the platform default set; pass [] to explicitly clear all fields (no field evaluation)
 protectionPolicy: 'read', // 'read' | 'protected', optional - 'read' allows viewing but blocks edits; 'protected' hides and locks; undefined = full customization
}): RetryPolicy // returns a RetryPolicy object

// Compile-time constraints enforced by the discriminated union:
//   - 'retry_after' with `count` or `interval`               -> TypeScript error
//   - 'retry_after' without `maxElapsedTime`                  -> TypeScript error
//   - 'retry_after' with a non-HTTP connectionType           -> TypeScript error
//   - `maxElapsedTime` with a non-'retry_after' strategy     -> TypeScript error
//   - `condition` with a JDBC/SFTP connectionType            -> TypeScript error
// Runtime (build-time): `maxElapsedTime` > 86400 -> error.
```
