#!/usr/bin/env bun
import { defineCommand, runMain } from "citty";

import { accountsCommand } from "./commands/accounts.ts";
import { deployCommand } from "./commands/deploy.ts";

const main = defineCommand({
	meta: {
		name: "vergate",
		version: "0.1.0",
		description: "Vercel multi-account manager",
	},
	subCommands: {
		accounts: accountsCommand,
		deploy: deployCommand,
	},
});

runMain(main);
