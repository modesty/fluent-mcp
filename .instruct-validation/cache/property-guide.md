# System Properties

Guide for creating ServiceNow System Properties using the Fluent API. Properties store key-value configuration for applications, read at runtime using `gs.getProperty()`, and allow admins to tune behavior without code changes.

## When to Use

- Adding configurable settings to an application (feature flags, thresholds, URLs)
- Storing values that admins should be able to change without modifying code
- Creating properties that business rules, scheduled scripts, or client code read at runtime

## Instructions

1. **Name with scope prefix:** Property names must start with the application scope (e.g., `x_snc_example.my_setting`). Use dot notation to organize hierarchically (e.g., `x_snc_example.email.enabled`, `x_snc_example.email.sender`).
2. **Choose the right type:** Use `string` for text, `integer` for numbers, `boolean` for flags, `choicelist` for constrained options, `password`/`password2` for secrets. The `value` field type must match.
3. **Set access roles:** Use the `roles` property to control who can read and write the property. Restrict write access to admin roles for sensitive settings.
4. **Use `isPrivate` for sensitive data:** Set `isPrivate: true` for properties that should not be visible in the property list UI (e.g., API keys, internal thresholds).
5. **Provide a description:** Always add a `description` explaining what the property controls and what valid values are -- this is what admins see when configuring the app.

## Key Concepts

### When to Use Properties vs Other Patterns

- **Properties** -- For values that change between environments or that admins tune (timeouts, feature flags, URLs)
- **Business rules** -- For logic that responds to data changes. Do not store logic in properties.
- **Script includes** -- For reusable code. Properties store data, not behavior.

### Caching

Properties are cached by default for performance. Set `ignoreCache: true` only for properties that must reflect changes immediately (rare). Most properties should keep the default (`false`).

## Avoidance

- **Never omit the scope prefix from the name** -- properties without scope prefix will fail validation
- **Never store large data in properties** -- they are for simple configuration values, not data blobs
- **Never use `ignoreCache: true` unless necessary** -- it forces a database read on every `gs.getProperty()` call, impacting performance

## API Reference

For the full property reference, see the `property-api` topic.

## Examples

### Basic String Property

```typescript
import { Property } from '@servicenow/sdk/core'

Property({
    $id: Now.ID['email-enabled'],
    name: 'x_snc_example.email.enabled',
    type: 'boolean',
    value: true,
    description: 'Enable or disable email notifications for the application',
    roles: {
        read: ['admin'],
        write: ['admin'],
    },
})
```

### Property with Role References

```typescript
import { Property, Role } from '@servicenow/sdk/core'

const managerRole = Role({
    $id: Now.ID['manager_role'],
    name: 'x_snc_example.manager',
})

const adminRole = Role({
    $id: Now.ID['admin_role'],
    name: 'x_snc_example.admin',
    containsRoles: [managerRole],
})

Property({
    $id: Now.ID['1234'],
    name: 'x_snc_example.some.new.prop',
    type: 'string',
    value: 'hello',
    description: 'A new property',
    roles: {
        read: ['admin'],
        write: [adminRole, managerRole],
    },
    ignoreCache: false,
    isPrivate: false,
})
```

For the full Role API reference, see the `Role` topic.

