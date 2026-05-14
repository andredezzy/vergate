import * as p from "@clack/prompts";
import { defineCommand } from "citty";
import pc from "picocolors";

import { findAccountByLabel } from "../accounts.ts";
import { ensureValidToken, selectAccount } from "../auth.ts";
import { deploy, DeployError } from "../deploy.ts";

export const deployCommand = defineCommand({
	meta: {
		name: "deploy",
		description: "Deploy to Vercel with account selection and git hiding",
	},
	args: {
		prod: {
			type: "boolean",
			description: "Production deploy",
		},
		"hide-git": {
			type: "boolean",
			description: "Hide .git directory during deploy",
		},
		account: {
			type: "string",
			description: "Account label to use",
			alias: ["a"],
		},
	},
	async run({ args }) {
		p.intro("vergate deploy");

		let account;

		if (args.account) {
			const found = findAccountByLabel(args.account);

			if (!found) {
				p.log.error(`Account "${args.account}" not found.`);
				process.exit(1);
			}

			account = await ensureValidToken(found);
		} else {
			account = await selectAccount();
		}

		p.log.success(
			`Account: ${pc.bold(account.label)} ${pc.gray(`(${account.username})`)}`,
		);

		const environment = args.prod ? "production" : "preview";

		p.log.info(`Deploying to ${pc.bold(environment)}...`);

		if (args["hide-git"]) {
			p.log.info(pc.gray("Git directory will be hidden during deploy."));
		}

		console.log();

		try {
			const result = await deploy({
				token: account.token,
				cwd: process.cwd(),
				isProduction: args.prod,
				hideGit: args["hide-git"],
			});

			console.log();

			if (result.url) {
				p.log.success(`Deployed: ${pc.cyan(result.url)}`);
			}

			const duration = (result.duration / 1000).toFixed(1);
			p.outro(`Done in ${duration}s`);
		} catch (error) {
			console.log();

			if (error instanceof DeployError) {
				p.log.error(`Deploy failed (exit code ${error.exitCode})`);
			} else {
				p.log.error(`Deploy failed: ${(error as Error).message}`);
			}

			process.exit(1);
		}
	},
});
