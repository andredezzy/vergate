import { defineCommand } from "citty";

import { addCommand } from "./add.ts";
import { listCommand } from "./list.ts";
import { removeCommand } from "./remove.ts";
import { switchCommand } from "./switch.ts";
import { whoamiCommand } from "./whoami.ts";

export const accountsCommand = defineCommand({
	meta: {
		name: "accounts",
		description: "Manage Vercel accounts",
	},
	subCommands: {
		add: addCommand,
		switch: switchCommand,
		list: listCommand,
		remove: removeCommand,
		whoami: whoamiCommand,
	},
});
