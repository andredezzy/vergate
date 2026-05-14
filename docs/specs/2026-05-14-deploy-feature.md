# vergate deploy: Vercel CLI wrapper with superpowers

**Author:** Andre Dezzy
**Date:** 2026-05-14
**Status:** Approved

## Purpose

Add a `deploy` command and library function to vergate that wraps `vercel deploy` transparently, adding two superpowers: multi-account selection and `.git` directory hiding to bypass Vercel author detection.

## Design Principle

vergate mirrors Vercel's native CLI. The user's experience should feel identical to running `vercel deploy`, except with account switching and git hiding layered on top. Vercel's native output streams directly to the terminal. vergate is invisible except for its added powers.

## CLI Command

```
vergate deploy [--prod] [--hide-git] [--account <label>] [-- ...vercel-args]
```

**vergate-specific flags:**
- `--hide-git`: Temporarily hide `.git` directory during deploy to bypass author detection
- `--account <label>`: Use a specific saved account (skips interactive picker)

**Vercel-native flags:**
- `--prod`: Production deploy (forwarded to `vercel deploy --prod`)
- Any args after `--` are forwarded to `vercel deploy` as-is

**Flow:**
1. Resolve account: interactive picker (via `selectAccount()`) or `--account <label>` lookup
2. If `--hide-git`, rename `<cwd>/.git` to `<cwd>/.git_hidden_for_deploy`
3. Spawn `vercel deploy --token=<token> --yes [--prod] [...extraArgs]` with inherited stdio
4. Monitor stdout to extract deploy URL and detect upload completion
5. Restore `.git` as soon as `Inspect:` appears (upload done, build runs on Vercel servers)
6. Always restore `.git` on exit, error, or SIGINT (safety net)

## Library API

New export from package root:

```typescript
interface DeployOptions {
  token: string
  cwd: string
  isProduction?: boolean
  hideGit?: boolean
  extraArgs?: string[]
}

interface DeployResult {
  url?: string
  duration: number
}

deploy(options: DeployOptions): Promise<DeployResult>
```

**Behavior:**
- Builds Vercel CLI args: `vercel deploy --token=<token> --yes [--prod] [...extraArgs]`
- Spawns with `stdout: "pipe"`, `stderr: "inherit"`, `stdin: "inherit"`
- Reads stdout line-by-line to extract deploy URL (regex: `https://...vercel.app...`)
- Pipes each stdout line to `process.stdout` so user sees Vercel's native output
- If `hideGit` is true, hides and restores `.git` around the deploy
- On success: returns `{ url, duration }`
- On failure: throws `DeployError` with stderr output and exit code

## Architecture

### New file

`src/deploy.ts` — deploy function + git directory hiding logic

Contains:
- `hideGitDirectory(cwd)`: renames `.git` to `.git_hidden_for_deploy`
- `restoreGitDirectory(cwd)`: restores `.git` from hidden name
- `deploy(options)`: main deploy function

### New command file

`src/commands/deploy.ts` — CLI command using citty

### Updated files

`src/index.ts` — add deploy exports
`src/cli.ts` — register deploy subcommand

## Git Hiding

**Hidden name:** `.git_hidden_for_deploy` (constant, not configurable)

**Safety guarantees:**
- `finally` block in deploy function always restores
- `process.on("exit")` handler as a safety net
- SIGINT handler restores before killing child process
- If `.git` doesn't exist (not a git repo), hiding is silently skipped
- If `.git` is already hidden (from a crashed previous run), skip hiding and still restore after

## URL Extraction

Stdout is piped through to extract the deploy URL:

```typescript
const URL_PATTERN = /https:\/\/[^\s]+\.vercel\.app[^\s]*/;
```

Each line is checked for the URL pattern and printed to stdout. The `Inspect:` line signals upload completion (safe to restore `.git`).

## Non-Goals

- No project creation (ensureProject API). User handles that via `vercel link` or manually.
- No project.json writing. Assumes the working directory is already linked to a Vercel project.
- No phase parsing or progress callbacks. Vercel's native output is sufficient.
- No project association tracking. That stays in consuming tools.
