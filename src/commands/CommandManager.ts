import * as vscode from 'vscode';
import { Logger } from '../utils/Logger';
import { serviceManager } from '../utils/ServiceManager';
import { createTabWebview } from '../providers/TabWebviewProvider';

export const registerCommands = (context: vscode.ExtensionContext) => {
    context.subscriptions.push(
        vscode.commands.registerCommand('bevel-test-generator.exampleCommand', async () => {
            if (vscode.workspace.workspaceFolders) {
                serviceManager.logger?.log("Running example command...");
                console.log("Running example command...");
                createTabWebview(context);
            }
        })
    );
}; 