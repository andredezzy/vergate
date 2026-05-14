import * as p from "@clack/prompts";
import { defineCommand } from "citty";

import { addNewAccount } from "../auth.ts";

export const addCommand = defineCommand({
	meta: {
		name: "add",
		description: "Add a new Vercel account via browser login",
	},
	async run() {
		p.intro("vergate add");

		await addNewAccount();

		p.outro("Done!");
	},
});
