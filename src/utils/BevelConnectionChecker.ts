import * as vscode from 'vscode';
import * as http from 'http';
import { serviceManager } from './ServiceManager';

/**
 * Utility class to check if the Bevel service is running on localhost:1645
 */
export class BevelConnectionChecker {
    /**
     * Checks if the Bevel service is available at localhost:1645
     * @returns Promise that resolves to true if connected, false if not
     */
    public static checkConnection(): Promise<boolean> {
        return new Promise((resolve) => {
            const req = http.get({
                hostname: 'localhost',
                port: 1645,
                path: '/',
                method: 'HEAD',
                timeout: 2000 // 2 second timeout
            }, (res) => {
                // Any response means the service is running
                resolve(true);
            });

            req.on('error', () => {
                // Connection error means service is not available
                resolve(false);
            });

            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
        });
    }

    /**
     * Checks if the current project has been analyzed by Bevel
     * @param projectPath Path to the project
     * @returns Promise that resolves to true if project is analyzed, false if not
     */
    public static async isProjectAnalyzed(projectPath: string): Promise<boolean> {
        try {
            if (!serviceManager.bevelClient) {
                return false;
            }
            
            // Check if the node repository has any nodes
            const isEmpty = await serviceManager.bevelClient.nodes.isEmpty(projectPath);
            return !isEmpty;
        } catch (error) {
            console.error('[BevelConnectionChecker] Error checking if project is analyzed:', error);
            return false;
        }
    }

    /**
     * Shows a notification if Bevel is not running
     * @returns Promise that resolves to true if connected, false if not
     */
    public static async checkAndNotify(): Promise<boolean> {
        const isConnected = await this.checkConnection();
        
        if (!isConnected) {
            const installButton = 'Install Bevel';
            const message = 'Bevel extension should be installed and localhost service should be running for full functionality.';
            
            vscode.window.showWarningMessage(message, installButton)
                .then(selection => {
                    if (selection === installButton) {
                        vscode.commands.executeCommand(
                            'vscode.open',
                            vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=bevel-software.bevel')
                        );
                    }
                });
            
            return false;
        }
        
        // Check if project is analyzed
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const projectPath = workspaceFolders[0].uri.fsPath;
            const isAnalyzed = await this.isProjectAnalyzed(projectPath);
            
            if (!isAnalyzed) {
                const analyzeButton = 'Open Bevel';
                const message = 'This project has not been analyzed by Bevel yet. Please open the Bevel sidepanel for full functionality.';
                
                vscode.window.showWarningMessage(message, analyzeButton)
                    .then(selection => {
                        if (selection === analyzeButton) {
                            vscode.commands.executeCommand('workbench.view.extension.bevel-explorer');
                        }
                    });
            }
            
            return isConnected && isAnalyzed;
        }
        
        return isConnected;
    }
} 