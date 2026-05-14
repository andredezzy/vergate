import * as p from "@clack/prompts";
import { defineCommand } from "citty";
import pc from "picocolors";

import { selectAccount } from "../auth";

export const switchCommand = defineCommand({
	meta: {
		name: "switch",
		description: "Select and validate a Vercel account",
	},
	async run() {
		p.intro("vergate switch");

		const account = await selectAccount();

		p.log.success(
			`Active: ${pc.bold(account.label)} ${pc.gray(`(${account.username})`)}`,
		);

		p.outro("Done!");
	},
});
