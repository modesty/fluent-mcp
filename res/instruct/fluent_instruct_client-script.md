# Instructions for Fluent Client Script API
Always reference the Client Script API specifications for more details.
1. Each message in the `messages` field should be separated by a newline. These messages should match the key of a localized message from the `sys_ui_message` table, which can be accessed in the `script` field by calling `getmessage('[message]')`. This can be useful for translating a message in different languages.
2. Only fill out the `field` field if the `type` field is set to `onChange` or `onCellEdit`.
3. Do not fill out the `view` field unless the `global` field is set to `false`.
