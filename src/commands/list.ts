import * as p from "@clack/prompts";
import { defineCommand } from "citty";
import pc from "picocolors";

import { loadAccounts } from "../accounts";
import { refreshTokenIfNeeded } from "../auth";

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

		for (const account of accounts) {
			let status: string;

			try {
				await refreshTokenIfNeeded(account);
				status = pc.green("valid");
			} catch {
				status = pc.red("expired");
			}

			p.log.message(
				`${pc.bold(account.label)}  ${pc.gray(account.username)}  ${status}`,
			);
		}

		p.outro(`${accounts.length} account${accounts.length === 1 ? "" : "s"}`);
	},
});
