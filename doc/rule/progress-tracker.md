# Epic and Story (Task List) Progress Management

Guidelines for managing epics and stores (task lists) in markdown files to track progress on completing a PRD.

**Note:** Epics and tasks, parent tasks, high-level tasks are used interchangeably in this document, Stories and sub-tasks are also used interchangeably.

## Epic and Story Implementation

- **One story at a time:** Do **NOT** start the next story (sub‑task) until you ask the user for permission and they say “yes” or "y"
- **Completion protocol:**  
  1. When you finish a **story** (sub‑task), immediately mark it as completed by changing `[ ]` to `[x]`.  
  2. If **all** stories (sub-tasks) underneath a Epic (parent task) are now `[x]`, also mark the **Epic** (parent task) as completed.  
- Stop after each story (sub‑task) and wait for the user’s go‑ahead.

## Epic and Story Maintenance

1. **Update the Epic and Story list as you work:**
   - Mark epics (tasks) and story (subtasks) as completed (`[x]`) per the protocol above.
   - Add new tasks as they emerge.

2. **Maintain the "Relevant Files" section:**
   - List every file created or modified.
   - Give each file a one‑line description of its purpose.

## AI Instructions

When working with epics and stories lists, the AI must:

1. Regularly update the epics and stories list file after finishing any significant work.
2. Follow the completion protocol:
   - Mark each finished **story** (sub‑task) `[x]`.
   - Mark the **epic** (parent task) `[x]` once **all** its stories (subtasks) are `[x]`.
3. Add newly discovered stories (tasks).
4. Keep "Relevant Files" accurate and up to date.
5. Before starting work, check which sub‑task is next.
6. After implementing a sub‑task, update the file and then pause for user approval.
