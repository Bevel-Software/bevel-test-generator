import type { OutputChannel } from "vscode"

/**
 * Simple logging utility for the extension's backend code.
 * Uses VS Code's OutputChannel which must be initialized from extension.ts
 * to ensure proper registration with the extension context.
 */
export class Logger {
	constructor(private outputChannel: OutputChannel) {}

	log(message: string) {
		this.outputChannel.appendLine(message)
	}
}
