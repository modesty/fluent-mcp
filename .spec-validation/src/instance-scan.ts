// Creates a new Linter Check (`scan_linter_check`)
LinterCheck({
  $id: '', // string | guid, mandatory - unique identifier for the check
  name: '', // string, mandatory - display name of the linter check
  description: '', // string, optional - description of what this check validates
  active: true, // boolean, optional - whether the check is active
  category: '', // ScanCategory, mandatory - category: 'upgradability' | 'performance' | 'security' | 'manageability' | 'user_experience'
  script: '', // string, optional - server-side script for custom linting logic using Instance Scan API
  protectionPolicy: '', // 'read' | 'protected', optional - protection level for this check
  priority: '1', // ScanPriority, mandatory - '1' (Critical) | '2' (High) | '3' (Moderate) | '4' (Low)
  shortDescription: '', // string, mandatory - brief description of the check
  resolutionDetails: '', // string, optional - guidance for resolving findings
  documentationUrl: '', // string, optional - link to documentation
  scoreMin: 0, // number, optional - minimum score
  scoreMax: 0, // number, optional - maximum score
  scoreScale: 0, // number, optional - score scale
  runCondition: '', // string, optional - condition for when to run the check
  findingType: '', // string, optional - type of finding
  advanced: false, // boolean, optional - enable advanced mode
  useManifest: false, // boolean, optional - whether to use manifest
})

// Creates a new Script Only Check (`scan_check_script_only`)
ScriptOnlyCheck({
  $id: '', // string | guid, mandatory - unique identifier for the check
  name: '', // string, mandatory - display name of the script check
  description: '', // string, optional - description of what this check evaluates
  active: true, // boolean, optional - whether the check is active
  category: '', // ScanCategory, mandatory - category: 'upgradability' | 'performance' | 'security' | 'manageability' | 'user_experience'
  script: '', // string, mandatory - server-side script that runs the check logic
    // The script should use the Instance Scan API to report findings
  protectionPolicy: '', // 'read' | 'protected', optional - protection level for this check
  priority: '1', // ScanPriority, mandatory - '1' (Critical) | '2' (High) | '3' (Moderate) | '4' (Low)
  shortDescription: '', // string, mandatory - brief description of the check
  resolutionDetails: '', // string, optional - guidance for resolving findings
  documentationUrl: '', // string, optional - link to documentation
  scoreMin: 0, // number, optional - minimum score
  scoreMax: 0, // number, optional - maximum score
  scoreScale: 0, // number, optional - score scale
  runCondition: '', // string, optional - condition for when to run the check
  findingType: '', // string, optional - type of finding
  advanced: false, // boolean, optional - enable advanced mode
  useManifest: false, // boolean, optional - whether to use manifest
})

// Creates a new Column Type Check (`scan_check_column_type`)
ColumnTypeCheck({
  $id: '', // string | guid, mandatory - unique identifier for the check
  name: '', // string, mandatory - display name of the column type check
  description: '', // string, optional - description of what this check validates
  active: true, // boolean, optional - whether the check is active
  category: '', // ScanCategory, mandatory - category: 'upgradability' | 'performance' | 'security' | 'manageability' | 'user_experience'
  columnType: '', // ColumnType, mandatory - the column type to validate: 'script' | 'xml' | 'html'
  protectionPolicy: '', // 'read' | 'protected', optional - protection level for this check
  priority: '1', // ScanPriority, mandatory - '1' (Critical) | '2' (High) | '3' (Moderate) | '4' (Low)
  shortDescription: '', // string, mandatory - brief description of the check
  resolutionDetails: '', // string, optional - guidance for resolving findings
  documentationUrl: '', // string, optional - link to documentation
  scoreMin: 0, // number, optional - minimum score
  scoreMax: 0, // number, optional - maximum score
  scoreScale: 0, // number, optional - score scale
  runCondition: '', // string, optional - condition for when to run the check
  findingType: '', // string, optional - type of finding
  advanced: false, // boolean, optional - enable advanced mode
  useManifest: false, // boolean, optional - whether to use manifest
})

// Creates a new Table Check (`scan_check_table`)
TableCheck({
  $id: '', // string | guid, mandatory - unique identifier for the check
  name: '', // string, mandatory - display name of the table check
  description: '', // string, optional - description of what this check validates
  active: true, // boolean, optional - whether the check is active
  category: '', // ScanCategory, mandatory - category: 'upgradability' | 'performance' | 'security' | 'manageability' | 'user_experience'
  table: '', // string, mandatory - target table for the check
  conditions: '', // string, optional - encoded query condition to match tables
  protectionPolicy: '', // 'read' | 'protected', optional - protection level for this check
  priority: '1', // ScanPriority, mandatory - '1' (Critical) | '2' (High) | '3' (Moderate) | '4' (Low)
  shortDescription: '', // string, mandatory - brief description of the check
  resolutionDetails: '', // string, optional - guidance for resolving findings
  documentationUrl: '', // string, optional - link to documentation
  scoreMin: 0, // number, optional - minimum score
  scoreMax: 0, // number, optional - maximum score
  scoreScale: 0, // number, optional - score scale
  runCondition: '', // string, optional - condition for when to run the check
  findingType: '', // string, optional - type of finding
  advanced: false, // boolean, optional - enable advanced mode
  useManifest: false, // boolean, optional - whether to use manifest
})