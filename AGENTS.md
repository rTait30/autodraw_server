# AGENTS Access Policy

## Overview

This document defines the access permissions for internal and automated AGENTS interacting with the `autodraw_frontend` project.

## Access Scope

All AGENTS have full, read-only or read-write access to all files, folders, APIs, and components within the repository for purposes of inspection, generation, enhancement, debugging, or transformation.

This includes but is not limited to:

- 📁 `src/pages/` — Full visibility into all route-level components.
- 📁 `src/components/` — All reusable UI, form, and canvas components.
- 📁 `src/services/` — Access to all API handling logic and request definitions.
- 📁 `src/utils/` — Access to utility functions for formatting, validation, and transformation.
- 📁 `public/` — Static assets such as images, logos, and fallback files.
- 🔗 Backend API references used in the React frontend (e.g., `/list_configs`, `/get_config`, etc.)

## Permissions

| Capability                | Status       | Notes                                                  |
|--------------------------|--------------|--------------------------------------------------------|
| Read file structure      | ✅ Allowed   | Full access to inspect project structure.             |
| Read file contents       | ✅ Allowed   | Agents may inspect any code, config, or asset.        |
| Modify code              | ✅ Allowed   | AGENTS may refactor, optimize, or patch as needed.    |
| Create new files         | ✅ Allowed   | AGENTS may generate new components, pages, or tests.  |
| Delete files             | ✅ Allowed   | Only when part of refactoring, with caution.          |
| Access runtime env vars  | ✅ Allowed   | Via `import.meta.env`, `.env`, or config context.     |
| Trigger build or linting | ✅ Allowed   | CI/CD and formatting tools may be invoked.            |

## Restrictions

None currently. AGENTS are trusted and assumed to operate in developer-aligned contexts. This may be revised when exposing to third-party systems or external integrations.

## Security Note

While AGENTS have full access, secure endpoints (e.g., requiring `access_token`) must not leak real credentials. AGENTS should simulate such data where necessary unless explicitly authorized.

---

_Last updated: 2025-06-28_
