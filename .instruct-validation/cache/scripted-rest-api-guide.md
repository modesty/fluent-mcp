# Scripted REST APIs

Guide for creating ServiceNow Scripted REST APIs using the Fluent API. Scripted REST APIs define custom web service endpoints for external integrations, with support for versioning, parameters, headers, and ACL-based security.

## When to Use

- Creating custom REST API endpoints for external integrations
- Exposing application data or operations as web services
- Building APIs with versioning, parameters, and custom headers
- Securing API access with ACLs and authentication

## Instructions

1. **Structure your API hierarchically:** `RestApi` (the service) contains `routes` (the endpoints), which contain `parameters` and `headers`. Each level needs its own `$id`.
2. **Keep handler scripts in modules:** Import handler functions from `src/server/` files rather than writing inline scripts. This keeps route definitions clean and scripts testable.
3. **Use path parameters for resource identifiers:** Define path params with `{id}` syntax in the route path (e.g., `/items/{id}`). Use query parameters for filtering and pagination.
4. **Version your API from the start:** Use the `versions` array on the RestApi and set `version` on each route. This generates versioned URIs and allows non-breaking evolution.
5. **Set ACLs at the right level:** `enforceAcl` on RestApi applies to all routes. `enforceAcl` on individual routes overrides the API-level setting.
6. **One route per HTTP method per path:** Each route handles a single HTTP method (GET, POST, PUT, PATCH, DELETE). Create separate routes for different methods on the same path.

## Key Concepts

### URI Path Construction

- With versioning: `/api/{scope_name}/v{version}/{serviceId}/{path}`
- Without versioning: `/api/{scope_name}/{serviceId}/{path}`

The `serviceId` must be unique within the API namespace -- it is the key identifier in the URI.

### Security Model

- **`authorization`** (on route): Whether users must be authenticated. Default `true` -- only set to `false` for truly public endpoints.
- **`authentication`** (on route): Whether ACLs are enforced. Default `true`.
- **`enforceAcl`** (on API or route): Which specific ACLs to apply. Reference ACL objects by variable identifier or sys_id.

### Versioning Strategy

When using versions, every route must specify which `version` it belongs to. Mark one version as `isDefault: true` -- clients can access it with or without the version prefix in the URI. Deprecated versions still serve requests but are marked in API documentation.

## Avoidance

- **Never skip ACLs for production APIs** -- setting `enforceAcl: []` or `authentication: false` removes access control entirely
- **Never forget `version` on routes when using versions** -- routes without a version will not be accessible through versioned URIs
- **Never use inline scripts for complex handlers** -- import functions from server modules for maintainability and testability
- **Avoid exposing internal table structures** -- transform data in handler scripts rather than returning raw GlideRecord fields

## API Reference

For the full property reference (RestApi, routes, versions, parameters, headers), see the `restapi-api` topic.

## Examples

### Complete REST API with Versioning

```typescript
import { RestApi, Acl } from '@servicenow/sdk/core'
import { process } from '../server/handler.js'

const acl = Acl({
    $id: Now.ID['my-acl'],
    type: 'rest_endpoint',
    script: `answer = gs.hasRole('rest_api_explorer')`,
    adminOverrides: false,
    operation: 'execute',
})

RestApi({
    $id: Now.ID['rest1'],
    name: 'customAPI',
    serviceId: 'custom_api',
    consumes: 'application/json',
    routes: [
        {
            $id: Now.ID['route1'],
            path: '/home/{id}',
            script: process,
            parameters: [{ $id: Now.ID['param1'], name: 'n_param' }],
            headers: [{ $id: Now.ID['header1'], name: 'n_token' }],
            enforceAcl: [acl],
            version: 1,
        },
    ],
    enforceAcl: [acl],
    versions: [
        {
            $id: Now.ID['v1'],
            version: 1,
            isDefault: true,
        },
    ],
})
```

URI for the above: `/api/{scope_name}/v1/custom_api/home/{id}?n_param=123`

### REST API Without Versioning

```typescript
import { RestApi } from '@servicenow/sdk/core'
import { process } from '../server/handler.js'

RestApi({
    $id: Now.ID['rest1'],
    name: 'customAPI',
    serviceId: 'custom_api',
    consumes: 'application/json',
    routes: [
        {
            $id: Now.ID['route1'],
            path: '/home/{id}',
            script: process,
            parameters: [{ $id: Now.ID['param1'], name: 'n_param' }],
            headers: [{ $id: Now.ID['header1'], name: 'n_token' }],
            enforceAcl: [acl],
        },
    ],
    enforceAcl: [acl],
})
```

URI for the above: `/api/{scope_name}/custom_api/home/{id}?n_param=123`

### Multiple Versions with Deprecation

```typescript
versions: [
    {
        $id: Now.ID['v1'],
        version: 1,
        deprecated: true,
        shortDescription: 'Original version (deprecated)',
    },
    {
        $id: Now.ID['v2'],
        version: 2,
        isDefault: true,
        shortDescription: 'Current stable version',
    },
],
```

