# Function: RequestedForVariable(config)

A CatalogItem variable for a requested for field (typically references a user).

## Parameters

### config

`RequestedForVariableType`

Configuration for the requested for variable including:

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

- **defaultValue** (optional): `string | ExplicitKey<string> | Record<'sys_user'>`

- **deliveryPlan** (optional): `string`
  Delivery plan

- **dependentQuestion** (optional): `string`
  Dependent question for dynamic default value

- **description** (optional): `string`
  Description

- **disableInitialSlotFill** (optional): `boolean`

- **dotWalkPath** (optional): `string`
  Dot walk path for dynamic default value

- **dynamicRefQual** (optional): `string | Record<'sys_filter_option_dynamic'>`
  Dynamic reference qualifier (use with useReferenceQualifier='dynamic'). Mutually exclusive with referenceQualCondition and referenceQual.

- **enableAlsoRequestFor** (optional): `boolean`
  Enable also request for

- **exampleText** (optional): `string`

- **field** (optional): `string`
  Field to map (required when mapToField is true)

- **global** (optional): `boolean`
  Global

- **helpTag** (optional): `string`

- **helpText** (optional): `string`

- **hidden** (optional): `boolean`
  Indicates whether the field is hidden. Cannot be true when mandatory is true.

- **instructions** (optional): `string`

- **layout** (optional): `'normal' | '2across' | '2down'`
  Layout style for the container

- **mandatory** (optional): `boolean`
  Indicates whether the field must contain a value. Cannot be true when hidden or readOnly is true.

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
  Indicates whether the field is read-only. Cannot be true when mandatory is true.

- **readRoles** (optional): `(string | Role)[]`

- **readScript** (optional): `string`
  Read script

- **referenceQual** (optional): `string`
  Advanced reference qualifier (use with useReferenceQualifier='advanced'). Mutually exclusive with referenceQualCondition and dynamicRefQual.

- **referenceQualCondition** (optional): `string`
  Filter reference based on a filter condition (use without useReferenceQualifier). Mutually exclusive with dynamicRefQual and referenceQual.

- **removeFromConversationalInterfaces** (optional): `boolean`
  Remove from Conversational Interfaces

- **rolesToUseAlsoRequestFor** (optional): `(string | Role)[]`
  Roles to use also request for

- **showHelp** (optional): `boolean`

- **tooltip** (optional): `string`

- **unique** (optional): `boolean`
  Unique value

- **useDynamicDefault** (optional): `boolean`
  Use dynamic default

- **useReferenceQualifier** (optional): `'advanced' | 'simple' | 'dynamic'`
  Type of reference qualifier. Determines which qualifier field to use.

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

