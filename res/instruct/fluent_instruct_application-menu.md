# Instructions for Fluent Application Menu Module API
Always reference the Application Menu API specifications for more details.

Follow the below instructions for top Application Menu
1. The `name` is an internal name to differentiate between applications with the same title
2. The `category` must be defined as a separate constant using Record API.
3. The `role` are defined by an array consisting of Role objects or role names that already exist on the platform.

Follow the below instructions for Application Submenu under top Application Menu. Application Submenu is also known as app module or application module at Servicenow platform menu navigator.
1. Identify the right value for `linkType` column from the below combination of it's label and value, as per the user prompts, instructions or devrequest.
2. The below combinations format is "<column label> or <display value>"~"<actual value>". For example: "List of Records"~"LIST" - label is `List of Records` and value is `LIST`.
   "None"~""
   "Separator"~"SEPARATOR"
   "Timeline Page"~"TIMELINE"
   "Single"~"Record"
   "HTML (from Arguments:)"~"HTML"
   "Assessment"~"ASSESSMENT"
   "List of Records"~"LIST"
   "List Filter"~"FILTER"
   "Script (from Arguments:)"~"SCRIPT"
   "Content Page"~"CONTENT_PAGE"
   "Search Screen"~"SEARCH"
   "Survey"~"SURVEY"
   "Documentation Link"~"DOC_LINK"
   "New Record"~"NEW"
   "Map Page"~"MAP"
   "Run a Report"~"REPORT"
   "URL (from Arguments:)"~"DIRECT"
3. If `linkType` is not specified in user instructions or prompts, then completely skip the field from code generation.
4. `assessment` is link type assessment and is applicable and mandatory only when `linkType` is `ASSESSMENT`.
5. `name` is table associated to link type and is applicable and mandatory only when `linkType` is `FILTER` or `LIST` or `NEW` or `SEARCH` or `DETAIL`.
6. `query` is link type arguments and is mandatory only when `linkType` is `DOC_LINK` or `HTML` or `SCRIPT` or `DIRECT`.