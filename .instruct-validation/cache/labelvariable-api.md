# Function: LabelVariable(config)

A CatalogItem variable for a label field (display-only text).

## Parameters

### config

`LabelVariableType<string>`

Configuration for the label variable including:

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

- **defaultValue** (optional): `string | Type`

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

- **readRoles** (optional): `(string | Role)[]`

- **readScript** (optional): `string`
  Read script

- **removeFromConversationalInterfaces** (optional): `boolean`
  Remove from Conversational Interfaces

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

