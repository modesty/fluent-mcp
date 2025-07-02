```typescript
import { GenericColumn, Table } from '@servicenow/sdk/core'

export const sys_proxy_app = Table({
    name: 'sys_proxy_app',
    label: 'Channel Proxy App Installation',
    audit: true,
    extends: 'sys_metadata',
    schema: {
        name: GenericColumn({
            label: 'App Name',
            mandatory: true,
            hint: 'The name of your app',
            column_type: 'String',
        }),
        app_key: GenericColumn({
            label: 'App Type',
            mandatory: true,
            hint: "A short keyword to represent your app's function",
            column_type: 'String',
        }),
        channel: GenericColumn({
            label: 'Channel',
            mandatory: true,
            hint: 'External channel type',
            column_type: 'Choice',
            choices: {
                slack: { label: 'Slack', sequence: 0 },
                teams: { label: 'Teams', sequence: 1 },
                workplace: { label: 'Facebook Workplace', sequence: 2 },
            },
        }),
        oauth_endpoint: GenericColumn({ label: 'Oauth Endpoint', mandatory: true, column_type: 'String' }),
        oauth_scope: GenericColumn({ label: 'Oauth Scope', column_type: 'String' }),
        client_id: GenericColumn({ label: 'Client ID', mandatory: true, column_type: 'String' }),
    },
})
```