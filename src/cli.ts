#!/usr/bin/env bun
import { defineCommand, runMain } from "citty";

import { addCommand } from "./commands/add.ts";
import { deployCommand } from "./commands/deploy.ts";
import { listCommand } from "./commands/list.ts";
import { removeCommand } from "./commands/remove.ts";
import { switchCommand } from "./commands/switch.ts";
import { whoamiCommand } from "./commands/whoami.ts";

const main = defineCommand({
	meta: {
		name: "vergate",
		version: "0.1.0",
		description: "Vercel multi-account manager",
	},
	subCommands: {
		add: addCommand,
		deploy: deployCommand,
		switch: switchCommand,
		list: listCommand,
		remove: removeCommand,
		whoami: whoamiCommand,
	},
});

runMain(main);
