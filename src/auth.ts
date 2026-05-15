import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

import * as p from "@clack/prompts";
import pc from "picocolors";

import {
	type Account,
	addAccount,
	loadAccounts,
	updateAccountTokens,
} from "./accounts";
import { VERCEL_AUTH_FILE } from "./config";

const VERCEL_OAUTH_CLIENT_ID = "cl_HYyOPBNtFMfHhaUn9L4QPfTZz6TP47bp";

interface OAuthTokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	token_type: string;
}

interface VercelAuthData {
	token: string;
	refreshToken?: string;
	expiresAt?: number;
}

function readVercelAuth(): VercelAuthData | null {
	if (!existsSync(VERCEL_AUTH_FILE)) {
		return null;
	}

	try {
		const raw = readFileSync(VERCEL_AUTH_FILE, "utf-8");
		const data = JSON.parse(raw) as Record<string, unknown>;

		if (typeof data.token !== "string") {
			return null;
		}

		return {
			token: data.token,
			refreshToken:
				typeof data.refreshToken === "string" ? data.refreshToken : undefined,
			expiresAt:
				typeof data.expiresAt === "number" ? data.expiresAt : undefined,
		};
	} catch {
		return null;
	}
}

function writeVercelAuth(auth: VercelAuthData): void {
	writeFileSync(VERCEL_AUTH_FILE, JSON.stringify(auth, null, 2), "utf-8");
}

function restoreOriginalAuth(auth: VercelAuthData | null): void {
	if (auth) {
		writeVercelAuth(auth);
	}
}

function isAccessTokenExpired(account: Account): boolean {
	if (typeof account.expiresAt !== "number") {
		return false;
	}

	const nowInSeconds = Math.floor(Date.now() / 1000);
	const bufferSeconds = 60;

	return account.expiresAt <= nowInSeconds + bufferSeconds;
}

async function refreshTokenSilently(
	account: Account,
): Promise<Account | null> {
	if (!account.refreshToken) {
		return null;
	}

	try {
		const configResponse = await fetch(
			"https://vercel.com/.well-known/openid-configuration",
		);
		const config = (await configResponse.json()) as {
			token_endpoint: string;
		};

		const response = await fetch(config.token_endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				client_id: VERCEL_OAUTH_CLIENT_ID,
				grant_type: "refresh_token",
				refresh_token: account.refreshToken,
			}),
		});

		if (!response.ok) {
			return null;
		}

		const data = (await response.json()) as OAuthTokenResponse;

		const nowInSeconds = Math.floor(Date.now() / 1000);

		const tokens = {
			token: data.access_token,
			refreshToken: data.refresh_token,
			expiresAt: nowInSeconds + data.expires_in,
		};

		updateAccountTokens(account.label, tokens);

		return { ...account, ...tokens };
	} catch {
		return null;
	}
}

export async function validateToken(token: string): Promise<boolean> {
	try {
		const res = await fetch("https://api.vercel.com/v2/user", {
			headers: { Authorization: `Bearer ${token}` },
		});

		return res.ok;
	} catch {
		return false;
	}
}

async function getUsername(token: string): Promise<string> {
	const result = await Bun.$`vercel whoami --token=${token}`.quiet().nothrow();
	const output = result.stdout.toString().trim();

	if (result.exitCode !== 0 || !output) {
		throw new Error("Failed to get username. Token may be invalid.");
	}

	return output;
}

export async function refreshAccountViaLogin(): Promise<VercelAuthData> {
	const originalAuth = readVercelAuth();

	if (existsSync(VERCEL_AUTH_FILE)) {
		unlinkSync(VERCEL_AUTH_FILE);
	}

	p.log.info("Opening browser for Vercel login...");
	p.log.message(pc.gray("Complete the login in your browser."));

	const loginProcess = Bun.spawn(["vercel", "login"], {
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	});

	const exitCode = await loginProcess.exited;

	if (exitCode !== 0) {
		restoreOriginalAuth(originalAuth);
		throw new Error("Vercel login failed.");
	}

	const newAuth = readVercelAuth();

	if (!newAuth) {
		restoreOriginalAuth(originalAuth);
		throw new Error("Could not read token after login.");
	}

	restoreOriginalAuth(originalAuth);

	return newAuth;
}

export async function ensureValidToken(account: Account): Promise<Account> {
	if (isAccessTokenExpired(account)) {
		const refreshed = await refreshTokenSilently(account);

		if (refreshed) {
			p.log.success("Token refreshed automatically.");
			return refreshed;
		}
	}

	const isValid = await validateToken(account.token);

	if (isValid) {
		return account;
	}

	const refreshed = await refreshTokenSilently(account);

	if (refreshed) {
		p.log.success("Token refreshed automatically.");
		return refreshed;
	}

	p.log.warn(`Token for "${account.label}" is expired or invalid.`);
	p.log.warn("Refresh token is also expired. Browser login required.");

	const newAuth = await refreshAccountViaLogin();

	updateAccountTokens(account.label, {
		token: newAuth.token,
		refreshToken: newAuth.refreshToken,
		expiresAt: newAuth.expiresAt,
	});

	return {
		...account,
		token: newAuth.token,
		refreshToken: newAuth.refreshToken,
		expiresAt: newAuth.expiresAt,
	};
}

export async function addNewAccount(): Promise<Account> {
	const existingAccounts = loadAccounts();
	const originalAuth = readVercelAuth();

	if (existsSync(VERCEL_AUTH_FILE)) {
		unlinkSync(VERCEL_AUTH_FILE);
	}

	p.log.info("Opening browser for Vercel login...");
	p.log.message(pc.gray("Complete the login in your browser."));

	const loginProcess = Bun.spawn(["vercel", "login"], {
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	});

	const exitCode = await loginProcess.exited;

	if (exitCode !== 0) {
		restoreOriginalAuth(originalAuth);
		throw new Error("Vercel login failed.");
	}

	const newAuth = readVercelAuth();

	if (!newAuth) {
		restoreOriginalAuth(originalAuth);
		throw new Error("Could not read token after login.");
	}

	let username: string;

	try {
		username = await getUsername(newAuth.token);
		p.log.success(`Logged in as ${pc.green(username)}`);
	} catch (error) {
		restoreOriginalAuth(originalAuth);
		throw error;
	}

	const label = await p.text({
		message: "Label for this account:",
		validate: (value) => {
			if (!value.trim()) {
				return "Label cannot be empty";
			}

			if (existingAccounts.some((a) => a.label === value.trim())) {
				return "An account with this label already exists";
			}
		},
	});

	if (p.isCancel(label)) {
		restoreOriginalAuth(originalAuth);
		p.cancel("Account creation cancelled.");
		process.exit(0);
	}

	const account: Account = {
		label: label.trim(),
		username,
		token: newAuth.token,
		refreshToken: newAuth.refreshToken,
		expiresAt: newAuth.expiresAt,
	};

	addAccount(account);

	p.log.success(`Account "${account.label}" added successfully.`);

	restoreOriginalAuth(originalAuth);

	return account;
}

export async function importCurrentAccount(): Promise<Account> {
	const auth = readVercelAuth();

	if (!auth) {
		throw new Error(
			"No Vercel CLI session found. Run `vercel login` first.",
		);
	}

	const isValid = await validateToken(auth.token);

	if (!isValid) {
		throw new Error(
			"Vercel CLI token is invalid or expired. Run `vercel login` first.",
		);
	}

	const username = await getUsername(auth.token);
	const existingAccounts = loadAccounts();
	const existing = existingAccounts.find((a) => a.username === username);

	if (existing) {
		updateAccountTokens(existing.label, {
			token: auth.token,
			refreshToken: auth.refreshToken,
			expiresAt: auth.expiresAt,
		});

		p.log.success(
			`Updated tokens for existing account "${pc.green(existing.label)}" (${username}).`,
		);

		return { ...existing, ...auth };
	}

	p.log.success(`Found session for ${pc.green(username)}.`);

	const label = await p.text({
		message: "Label for this account:",
		validate: (value) => {
			if (!value.trim()) {
				return "Label cannot be empty";
			}

			if (existingAccounts.some((a) => a.label === value.trim())) {
				return "An account with this label already exists";
			}
		},
	});

	if (p.isCancel(label)) {
		p.cancel("Import cancelled.");
		process.exit(0);
	}

	const account: Account = {
		label: label.trim(),
		username,
		token: auth.token,
		refreshToken: auth.refreshToken,
		expiresAt: auth.expiresAt,
	};

	addAccount(account);

	p.log.success(`Account "${account.label}" imported successfully.`);

	return account;
}

export async function selectAccount(): Promise<Account> {
	const accounts = loadAccounts();

	const ADD_NEW = "__add_new__" as const;

	const options = [
		...accounts.map((a) => ({
			label: `${a.label} ${pc.gray(`(${a.username})`)}`,
			value: a.label,
		})),
		{
			label: pc.cyan("+ Add new account"),
			value: ADD_NEW,
		},
	];

	const selected = await p.select({
		message: "Select account:",
		options,
	});

	if (p.isCancel(selected)) {
		p.cancel("Operation cancelled.");
		process.exit(0);
	}

	if (selected === ADD_NEW) {
		return addNewAccount();
	}

	const account = accounts.find((a) => a.label === selected);

	if (!account) {
		throw new Error(`Account "${selected}" not found.`);
	}

	return ensureValidToken(account);
}
