# Instructions for Fluent List API
Always reference the List API specifications for more details.
1. For the `view` field, you must either use `default_view` or create a custom view using the `Record` plugin.
    - In order to use `default_view`, you must first import it from '@servicenow/sdk/core'.
    - In order to use a custom view, you must import the `Record` plugin from '@servicenow/sdk/core' and create a record in the `sys_ui_view` table.
2. $id property is deprecated since v4.0.0.
3. **SDK v4.11.0** — `domain?: string` sets the `sys_domain` applied to the list. It defaults to `'global'` when omitted, so leave it unset unless you are targeting a specific domain on a domain-separated instance. This is the authoring half of the 4.11.0 fix for `sys_ui_list` records being lost on install; the rest of that fix is internal to the build's XML generation.
