import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { ACCOUNTS_FILE } from "./config";

export interface Account {
	label: string;
	username: string;
	token: string;
	refreshToken?: string;
	expiresAt?: number;
}

export interface TokenUpdate {
	token: string;
	refreshToken?: string;
	expiresAt?: number;
}

interface AccountsData {
	accounts: Account[];
}

function isAccountsData(data: unknown): data is AccountsData {
	return (
		typeof data === "object" &&
		data !== null &&
		"accounts" in data &&
		Array.isArray((data as AccountsData).accounts)
	);
}

export function loadAccounts(): Account[] {
	if (!existsSync(ACCOUNTS_FILE)) {
		return [];
	}

	try {
		const raw = readFileSync(ACCOUNTS_FILE, "utf-8");
		const data: unknown = JSON.parse(raw);

		if (!isAccountsData(data)) {
			throw new Error("Invalid format");
		}

		return data.accounts;
	} catch {
		throw new Error(
			`Accounts file is corrupted: ${ACCOUNTS_FILE}\nDelete it and re-add your accounts.`,
		);
	}
}

function saveAccounts(accounts: Account[]): void {
	const dir = path.dirname(ACCOUNTS_FILE);

	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	const data: AccountsData = { accounts };
	writeFileSync(ACCOUNTS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function addAccount(account: Account): void {
	const accounts = loadAccounts();
	accounts.push(account);
	saveAccounts(accounts);
}

export function removeAccount(label: string): void {
	const accounts = loadAccounts();
	const filtered = accounts.filter((a) => a.label !== label);

	if (filtered.length === accounts.length) {
		throw new Error(`Account "${label}" not found.`);
	}

	saveAccounts(filtered);
}

export function updateAccountTokens(
	label: string,
	tokens: TokenUpdate,
): void {
	const accounts = loadAccounts();
	const account = accounts.find((a) => a.label === label);

	if (!account) {
		return;
	}

	account.token = tokens.token;

	if (tokens.refreshToken !== undefined) {
		account.refreshToken = tokens.refreshToken;
	}

	if (tokens.expiresAt !== undefined) {
		account.expiresAt = tokens.expiresAt;
	}

	saveAccounts(accounts);
}

export function findAccountByLabel(label: string): Account | undefined {
	return loadAccounts().find((a) => a.label === label);
}
