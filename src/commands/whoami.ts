import * as p from "@clack/prompts";
import { defineCommand } from "citty";
import { createSpinner } from "nanospinner";
import pc from "picocolors";

import { loadAccounts } from "../accounts";
import { ensureValidToken, validateToken } from "../auth";

export const whoamiCommand = defineCommand({
	meta: {
		name: "whoami",
		description: "Show and validate the selected account",
	},
	args: {
		label: {
			type: "positional",
			description: "Account label to check",
			required: false,
		},
	},
	async run({ args }) {
		p.intro("vergate accounts whoami");

		let label = args.label as string | undefined;

		if (!label) {
			const accounts = loadAccounts();

			if (accounts.length === 0) {
				p.log.warn("No accounts saved. Run `vergate accounts add` to add one.");
				p.outro("");
				return;
			}

			const selected = await p.select({
				message: "Select account:",
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

		const accounts = loadAccounts();
		const account = accounts.find((a) => a.label === label);

		if (!account) {
			p.log.error(`Account "${label}" not found.`);
			process.exit(1);
		}

		const spinner = createSpinner("Validating token...").start();

		const isValid = await validateToken(account.token);

		if (isValid) {
			spinner.success("Token is valid");
		} else {
			spinner.error("Token is invalid or expired");
		}

		p.log.message(`Label:    ${pc.bold(account.label)}`);
		p.log.message(`Username: ${pc.bold(account.username)}`);
		p.log.message(
			`Status:   ${isValid ? pc.green("valid") : pc.red("expired")}`,
		);

		if (!isValid) {
			const shouldRefresh = await p.confirm({
				message: "Attempt to refresh token?",
				initialValue: true,
			});

			if (p.isCancel(shouldRefresh) || !shouldRefresh) {
				p.outro("");
				return;
			}

			await ensureValidToken(account);
			p.log.success("Token refreshed.");
		}

		p.outro("Done!");
	},
});
