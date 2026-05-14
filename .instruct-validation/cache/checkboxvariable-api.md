# Function: CheckboxVariable(config)

Creates a checkbox (boolean) variable for service catalog forms. Use for yes/no or on/off toggles. Add a `CheckboxVariable` to a `CatalogItem` or `VariableSet` via the `variables` property.

## Parameters

### config

`CheckboxVariableType<boolean, boolean>`

Configuration for the checkbox variable including:

**Properties:**

- **question** (required): `string`

- **active** (optional): `boolean`

- **alwaysExpand** (optional): `boolean`
  Always expand

- **attributes** (optional): `string`
  Attributes of the variable

- **category** (optional): `string`
  Category

- **conversationalLabel** (optional): `string`

- **createRoles** (optional): `(string | Role)[]`

- **defaultValue** (optional): `string | Default`

- **deliveryPlan** (optional): `string`
  Delivery plan

- **dependentQuestion** (optional): `string`
  Dependent question for dynamic default value

- **description** (optional): `string`
  Description

- **disableInitialSlotFill** (optional): `boolean`

- **dotWalkPath** (optional): `string`
  Dot walk path for dynamic default value

- **exampleText** (optional): `string`

- **field** (optional): `string`
  Field to map (required when mapToField is true)

- **global** (optional): `boolean`
  Global

- **helpTag** (optional): `string`

- **helpText** (optional): `string`

- **hidden** (optional): `boolean`
  Indicates whether the field is hidden. Cannot be true when selectionRequired is true.

- **instructions** (optional): `string`

- **layout** (optional): `'normal' | '2across' | '2down'`
  Layout style for the container

- **mapToField** (optional): `boolean`
  Map to field

- **order** (optional): `number`
  Order in which the variable appears

- **postInsertScript** (optional): `string`
  Post insert script

- **pricingDetails** (optional): `PricingDetail[]`
  Pricing details

- **pricingImplications** (optional): `boolean`
  Pricing implications

- **readOnly** (optional): `boolean`
  Indicates whether the field is read-only. Cannot be true when selectionRequired is true.

- **readRoles** (optional): `(string | Role)[]`

- **readScript** (optional): `string`
  Read script

- **removeFromConversationalInterfaces** (optional): `boolean`
  Remove from Conversational Interfaces

- **selectionRequired** (optional): `boolean`
  Indicates whether the checkbox must be selected. Cannot be true when readOnly or hidden is true.

- **showHelp** (optional): `boolean`

- **tooltip** (optional): `string`

- **unique** (optional): `boolean`
  Unique value

- **useDynamicDefault** (optional): `boolean`
  Use dynamic default

- **visibility** (optional): `'Always' | 'Bundle' | 'Standalone'`
  Visibility

- **visibleBundle** (optional): `boolean`

- **visibleGuide** (optional): `boolean`
  Indicates whether the variable is visible in guides

- **visibleStandalone** (optional): `boolean`
  Indicates whether the variable is visible when standalone

- **visibleSummary** (optional): `boolean`
  Indicates whether the variable is visible in summaries

- **width** (optional): `100 | 25 | 50 | 75`
  Width of the variable

- **writeRoles** (optional): `(string | Role)[]`


## See

- https://docs.servicenow.com/csh?topicname=variable-types.html&version=latest

