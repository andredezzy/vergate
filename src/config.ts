import { homedir } from "node:os";
import path from "node:path";

const VERGATE_DIR =
	process.platform === "darwin"
		? path.join(homedir(), "Library", "Application Support", "vergate")
		: path.join(homedir(), ".config", "vergate");

export const ACCOUNTS_FILE = path.join(VERGATE_DIR, "accounts.json");

const VERCEL_CLI_DIR =
	process.platform === "darwin"
		? "Library/Application Support/com.vercel.cli"
		: ".local/share/com.vercel.cli";

export const VERCEL_AUTH_FILE = path.join(
	homedir(),
	VERCEL_CLI_DIR,
	"auth.json",
);
