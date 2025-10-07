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
            columnType: 'String',
        }),
        app_key: GenericColumn({
            label: 'App Type',
            mandatory: true,
            hint: "A short keyword to represent your app's function",
            columnType: 'String',
        }),
        channel: GenericColumn({
            label: 'Channel',
            mandatory: true,
            hint: 'External channel type',
            columnType: 'Choice',
            choices: {
                slack: { label: 'Slack', sequence: 0 },
                teams: { label: 'Teams', sequence: 1 },
                workplace: { label: 'Facebook Workplace', sequence: 2 },
            },
        }),
        oauth_endpoint: GenericColumn({ label: 'Oauth Endpoint', mandatory: true, columnType: 'String' }),
        oauth_scope: GenericColumn({ label: 'Oauth Scope', columnType: 'String' }),
        client_id: GenericColumn({ label: 'Client ID', mandatory: true, columnType: 'String' }),
    },
})
```