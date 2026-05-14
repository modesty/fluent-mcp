
# Configuring External Services Guide

Guide for configuring external LDAP directory connections in ServiceNow, including LDAP Server Configs (`ldap_server_config`) and LDAP Server URLs (`ldap_server_url`) for failover and load balancing. Use when the user mentions LDAP server configuration, directory servers, Active Directory, OpenLDAP, LDAP failover, or LDAP SSL. For LDAP data imports (staging tables, data sources, transform maps), use the importing-data skill instead. Supported in SDK 4.2.0+.

## When to Use

- When configuring external LDAP directory connections in ServiceNow
- When setting up server configs, connection URLs, failover, or load balancing
- When the user mentions LDAP, Active Directory, OpenLDAP, or directory servers
- NOT for LDAP data imports -- use the importing-data skill for that

## Key Concepts

- **LDAP vendors**: `active_directory`, `open_ldap`, `sun`, `edirectory`, `domino`, `other` -- determines response interpretation.
- **Connection modes**: Standard (`ldap://`, port 389) vs Secure (`ldaps://`, port 636).
- **URL ordering**: Different order values = failover (priority-based); same order = load balancing (distributed).
- **Record object references**: Pass the variable from `Record()` calls, not sys_id strings, for cross-table references.
- **Relationship to data import**: LDAP server config -> LDAP OU config -> Data Source (see importing-data skill for full chain).

## Instructions

### LDAP Server Configuration

1. Every config requires at minimum: `name`, `server_url`, `dn`, `password`, and `vendor`. Leave `password` empty (`''`) with a `// LEAVE EMPTY` comment -- passwords are set manually in ServiceNow after deployment.
2. Set the `vendor` field to match the directory server type.
3. Enable `paging: true` for directories with large result sets (>1000 entries).
4. Set `ssl: true` and use `ldaps://` URLs with port 636 for production. Only use `ldap://` (port 389) for development.
5. Configure `connect_timeout` and `read_timeout` appropriate to network conditions. Defaults: 10s connect, 30s read.

### LDAP URL Management

6. LDAP Server URL records are optional -- only create them for failover or load balancing.
7. For **failover**: assign different `order` values (e.g., 100, 200, 300). Lower order tried first.
8. For **load balancing**: assign the same `order` value to all URLs.
9. Always include protocol (`ldap://` or `ldaps://`) and port in the URL field.

### Record References

10. Always reference LDAP server config via the record object variable, never by hardcoded sys_id.
11. When defined in a separate file, import it and use the imported variable as the `server` field value.

## Avoidance

1. Do not use `ldap://` (unencrypted) for production -- always use `ldaps://` with port 636.
2. Do not omit protocol or port from LDAP URLs.
3. Do not hardcode sys_id strings in the `server` field.
4. Do not create `ldap_server_url` records without an existing `ldap_server_config`.
5. Do not include passwords in generated code.

---

## LDAP Server Config API Reference

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Unique name for the configuration |
| `server_url` | `string` | LDAP server URL (e.g., `'ldap://ldap.example.com'`) |
| `dn` | `string` | Distinguished Name for binding |
| `password` | `string` | Binding password (leave empty in code) |
| `vendor` | `string` | Server vendor: `'active_directory'`, `'open_ldap'`, `'sun'`, `'edirectory'`, `'domino'`, `'other'` |

### Common Optional Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `active` | `boolean` | `true` | Whether the server is active |
| `authenticate` | `boolean` | `true` | Whether to authenticate |
| `connect_timeout` | `number` | `10` | Connection timeout in seconds |
| `read_timeout` | `number` | `30` | Read timeout in seconds |
| `listener` | `boolean` | `false` | Enable LDAP event listener |
| `paging` | `boolean` | `true` | Use paged results |
| `ssl` | `boolean` | `false` | Use SSL |
| `listen_interval` | `number` | `5` | Polling interval in minutes |
| `rdn` | `string` | -- | Root DN (e.g., `'dc=example,dc=com'`) |
| `attributes` | `string` | -- | Additional LDAP attributes to retrieve |

### Active Directory Example

```typescript
import { Record } from '@servicenow/sdk/core';

export const adLdapConfig = Record({
  $id: Now.ID['ad-ldap-config'],
  table: 'ldap_server_config',
  data: {
    name: 'Corporate AD',
    server_url: 'ldap://ad.corporate.com',
    dn: 'CN=Service Account,CN=Users,DC=corp,DC=corporate,DC=com',
    password: '', // LEAVE EMPTY - User will set manually
    vendor: 'active_directory',
    active: true,
    authenticate: true,
    connect_timeout: 10,
    read_timeout: 30,
    paging: true,
    ssl: false,
    rdn: 'DC=corp,DC=corporate,DC=com',
    attributes: 'mail,telephoneNumber,department,title',
  },
});
```

### OpenLDAP with SSL Example

```typescript
export const openLdapConfig = Record({
  $id: Now.ID['openldap-ssl-config'],
  table: 'ldap_server_config',
  data: {
    name: 'OpenLDAP with SSL',
    server_url: 'ldaps://ldap.example.com:636',
    dn: 'cn=admin,dc=example,dc=com',
    password: '', // LEAVE EMPTY
    vendor: 'open_ldap',
    active: true,
    ssl: true,
    connect_timeout: 15,
    read_timeout: 45,
    rdn: 'dc=example,dc=com',
  },
});
```

---

## LDAP Server URL API Reference

### Properties

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `server` | `string` (reference) | Yes | -- | Reference to LDAP Server Config |
| `url` | `string` | Yes | -- | LDAP URL (e.g., `ldaps://server:636`) |
| `active` | `boolean` | No | `true` | Whether URL is active |
| `order` | `integer` | No | `100` | Priority (lower = tried first) |
| `operational_status` | `boolean` | No | `true` | Whether operationally available |

### Complete Config with URL

```typescript
import '@servicenow/sdk/global';
import { Record } from '@servicenow/sdk/core';

export const corporateLdapConfig = Record({
  $id: Now.ID['corporate-ldap-config'],
  table: 'ldap_server_config',
  data: {
    name: 'Corporate LDAP',
    server_url: 'ldap://ldap-primary.example.com:389',
    dn: 'cn=service-account,dc=corp,dc=example,dc=com',
    password: '', // LEAVE EMPTY
    vendor: 'active_directory',
    active: true,
    authenticate: true,
    connect_timeout: 10,
    read_timeout: 30,
    paging: true,
    rdn: 'dc=corp,dc=example,dc=com',
  },
});

export const primaryLdapUrl = Record({
  $id: Now.ID['primary-ldap-url'],
  table: 'ldap_server_url',
  data: {
    server: corporateLdapConfig,  // Reference to config above
    url: 'ldap://ldap-primary.example.com:389',
    active: true,
    order: 100,
    operational_status: true,
  },
});
```

### Failover Pattern (Different Order Values)

```typescript
// Primary -- tried first
Record({
  $id: Now.ID['ldap-url-primary'],
  table: 'ldap_server_url',
  data: {
    server: corporateLdapConfig,
    url: 'ldaps://ldap-primary.example.com:636',
    active: true,
    order: 100,
  },
});

// Secondary -- tried if primary fails
Record({
  $id: Now.ID['ldap-url-secondary'],
  table: 'ldap_server_url',
  data: {
    server: corporateLdapConfig,
    url: 'ldaps://ldap-secondary.example.com:636',
    active: true,
    order: 200,
  },
});

// Tertiary -- last resort
Record({
  $id: Now.ID['ldap-url-tertiary'],
  table: 'ldap_server_url',
  data: {
    server: corporateLdapConfig,
    url: 'ldaps://ldap-tertiary.example.com:636',
    active: true,
    order: 300,
  },
});
```

### Load Balancing Pattern (Same Order Values)

```typescript
Record({
  $id: Now.ID['ldap-lb-url-1'],
  table: 'ldap_server_url',
  data: {
    server: corporateLdapConfig,
    url: 'ldaps://ldap-lb1.example.com:636',
    active: true,
    order: 100,  // Same priority
  },
});

Record({
  $id: Now.ID['ldap-lb-url-2'],
  table: 'ldap_server_url',
  data: {
    server: corporateLdapConfig,
    url: 'ldaps://ldap-lb2.example.com:636',
    active: true,
    order: 100,  // Same priority
  },
});
```

## Related Tables

- `ldap_server_config` -- Main LDAP server configuration
- `ldap_server_url` -- LDAP server URLs (failover/load balancing)
- `ldap_ou_config` -- LDAP Organizational Unit configuration
- `sys_user_ldap` -- LDAP user records
- `ldap_server_stats` -- LDAP server statistics

