import * as vscode from 'vscode';
import { registerCommands } from './commands/CommandManager';
import { registerCodeLensProvider } from './providers/codelens';
import { Logger } from './utils/Logger';
import { SidebarProvider } from './providers/sidebar/SidebarProvider';
import { serviceManager } from './utils/ServiceManager';
import { BevelConnectionChecker } from './utils/BevelConnectionChecker';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(serviceManager);
    serviceManager.bevelContext = context;

    // Debug logging
    const outputChannel = vscode.window.createOutputChannel('Bevel Debug');
    outputChannel.show();
    outputChannel.appendLine('Extension activation started');
    serviceManager.logger = new Logger(outputChannel);

    const sidebarProvider = new SidebarProvider(context, outputChannel);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SidebarProvider.sidebarId,
            sidebarProvider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                }
            }
        )
    );

    // Check if Bevel is connected
    BevelConnectionChecker.checkAndNotify().then(isConnected => {
        outputChannel.appendLine(`Bevel connection check: ${isConnected ? 'Connected' : 'Not connected'}`);
        
        // Set a property on the service manager to track connection status
        serviceManager.isBevelConnected = isConnected;
        
        // Send initial connection status to sidebar
        if (serviceManager.sidebarProvider) {
            serviceManager.sidebarProvider.sendConnectionStatus(isConnected);
        }
    });

    // Register all commands
    registerCommands(context);

    // Register the CodeLens provider
    registerCodeLensProvider(context);

    // Set up a timer to periodically check Bevel connection (every 60 seconds)
    const connectionCheckInterval = setInterval(async () => {
        const wasConnected = serviceManager.isBevelConnected;
        const isNowConnected = await BevelConnectionChecker.checkConnection();
        serviceManager.isBevelConnected = isNowConnected;
        
        // If connection status changed, update sidebar and show notification if disconnected
        if (wasConnected !== isNowConnected) {
            // Send updated status to sidebar
            if (serviceManager.sidebarProvider) {
                serviceManager.sidebarProvider.sendConnectionStatus(isNowConnected);
            }
            
            // Only show notification if connection status changed from connected to disconnected
            if (wasConnected && !isNowConnected) {
                BevelConnectionChecker.checkAndNotify();
            }
        }
        
        // If connected, also check if project is analyzed
        if (isNowConnected) {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0 && serviceManager.sidebarProvider) {
                const projectPath = workspaceFolders[0].uri.fsPath;
                const isAnalyzed = await BevelConnectionChecker.isProjectAnalyzed(projectPath);
                serviceManager.sidebarProvider.sendProjectStatus(isAnalyzed);
            }
        }
    }, 5000); // Check every 5s

    // Add the interval to subscriptions so it gets cleared on deactivate
    context.subscriptions.push({ dispose: () => clearInterval(connectionCheckInterval) });
}

export function deactivate() {
    console.log("Bevel extension is now deactivating...");
}
