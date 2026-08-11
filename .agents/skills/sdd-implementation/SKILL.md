---
name: sdd-implementation
description: >-
  Orchestrates the full SDD implementation lifecycle: analysis, design iteration, coding, automated/physical testing, documentation, and Engram persistence.
---

# SDD Implementation Workflow

## Overview
This skill executes a complete implementation and testing cycle based on an initial roadmap or design plan. It leverages an iterative analysis-design-implement-test loop, autonomously handles logic/compilation errors, uses Engram for context persistence, and commits the work upon success.

## Dependencies
- **Engram**: For saving a summary of the implemented feature/bug resolution.
- **AGENTS.md**: For project-specific conventions.
- **Testing Tools**: Standard testing frameworks (e.g., `flutter test`, `flutter run`) and device monitoring commands.

## Quick Start
Provide the path to the detailed roadmap/plan you want to implement:
"Implement the roadmap at docs/archive/roadmap-example.md"

## Workflow

### 1. Plan Analysis
- Read the provided detailed roadmap/plan which includes context, proposals, implementation/testing phases.
- If multiple approaches are required to find the best solution, structure the work sequentially per approach, referencing standard formats like `docs/archive/roadmap-proxy-solutions.md`.

### 2. Iterative Implementation Cycle
- Code implementation must be situated between reasoning and command execution.
- Depending on complexity, apply this iterative sub-cycle:
  1. **Analysis**: Review the plan. If a previous iteration failed, analyze why.
  2. **Design**: Adjust the approach if the previous analysis demands a new angle.
  3. **Implementation**: Write and modify the source code.
  4. **Testing and Validation**: Run automated tests and/or deploy to a physical device/emulator for a quick test. Actively monitor logs.
- **Autonomy in Error Handling**: If compilation fails or logic bugs appear during testing, autonomously iterate to fix them without stopping. If the primary approach fails completely, try alternative approaches autonomously.
- **Edge Cases & Environment Errors**: If you encounter external environment issues (e.g., local backend is down, missing OS dependencies), stop and notify the user in chat. Do not include these minor, transient issues in the final documentation report.

### 3. Documentation
- Document the findings, trace the steps taken, and note any deviations from the original plan.
- **Format**: Follow the project's standard convention for documentation. Refer to `AGENTS.md` or existing project files to determine the correct path (e.g., `.openspecs/`, `docs/archive/`).
- Keep the final report clean and focused on architecture, bugs, and decisions.

### 4. Persist to Memory (Engram)
- Execute an `engram save "[Brief title]" "[Detailed summary of what was resolved, the architecture changes, and major bugs overcome]"` to persist context for future sessions.

### 5. Finalize and Commit
- Stage the modified files using `git add`.
- Create a clear, descriptive Git commit summarizing the implemented feature or resolved bug.

## Common Mistakes
- **Failing loudly on code errors**: The agent should try to fix code/compilation errors autonomously rather than immediately stopping to ask the user.
- **Polluting documentation**: Documenting transient environment issues (like a local server being down) in the final markdown documentation.
- **Ignoring project conventions**: Always check `AGENTS.md` and existing docs for naming/location conventions before creating new markdown files.
