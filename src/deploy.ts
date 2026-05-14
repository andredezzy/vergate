import { existsSync, renameSync } from "node:fs";
import path from "node:path";

const HIDDEN_GIT_NAME = ".git_hidden_for_deploy";

const URL_PATTERN = /https:\/\/[^\s]+\.vercel\.app[^\s]*/;

export class DeployError extends Error {
	constructor(
		message: string,
		public readonly exitCode: number,
	) {
		super(message);
		this.name = "DeployError";
	}
}

export interface DeployOptions {
	token: string;
	cwd: string;
	isProduction?: boolean;
	hideGit?: boolean;
	extraArgs?: string[];
}

export interface DeployResult {
	url?: string;
	duration: number;
}

function hideGitDirectory(cwd: string): { gitDir: string; hiddenDir: string } | null {
	const gitDir = path.join(cwd, ".git");
	const hiddenDir = path.join(cwd, HIDDEN_GIT_NAME);

	if (!existsSync(gitDir)) {
		return null;
	}

	renameSync(gitDir, hiddenDir);

	return { gitDir, hiddenDir };
}

function restoreGitDirectory(gitDir: string, hiddenDir: string): void {
	try {
		if (!existsSync(gitDir) && existsSync(hiddenDir)) {
			renameSync(hiddenDir, gitDir);
		}
	} catch {
		// Best effort: .git restore should never block the process
	}
}

async function processStdout(
	stream: ReadableStream<Uint8Array>,
	onUrl: (url: string) => void,
	onInspect: () => void,
): Promise<void> {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	while (true) {
		const { done, value } = await reader.read();

		if (done) {
			break;
		}

		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split("\n");
		buffer = lines.pop() ?? "";

		for (const line of lines) {
			process.stdout.write(line + "\n");

			if (line.includes("Inspect:")) {
				onInspect();
			}

			const match = line.match(URL_PATTERN);

			if (match) {
				onUrl(match[0]);
			}
		}
	}

	const remaining = buffer.trim();

	if (remaining) {
		process.stdout.write(remaining + "\n");

		const match = remaining.match(URL_PATTERN);

		if (match) {
			onUrl(match[0]);
		}
	}
}

export async function deploy(options: DeployOptions): Promise<DeployResult> {
	const { token, cwd, isProduction, hideGit, extraArgs } = options;
	const startTime = Date.now();

	const args = ["vercel", "deploy", `--token=${token}`, "--yes"];

	if (isProduction) {
		args.push("--prod");
	}

	if (extraArgs) {
		args.push(...extraArgs);
	}

	const gitPaths = hideGit ? hideGitDirectory(cwd) : null;

	let isGitRestored = false;

	const restoreGit = (): void => {
		if (!isGitRestored && gitPaths) {
			isGitRestored = true;
			restoreGitDirectory(gitPaths.gitDir, gitPaths.hiddenDir);
		}
	};

	const onExit = (): void => {
		restoreGit();
	};

	process.on("exit", onExit);

	const child = Bun.spawn(args, {
		cwd,
		stdout: "pipe",
		stderr: "inherit",
		stdin: "inherit",
		env: {
			...process.env,
			VERCEL_ORG_ID: undefined,
			VERCEL_PROJECT_ID: undefined,
		},
	});

	const onSigint = (): void => {
		restoreGit();
		child.kill("SIGTERM");
	};

	process.on("SIGINT", onSigint);

	let deployUrl: string | undefined;

	try {
		await processStdout(
			child.stdout,
			(url) => {
				deployUrl = url;
			},
			() => {
				restoreGit();
			},
		);

		const exitCode = await child.exited;

		const duration = Date.now() - startTime;

		if (exitCode !== 0) {
			throw new DeployError(
				`Deploy failed with exit code ${exitCode}`,
				exitCode,
			);
		}

		return { url: deployUrl, duration };
	} finally {
		restoreGit();

		process.off("SIGINT", onSigint);
		process.off("exit", onExit);
	}
}
