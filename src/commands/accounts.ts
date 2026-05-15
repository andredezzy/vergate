import { defineCommand } from "citty";

import { addCommand } from "./add";
import { importCommand } from "./import";
import { listCommand } from "./list";
import { removeCommand } from "./remove";
import { switchCommand } from "./switch";
import { whoamiCommand } from "./whoami";

export const accountsCommand = defineCommand({
	meta: {
		name: "accounts",
		description: "Manage Vercel accounts",
	},
	subCommands: {
		add: addCommand,
		import: importCommand,
		switch: switchCommand,
		list: listCommand,
		remove: removeCommand,
		whoami: whoamiCommand,
	},
});
