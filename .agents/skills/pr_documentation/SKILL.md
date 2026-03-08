---
name: PR Documentation Validator
description: Validates and updates documentation ensuring it stays up to date anytime a PR update is made.
---

# PR Documentation Validator Skill

## Objective

The objective of this skill is to enforce that documentation (especially `README.md`) must be kept up-to-date any time code changes are introduced via a Pull Request (PR). You are responsible for reviewing the changed files and making corresponding documentation updates.

## Trigger

This skill should automatically be triggered on every PR update or merge.

## Workflow Instructions

When invoked dynamically as part of a PR review or by the user on a codebase update:

1. **Review the PR Diffs**:
   - Analyze all files changed in the PR or latest commit.
   - Summarize the new features, bug fixes, or architecture adjustments introduced.

2. **Assess Documentation Impact**:
   - Determine if the proposed code changes introduce new functionality, modify existing user experiences, or alter the developer setup.
   - Pay special attention to:
     - New User Interface features or pages.
     - New supported LLMs/AI models.
     - New environment variables (`.env`).
     - Changes to the API payload or application architecture.

3. **Update `README.md`**:
   - Apply any necessary updates to `README.md` to reflect the changes.
   - Maintain the existing formatting (markdown tables, Mermaid diagrams).
   - Ensure the updated documentation accurately reflects the current state of the application.

4. **Update Custom Documentation**:
   - If other guides like `docs/*.md` exist and are affected, proactively make edits to those files.

5. **Package Version Management Flow:**
   - Scan the PR diffs to see if changes occurred primarily in the `client/` directory, the `server/` directory, or both.
   - For any updated directory, intelligently parse its `package.json` to bump the version number. 
   - Guidelines for Bumping:
     - **Minor Version Bump (Default):** For standard feature additions, bug fixes, UI updates, and non-breaking improvements. Automatically increment the minor version natively (e.g., `1.2.x` to `1.3.0`).
     - **Major Version Bump:** If the PR introduces significant, backward-incompatible breaking changes or sweeping architectural shifts, explicitly outline your reasoning in the PR review comments and increment the major version (e.g., `1.x.x` to `2.0.0`).
     - Only bump the version for the specific application (client or server) that had code changes. If both changed, bump both individually.

6. **Approval**:
   - Once edits are generated, output a summary of changes made to the documentation. If no changes were necessary, explicitly state: "No significant updates required for PR documentation."
