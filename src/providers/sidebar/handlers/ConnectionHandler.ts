import * as vscode from "vscode";

/**
 * Handler for Bevel connection-related functionality
 */
export class ConnectionHandler {
    constructor() {}

    /**
     * Checks if Bevel is connected and the project is analyzed
     */
    public async checkBevelConnection(): Promise<{ isConnected: boolean, isAnalyzed: boolean }> {
        try {
            // Use the BevelConnectionChecker utility to check connection
            const { BevelConnectionChecker } = await import('../../../utils/BevelConnectionChecker');
            const isConnected = await BevelConnectionChecker.checkConnection();

            // If connected, check if project is analyzed
            let isAnalyzed = false;
            if (isConnected) {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (workspaceFolders && workspaceFolders.length > 0) {
                    const projectPath = workspaceFolders[0].uri.fsPath;
                    isAnalyzed = await BevelConnectionChecker.isProjectAnalyzed(projectPath);
                }
            }

            // Show notification if not connected
            if (!isConnected) {
                BevelConnectionChecker.checkAndNotify();
            }

            return { isConnected, isAnalyzed };
        } catch (error) {
            console.error(`[ConnectionHandler] Error checking Bevel connection:`, error);
            
            // Show error message
            vscode.window.showErrorMessage(
                `Failed to check Bevel connection: ${error instanceof Error ? error.message : String(error)}`
            );
            
            return { isConnected: false, isAnalyzed: false };
        }
    }
} 