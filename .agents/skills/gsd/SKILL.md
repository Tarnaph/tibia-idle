---
name: gsd
description: "Git. Ship. Done. (GSD) meta-prompting, spec-driven development framework, and phase lifecycle manager"
---

<objective>
Main entry point for GSD (Git. Ship. Done.) in Antigravity.
Route user requests to the appropriate GSD workflow, manage phase lifecycle, or display the GSD command reference.

Common workflows:
- **help**: Show command reference and usage guide (`@~/.gemini/antigravity/gsd-core/workflows/help.md`)
- **new-project**: Initialize a new project with GSD roadmap and spec structure
- **phase**: Add, insert, remove, or edit roadmap phases
- **discuss**: Interactive phase discovery and scope alignment
- **plan**: Generate task breakdown and implementation specs
- **execute**: Execute tasks with fresh subagents
- **verify**: Run automated tests and human acceptance checks
- **ship**: Commit, tag, and publish phase completion
- **progress**: Check roadmap completion and current milestone status
- **next**: Determine and start the next logical GSD step
</objective>

<execution_context>
@~/.gemini/antigravity/gsd-core/workflows/help.md
</execution_context>

<context>
Arguments: $ARGUMENTS
</context>

<process>
1. Evaluate $ARGUMENTS.
2. If arguments indicate a specific action (e.g. `help`, `new-project`, `plan`, `execute`, `verify`, `phase`, `progress`), invoke or follow the corresponding workflow under `~/.gemini/antigravity/gsd-core/workflows/`.
3. If no arguments are passed, or if the user asks for guidance or an overview of GSD, present the GSD dashboard / command overview and current project status (if `.planning/` exists).
</process>
