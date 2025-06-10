# Task Generation Rules

## Objective

To guide an AI assistant in creating a detailed, step-by-step task list in Markdown format based on an existing Product Requirements Document (PRD). The task list should guide a developer through implementation.

**Note:** Epics and tasks, parent tasks, high-level tasks are used interchangeably in this document, Stories and sub-tasks are also used interchangeably.

## Output

- **Format:** Markdown (`.md`)
- **Location:** `/doc/`
- **Filename:** `epics-[prd-file-name].md` (e.g., `epics-prd-user-profile-editing.md`)

## Process

1. **Receive PRD Reference:** The user points the AI to a specific PRD file
2. **Analyze PRD:** The AI reads and analyzes the functional requirements, user stories, and other sections of the specified PRD.
3. **Architect Solution:** Based on the PRD analysis, the AI should architect a solution that adapts to the requirements and constraints outlined in the PRD, also incorporates industrial best practices and effective tech stack, framework and library adoptions.
4. **Phase 1: Generate Epics:** Based on the PRD analysis and overall architecture, create the file and generate the Epics (main, high-level tasks) required to implement the feature. Use your judgement on how many Epics (high-level tasks) to use, typically it's about 5. Present these Epics (high level tasks) to the user in the specified format (without stories/sub-tasks yet). Inform the user: "I have generated the Epics (high-level tasks) based on the PRD. Ready to generate the stories (sub-tasks)? Respond with 'Go' to proceed."
5. **Wait for Confirmation:** Pause and wait for the user to respond with "Go".
6. **Phase 2: Generate Stories:** Once the user confirms, break down each parent task into smaller, actionable stories (sub-tasks) necessary to complete the Epic (parent task). Ensure stories (sub-tasks) logically follow from the Epic (parent task) and cover the implementation details implied by the PRD.
7. **Identify Relevant Files:** Based on the Epics (tasks) and PRD, identify potential files that will need to be created or modified. List these under the `Relevant Files` section, including corresponding test files if applicable.
8. **Generate Final Output:** Combine the Epics (parent tasks), Stories (sub-tasks), relevant files, and notes into the final Markdown structure.
9. **Save Task List:** Save the generated document in the `/doc/` directory with the filename `epics-[prd-file-name].md`, where `[prd-file-name]` matches the base name of the input PRD file (e.g., if the input was `prd-user-profile-editing.md`, the output is `epics-prd-user-profile-editing.md`).

## Output Format

The generated task list _must_ follow this structure:

```markdown
## Relevant Files

- `src/[path/to/potential/file1.ts]` - Brief description of why this file is relevant (e.g., Contains the main component for this feature).
- `src/test/[path/to/file1.test.ts]` - Unit tests for `file1.ts`.
- `src/[path/to/another/file.tsx]` - Brief description (e.g., API route handler for data submission).
- `src/test/[path/to/another/file.test.tsx]` - Unit tests for `another/file.tsx`.
- `src/lib/[utils/helpers.ts]` - Brief description (e.g., Utility functions needed for calculations).
- `src/test/lib/[utils/helpers.test.ts]` - Unit tests for `helpers.ts`.

### Notes

- Unit tests should typically be placed under `/src/test/` , with the same file base name as the source code file they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the `src/test/` directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Epics and Stories

- [ ] 1.0 Epic (Parent Task) Title
  - [ ] 1.1 [Story (Sub-task) description 1.1]
  - [ ] 1.2 [Story (Sub-task) description 1.2]
- [ ] 2.0 Epic (Parent Task) Title
  - [ ] 2.1 [Story (Sub-task) description 2.1]
- [ ] 3.0 Epic (Parent Task) Title (each Epic should have at least 1 story even if purely structural or configuration)
  - [ ] 3.1 [Story (Sub-task) description 3.1]
```

## Interaction Model

The process explicitly requires a pause after generating Epics (parent tasks) to get user confirmation ("Go") before proceeding to generate the detailed stories (sub-tasks). This ensures the high-level plan aligns with user expectations before diving into details.

## Target Audience

Assume the primary reader of the task list is a **junior developer** who will implement the feature.
