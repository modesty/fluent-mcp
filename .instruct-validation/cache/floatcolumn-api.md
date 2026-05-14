# Function: FloatColumn(config)

A Column for a floating-point number type field.
Stores decimal numbers with floating-point precision.

## Usage

```typescript
const price = FloatColumn({
    label: 'Price',
    default: 99.99,
    scale: 2,
})

const temperature = FloatColumn({
    label: 'Temperature (Celsius)',
    default: 23.5,
    scale: 1,
    mandatory: true,
})
```
## Parameters

### config

`C & Column<Type, Default> & object`

**Properties:**

- **scale** (optional): `number`
  Number of decimal places to display.
  Controls the precision of the floating-point number.


## See

- https://docs.servicenow.com/csh?topicname=table-api-now-ts.html&version=latest

