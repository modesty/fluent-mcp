# Function: SlushBucketColumn(config)

A Column for a slush bucket field.
Provides a dual-list selection interface for moving items between available and selected lists.

## Usage

```typescript
const selectedItems = SlushBucketColumn({
    label: 'Selected Items',
})

// Using script method
const assignedRoles = SlushBucketColumn({
    label: 'Assigned Roles',
    script: 'getRoles()',
    mandatory: true,
})
```
## Parameters

### config

`C & Column<Type, Default> & object`

an object that can include all base `Column` properties

**Properties:**

- **script** (optional): `string`
  Script method to populate the slush bucket options.
  Example: 'getMethod()' - a server-side script that returns available options


## See

- https://docs.servicenow.com/csh?topicname=table-api-now-ts.html&version=latest

