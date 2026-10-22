---
name: fluent-cli
description: Use when building apps or querying data with Fluent (now-sdk) on ServiceNow. 
license: Apache-2.0
compatibility: Requires Node.js and npx (@servicenow/sdk >= 4.8.0 recommended)
allowed-tools: Bash(npx @servicenow/sdk:*)
metadata:
  argument-hint: "[topic or table]"
---

## Setup

Condition: the project root contains `now.config.json` (same role as `package.json` for an npm project — walk up from cwd to find it, one `now.config.json` per fluent project). IF no `now.config.json` found, run `npx @servicenow/sdk init --help` cmd to offer guidance on creating or converting a project.

Action: run the following orientation for every distinct `now.config.json` you found:

Step 1 — run all three:

```bash
npx @servicenow/sdk --help
npx @servicenow/sdk explain quickstart --list --format=raw
npx @servicenow/sdk explain fluent-language --list --format=raw
```

Step 2 — read every topic returned by both `--list` calls in full, plus `keys-file` by name explicitly:

```bash
npx @servicenow/sdk explain <topic> --format=raw
npx @servicenow/sdk explain keys-file --format=raw
```

Step 3 — The above constitutes required working knowledge for the rest of this project's session. If anything uncertain later, re-run with `--peek` on the specific topic rather than relying on memory:

```bash
npx @servicenow/sdk explain <topic> --peek --format=raw
```

Rule: before using any subcommand for the first time, run `npx @servicenow/sdk <subcommand> --help` first.

## Documentation

`npx @servicenow/sdk explain <topic>` (including `--peek` and `--list`) is read-only documentation lookup with no side effects. Use `--peek` to preview before reading the full topic. `quickstart` topics should always be read directly without `--peek`.

To show all available topics with their related tags:

```bash
npx @servicenow/sdk explain --list --format=raw
```

To search for topics, showing the descriptions of all matches:

```bash
npx @servicenow/sdk explain <topic> --list --peek --format=raw
```

To preview a topic:

```bash
npx @servicenow/sdk explain <topic> --peek --format=raw
```

Once you are certain you want to read the full topic, open it like this:

```bash
npx @servicenow/sdk explain <topic> --format=raw
```

### For any task — always start here

Step order: search (`--list`) → peek (`--peek`) → read full topic. Repeat for every relevant topic — fluent behavior is often split across multiple topics, get the complete picture.

- Search: `npx @servicenow/sdk explain <search-term> --list --format=raw`
- Peek: `npx @servicenow/sdk explain <topic> --peek --format=raw`
- Read (only if peek confirms relevance): `npx @servicenow/sdk explain <topic> --format=raw`

### If explain fails

- `explain` is only available in `@servicenow/sdk` versions >= `4.6.0`.
- `No documentation found for "<topic>"` — wrong topic name, try `--list`
- `No match for "<topic>"` — use a different search term

## Data Queries

`query` is available in `@servicenow/sdk` versions >= `4.8.0`. `query` output is live instance data, not documentation.

Get the subcommand help for `query` to understand its flags and usage before writing any query. The required flag for filtering is `-q` / `--query`. Every query call needs it along with the table name. Always include the `-o json` flag to output machine-readable json.

```bash
npx @servicenow/sdk query --help
npx @servicenow/sdk explain query --format=raw
npx @servicenow/sdk explain encoded-query-guide --format=raw
npx @servicenow/sdk query <table> -q '<query>' -o json
```
