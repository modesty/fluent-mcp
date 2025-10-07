# Instructions for Fluent List API
Always reference the List API specifications for more details.
1. For the `view` field, you must either use `default_view` or create a custom view using the `Record` plugin.
    - In order to use `default_view`, you must first import it from '@servicenow/sdk/core'.
    - In order to use a custom view, you must import the `Record` plugin from '@servicenow/sdk/core' and create a record in the `sys_ui_view` table.
2. $id property is deprecated since v4.0.0.
