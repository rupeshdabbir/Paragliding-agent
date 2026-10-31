---
name: pr-documentation
description: Validates and updates documentation (README.md, AGENTS.md, CLAUDE.md, and package.json versions) ensuring project docs stay accurate whenever features or architectural changes are made.
---

# PR Documentation Validator Skill

Whenever you complete a feature, bug fix, or architectural update, follow these steps:

## 1. Review Code Changes
Check modified files via `git status` or `git diff --stat`.

## 2. Update Documentation Files
- **`README.md`**: Ensure setup instructions, AI provider/model tables (Cloud BYOK + On-Device WebAI), architecture diagrams, and feature lists reflect the current state of the codebase.
- **`AGENTS.md` & `CLAUDE.md`**: If new routes, services, skills, or test scripts were added, update the architecture map in `AGENTS.md` and `CLAUDE.md`.

## 3. Bump Package Versions
Update the `version` field in `client/package.json` and `server/package.json` (the UI displays `v{__APP_VERSION__}` from `client/package.json` inside the Settings menu):
- **Patch bump (`x.y.Z`)**: Bug fixes or minor UI tweaks.
- **Minor bump (`x.Y.0`)**: New features, new AI models/providers, or architectural upgrades.
