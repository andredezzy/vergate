import * as p from "@clack/prompts";
import pc from "picocolors";
import { defineCommand } from "citty";

import { importCurrentAccount } from "../auth";

export const importCommand = defineCommand({
	meta: {
		name: "import",
		description: "Import the currently logged-in Vercel account",
	},
	async run() {
		p.intro("vergate accounts import");

		const account = await importCurrentAccount();

		p.outro(`Account "${pc.green(account.label)}" ready.`);
	},
});
