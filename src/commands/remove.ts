import * as p from "@clack/prompts";
import { defineCommand } from "citty";
import pc from "picocolors";

import { loadAccounts, removeAccount } from "../accounts.ts";

export const removeCommand = defineCommand({
	meta: {
		name: "remove",
		description: "Remove a saved Vercel account",
	},
	args: {
		label: {
			type: "positional",
			description: "Account label to remove",
			required: false,
		},
	},
	async run({ args }) {
		p.intro("vergate remove");

		let label = args.label as string | undefined;

		if (!label) {
			const accounts = loadAccounts();

			if (accounts.length === 0) {
				p.log.warn("No accounts saved.");
				p.outro("Nothing to remove.");
				return;
			}

			const selected = await p.select({
				message: "Select account to remove:",
				options: accounts.map((a) => ({
					label: `${a.label} ${pc.gray(`(${a.username})`)}`,
					value: a.label,
				})),
			});

			if (p.isCancel(selected)) {
				p.cancel("Operation cancelled.");
				process.exit(0);
			}

			label = selected;
		}

		const shouldConfirm = await p.confirm({
			message: `Remove account "${label}"?`,
			initialValue: false,
		});

		if (p.isCancel(shouldConfirm) || !shouldConfirm) {
			p.cancel("Removal cancelled.");
			process.exit(0);
		}

		removeAccount(label);

		p.log.success(`Account "${label}" removed.`);

		p.outro("Done!");
	},
});
