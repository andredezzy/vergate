<p align="center">
  <h1 align="center">vergate</h1>
</p>

<p align="center">
  Vercel multi-account manager. Switch identities, deploy from any account.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/vergate"><img src="https://img.shields.io/npm/v/vergate?style=flat&colorA=18181b&colorB=white" alt="Version"></a>
  <a href="https://www.npmjs.com/package/vergate"><img src="https://img.shields.io/npm/dm/vergate?style=flat&colorA=18181b&colorB=white" alt="Downloads"></a>
  <a href="https://github.com/andredezzy/vergate/blob/main/LICENSE"><img src="https://img.shields.io/github/license/andredezzy/vergate?style=flat&colorA=18181b&colorB=white" alt="License"></a>
</p>

<p align="center">
  <a href="#installation">Installation</a> · <a href="#cli">CLI</a> · <a href="#library">Library</a> · <a href="#deploy">Deploy</a>
</p>

---

Vercel CLI only supports one account at a time. **vergate** manages multiple Vercel identities with automatic token refresh, and wraps `vercel deploy` with seamless account selection.

## Installation

```bash
bun add -g vergate
```

```bash
npm install -g vergate
```

## CLI

### Accounts

```bash
# Add a new account via browser login
vergate accounts add

# Switch between saved accounts
vergate accounts switch

# List all saved accounts
vergate accounts list

# Remove an account
vergate accounts remove [label]

# Validate a token and show account info
vergate accounts whoami [label]
```

### Deploy

```bash
# Preview deploy with account selection
vergate deploy

# Production deploy
vergate deploy --prod

# Use a specific account without prompting
vergate deploy --prod --account personal
```

Wraps `vercel deploy` transparently. You see Vercel's native output directly.

## Library

Use vergate programmatically in your own tools.

```typescript
import {
  selectAccount,
  findAccountByLabel,
  ensureValidToken,
  deploy
} from "vergate";
```

### Account management

```typescript
import { selectAccount, loadAccounts, findAccountByLabel } from "vergate";

// Interactive account picker
const account = await selectAccount();

// Look up by label
const account = findAccountByLabel("personal");

// Validate and refresh token automatically
const valid = await ensureValidToken(account);
```

### Deploy

```typescript
import { deploy, DeployError } from "vergate";

try {
  const result = await deploy({
    token: account.token,
    cwd: process.cwd(),
    isProduction: true,
  });

  console.log(result.url);     // https://my-app-xxx.vercel.app
  console.log(result.duration); // 45000 (ms)
} catch (error) {
  if (error instanceof DeployError) {
    console.error(`Exit code: ${error.exitCode}`);
  }
}
```

### Types

```typescript
interface Account {
  label: string;
  username: string;
  token: string;
  refreshToken?: string;
  expiresAt?: number;
}

interface DeployOptions {
  token: string;
  cwd: string;
  isProduction?: boolean;
  extraArgs?: string[];
}

interface DeployResult {
  url?: string;
  duration: number;
}
```

## How it works

**Multi-account**: Accounts are stored locally with encrypted tokens. When a token expires, vergate silently refreshes it via Vercel's OAuth endpoint. If the refresh token is also expired, it opens a browser login.

**Storage locations**:
- macOS: `~/Library/Application Support/vergate/accounts.json`
- Linux: `~/.config/vergate/accounts.json`

## API

| Function | Description |
|---|---|
| `selectAccount()` | Interactive account picker with token validation |
| `addNewAccount()` | Browser login flow, saves new account |
| `ensureValidToken(account)` | Validate and auto-refresh token |
| `validateToken(token)` | Check if a token is valid |
| `loadAccounts()` | Read all saved accounts |
| `findAccountByLabel(label)` | Look up account by label |
| `addAccount(account)` | Save a new account |
| `removeAccount(label)` | Delete an account |
| `updateAccountTokens(label, tokens)` | Update token fields |
| `deploy(options)` | Deploy to Vercel |

## License

MIT
