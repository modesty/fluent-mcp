# CLI Command Writer Implementation

The following changes were made to add a CLICmdWriter class:

1. Added CommandProcessor interface in types.ts
2. Updated CLIExecutor to implement CommandProcessor
3. Created CLICmdWriter class that returns command text instead of executing
4. Updated all command classes to use CommandProcessor instead of CLIExecutor

To use the new class:

```typescript
// Create a command writer
const cmdWriter = new CLICmdWriter();

// Use the factory to create commands
const commands = CommandFactory.createCommands(cmdWriter);

// Execute a command to get its text representation
const versionCommand = commands.find(cmd => cmd.name === 'get_fluent_version');
const result = await versionCommand.execute({});

console.log(result.output); // Will display the command text
```
