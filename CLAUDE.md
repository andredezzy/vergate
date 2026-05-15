# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Vergate is a Vercel multi-account manager — a CLI tool and library for switching between Vercel identities and deploying from any account. It wraps the Vercel CLI, managing OAuth tokens (access + refresh) and persisting accounts locally.

## Commands

```bash
bun run build        # Build with tsdown (outputs to dist/)
bun run dev          # Run CLI directly via bun (no build needed)
bun run typecheck    # Type-check without emitting
```

There are no tests or linting configured.

## Architecture

Two entry points, built by tsdown into ESM:

- **`src/cli.ts`** — CLI entry (`#!/usr/bin/env bun`). Uses citty for command routing, @clack/prompts for interactive UI.
- **`src/index.ts`** — Library entry. Re-exports the public API for programmatic consumers (`import { deploy, selectAccount } from "vergate"`).

### Core Modules

- **`src/accounts.ts`** — CRUD for the local accounts JSON file. Pure filesystem operations, no network calls.
- **`src/auth.ts`** — All token logic: OAuth refresh via Vercel's OIDC endpoint, token validation against `api.vercel.com/v2/user`, browser login flow via `vercel login`. Key functions:
  - `refreshTokenIfNeeded()` — silent refresh only, never interactive. Used by `list`.
  - `ensureValidToken()` — tries silent refresh, falls back to browser login. Used by `deploy`, `switch`, `whoami`.
  - `selectAccount()` — interactive picker that validates the chosen account's token.
- **`src/deploy.ts`** — Wraps `vercel deploy` as a child process. Streams stdout to parse the deploy URL. Has an optional `.git` hiding mechanism (rename during deploy, restore after).
- **`src/config.ts`** — Platform-aware paths for accounts storage and Vercel CLI auth file.

### Commands (`src/commands/`)

Each file exports a citty `defineCommand`. The parent `accounts.ts` registers subcommands. Commands are thin — they call into `auth.ts` and `accounts.ts` for all logic.

### Token Lifecycle

Vercel OAuth tokens (`vca_` prefix) expire in ~24h. Accounts store both `token` (access) and `refreshToken`. On any operation that needs a valid token, the flow is: check expiry → silent refresh via OIDC → if that fails, fall back to interactive `vercel login`. The `list` command uses the non-interactive path only.

### Storage

- macOS: `~/Library/Application Support/vergate/accounts.json`
- Linux: `~/.config/vergate/accounts.json`
- Vercel CLI auth: `~/Library/Application Support/com.vercel.cli/auth.json` (macOS)

## Publishing

Published to npm as `vergate` via GitHub CI — not from the local CLI. Bump the version in `package.json`, commit, and push to trigger the publish workflow.
