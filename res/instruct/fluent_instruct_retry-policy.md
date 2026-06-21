# Instructions for Fluent RetryPolicy API
Always reference the RetryPolicy API specifications for more details.
1. Import `RetryPolicy` from `@servicenow/sdk/core`. The `$id` field is mandatory and must be unique, typically using `Now.ID['value']`. Assign the result to an `export const` so a connection `Alias` can reference it.
2. Use a RetryPolicy to make outbound integrations resilient to **transient failures** (rate limiting, brief 5xx outages, dropped connections). Attach it to a connection `Alias` via the alias `retryPolicy` property.
3. Choose `connectionType` to match the integration: `'http_retry_conditions'` for HTTP/REST, `'jdbc_retry_conditions'` for JDBC databases, `'basic_retry_conditions'` for SFTP.
4. Pick `retryStrategy` deliberately: `'fixed_time_interval'` waits a constant `interval`; `'exponential_backoff'` doubles the wait after each failure (best for rate-limited APIs); `'retry_after'` honors the server's HTTP `Retry-After` header (HTTP only).
5. The type is a **discriminated union**, so the compiler rejects invalid combinations. For `'fixed_time_interval'`/`'exponential_backoff'`, set `count` and `interval`. For `'retry_after'`, set `maxElapsedTime` (required, ≤ 86400 seconds) and do **not** set `count` or `interval`.
6. Use `condition` (an encoded query, e.g. `'status_codeIN429,500,502,503,504'`) to retry only on specific responses. `condition` is valid only with `'http_retry_conditions'`. Narrow the evaluated fields with `restrictTo`; pass `[]` to disable field evaluation entirely, or omit it to use the platform default set.
7. Set `protectionPolicy: 'read'` to let other developers view but not edit the policy after install, or `'protected'` to hide and lock it. Leave it undefined to allow full customization.
8. Keep `maxElapsedTime` reasonable — it caps total retry time across all attempts and must not exceed 86400 seconds (24 hours).
