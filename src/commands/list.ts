import * as p from "@clack/prompts";
import { defineCommand } from "citty";
import pc from "picocolors";

import { loadAccounts } from "../accounts";

export const listCommand = defineCommand({
	meta: {
		name: "list",
		description: "List all saved Vercel accounts",
	},
	async run() {
		const accounts = loadAccounts();

		if (accounts.length === 0) {
			p.log.warn("No accounts saved. Run `vergate accounts add` to add one.");
			return;
		}

		p.intro("vergate accounts");

		const nowInSeconds = Math.floor(Date.now() / 1000);

		for (const account of accounts) {
			const isExpired =
				typeof account.expiresAt === "number" &&
				account.expiresAt <= nowInSeconds;

			const status = isExpired
				? pc.red("expired")
				: pc.green("valid");

			p.log.message(
				`${pc.bold(account.label)}  ${pc.gray(account.username)}  ${status}`,
			);
		}

		p.outro(`${accounts.length} account${accounts.length === 1 ? "" : "s"}`);
	},
});
