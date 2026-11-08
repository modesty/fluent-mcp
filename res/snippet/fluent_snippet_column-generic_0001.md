```typescript
import { GenericColumn, Table } from '@servicenow/sdk/core'

// A custom global table (u_ prefix); the platform's sys_proxy_app cannot be redefined by an app.
// columnType takes the glide internal_type name, which is lowercase ('string', 'choice', ...).
export const u_proxy_app = Table({
    name: 'u_proxy_app',
    label: 'Channel Proxy App Installation',
    audit: true,
    extends: 'sys_metadata',
    schema: {
        name: GenericColumn({
            label: 'App Name',
            mandatory: true,
            hint: 'The name of your app',
            columnType: 'string',
        }),
        app_key: GenericColumn({
            label: 'App Type',
            mandatory: true,
            hint: "A short keyword to represent your app's function",
            columnType: 'string',
        }),
        channel: GenericColumn({
            label: 'Channel',
            mandatory: true,
            hint: 'External channel type',
            columnType: 'choice',
            choices: {
                slack: { label: 'Slack', sequence: 0 },
                teams: { label: 'Teams', sequence: 1 },
                workplace: { label: 'Facebook Workplace', sequence: 2 },
            },
        }),
        oauth_endpoint: GenericColumn({ label: 'Oauth Endpoint', mandatory: true, columnType: 'string' }),
        oauth_scope: GenericColumn({ label: 'Oauth Scope', columnType: 'string' }),
        client_id: GenericColumn({ label: 'Client ID', mandatory: true, columnType: 'string' }),
    },
})
```