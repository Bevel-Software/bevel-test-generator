import * as vscode from 'vscode';
import { serviceManager } from '../utils/ServiceManager';
import { getSupportedFileExtensions } from '../bevel/SupportedFileExtensions';
import { Node } from '@bevel-software/bevel-ts-client';
import { SidebarProvider } from './sidebar/SidebarProvider';
import { extractDependencies, DependencyInfo } from '../utils/DependencyExtractor';
import { BevelConnectionChecker } from '../utils/BevelConnectionChecker';

// Command handler interfaces
interface CodeLensCommandArgs {
    documentUri: vscode.Uri;
    range: vscode.Range;
    functionName: string;
    filePath: string;
}

// UI template helper for dependency view
class DependencyViewTemplateProvider {
    /**
     * Generate HTML to display dependencies with implementation selection
     */
    public static generateHtml(functionName: string, dependencies: DependencyInfo[]): string {
        const dependencyRows = dependencies.map((dep, index) => `
            <tr>
                <td>${dep.name}</td>
                <td>${dep.type}</td>
                <td>
                    <select id="implementation-${index}" data-name="${dep.name}">
                        <option value="Mock" ${dep.implementation === 'Mock' ? 'selected' : ''}>Mock</option>
                        <option value="Real" ${dep.implementation === 'Real' ? 'selected' : ''}>Real</option>
                        <option value="Fake" ${dep.implementation === 'Fake' ? 'selected' : ''}>Fake</option>
                    </select>
                </td>
            </tr>
        `).join('');
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: var(--vscode-font-family); color: var(--vscode-editor-foreground); }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--vscode-editor-lineHighlightBorder); }
                    th { background-color: var(--vscode-editor-lineHighlightBackground); }
                    select { width: 100%; padding: 4px; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border); }
                    button { margin-top: 16px; padding: 8px 16px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; cursor: pointer; }
                    button:hover { background: var(--vscode-button-hoverBackground); }
                    .header { margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>Dependencies for ${functionName}</h2>
                    <p>Select implementation type for each dependency:</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Dependency</th>
                            <th>Type</th>
                            <th>Implementation</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dependencyRows}
                    </tbody>
                </table>
                <button id="save-btn">Save Preferences</button>
                
                <script>
                    // Use the VSCode API in a safe way that doesn't reacquire it
                    const vscode = (() => {
                        try {
                            // Check if we're in a VSCode webview context
                            return typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined;
                        } catch (e) {
                            console.error('Failed to acquire VSCode API:', e);
                            return undefined;
                        }
                    })();
                    
                    document.querySelectorAll('select').forEach(select => {
                        select.addEventListener('change', (event) => {
                            const name = event.target.getAttribute('data-name');
                            vscode.postMessage({
                                command: 'updateImplementation',
                                name: name,
                                implementation: event.target.value
                            });
                        });
                    });
                    
                    document.getElementById('save-btn').addEventListener('click', () => {
                        const implementations = {};
                        document.querySelectorAll('select').forEach(select => {
                            const name = select.getAttribute('data-name');
                            implementations[name] = select.value;
                        });
                        
                        vscode.postMessage({
                            command: 'saveImplementations',
                            implementations: implementations
                        });
                    });
                </script>
            </body>
            </html>
        `;
    }
}

// Command handlers
class CodeLensCommandHandler {
    /**
     * Show a Bevel node in the sidebar
     */
    public static async showInSidebar(args: CodeLensCommandArgs): Promise<void> {
        try {
            console.log('[CodeLensCommand] Showing in sidebar:', args);
            
            if (!args.documentUri || !args.functionName || !args.filePath) {
                vscode.window.showErrorMessage('Bevel: Missing required parameters for sidebar display.');
                return;
            }
            
            // Get workspace folder path
            let projectPath = null;
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(args.documentUri);
            
            if (workspaceFolder) {
                projectPath = workspaceFolder.uri.fsPath;
            }
            
            if (!projectPath) {
                console.error(`[CodeLensCommand] Could not determine project path for: ${args.filePath}`);
                vscode.window.showErrorMessage(`Bevel: Could not determine project path for ${args.filePath}`);
                return;
            }

            if (!serviceManager.bevelClient) {
                vscode.window.showErrorMessage('Bevel: Bevel client not initialized.');
                return;
            }

            // Check if Bevel service is connected
            if (!serviceManager.isBevelConnected) {
                // Attempt to check connection again
                const isConnected = await BevelConnectionChecker.checkAndNotify();
                if (!isConnected) {
                    return;  // Don't proceed if connection still not available
                }
            }
            
            console.log(`[CodeLensCommand] Finding node for: ${args.functionName} in ${args.filePath} within project ${projectPath}`);

            const node = await serviceManager.bevelClient.nodes.findNodeByName(projectPath, args.functionName, args.filePath);

            if (node && node.id) { 
                console.log(`[CodeLensCommand] Node found: ${node.id}. Sending to sidebar.`);
                
                // Get full node code and line numbers (if available)
                let nodeCode = '';
                let startLine: number | undefined = undefined;
                let endLine: number | undefined = undefined;
                
                try {
                    // Get node content from Bevel if available
                    const nodeInfo = await serviceManager.bevelClient.nodes.getNode(projectPath, node.id) as any;
                    
                    if (nodeInfo) {
                        nodeCode = nodeInfo.source || '';
                        
                        // Extract line information 
                        if (nodeInfo.position && nodeInfo.position.start) {
                            if (typeof nodeInfo.position.start.line === 'number') {
                                startLine = nodeInfo.position.start.line;
                            }
                        }
                        
                        if (nodeInfo.position && nodeInfo.position.end) {
                            if (typeof nodeInfo.position.end.line === 'number') {
                                endLine = nodeInfo.position.end.line;
                            }
                        }
                    }
                } catch (e) {
                    console.warn(`[CodeLensCommand] Could not get full node info from Bevel: ${e}`);
                    
                    // Fallback: Get the code from the document
                    try {
                        const document = await vscode.workspace.openTextDocument(args.documentUri);
                        
                        if (args.range) {
                            const range = new vscode.Range(
                                args.range.start.line,
                                args.range.start.character,
                                args.range.end.line,
                                args.range.end.character
                            );
                            
                            nodeCode = document.getText(range);
                            startLine = args.range.start.line;
                            endLine = args.range.end.line;
                        }
                    } catch (docError) {
                        console.error(`[CodeLensCommand] Error fetching document text: ${docError}`);
                    }
                }
                
                if (serviceManager.sidebarProvider) {
                    try {
                        // First ensure the sidebar is open
                        await vscode.commands.executeCommand(`${SidebarProvider.sidebarId}.focus`);
                        
                        // Give it a moment to initialize the communication channel
                        if (!serviceManager.sidebarProvider.communicationInterface) {
                            // Wait a bit for the sidebar webview to initialize
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                        
                        // Now attempt to send the request
                        if (serviceManager.sidebarProvider.communicationInterface) {
                            await serviceManager.sidebarProvider.communicationInterface.sendRequest(
                                'sidebar:displayBevelNode',
                                {
                                    nodeId: node.id,
                                    functionName: args.functionName,
                                    filePath: args.filePath,
                                    code: nodeCode,
                                    startLine,
                                    endLine
                                },
                                { timeout: 10000 }
                            );
                            console.log('[CodeLensCommand] Sent request to sidebar to display node.');
                        } else {
                            // If still no communication interface, show error
                            vscode.window.showErrorMessage('Bevel: Sidebar communication channel not available even after opening sidebar.');
                        }
                    } catch (commsError) {
                        console.error('[CodeLensCommand] Error sending request to sidebar:', commsError);
                        vscode.window.showErrorMessage(`Bevel: Could not communicate with sidebar: ${commsError instanceof Error ? commsError.message : String(commsError)}`);
                    }
                } else {
                    vscode.window.showErrorMessage('Bevel: Sidebar communication channel not available.');
                }
            } else {
                vscode.window.showInformationMessage(`Bevel: Could not find Bevel node for function ${args.functionName}. Please ensure the project is analyzed.`);
            }
        } catch (error) {
            console.error('[CodeLensCommand] Error:', error);
            vscode.window.showErrorMessage(`Bevel: Error processing CodeLens action: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Extract and display dependencies for a function
     */
    public static async extractDependencies(args: CodeLensCommandArgs): Promise<void> {
        try {
            if (!args.documentUri || !args.functionName || !args.filePath) {
                vscode.window.showErrorMessage('Bevel: Missing required parameters for dependency extraction.');
                return;
            }
            
            // Get workspace folder path
            let projectPath = null;
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(args.documentUri);
            
            if (workspaceFolder) {
                projectPath = workspaceFolder.uri.fsPath;
            }
            
            if (!projectPath) {
                console.error(`[ExtractDependencies] Could not determine project path for: ${args.filePath}`);
                vscode.window.showErrorMessage(`Bevel: Could not determine project path for ${args.filePath}`);
                return;
            }

            if (!serviceManager.bevelClient) {
                vscode.window.showErrorMessage('Bevel: Bevel client not initialized.');
                return;
            }
            
            // Check if Bevel service is connected
            if (!serviceManager.isBevelConnected) {
                // Attempt to check connection again
                const isConnected = await BevelConnectionChecker.checkAndNotify();
                if (!isConnected) {
                    return;  // Don't proceed if connection still not available
                }
            }

            console.log(`[ExtractDependencies] Extracting dependencies for: ${args.functionName} in ${args.filePath}`);
            
            // Extract dependencies
            const dependencies = await extractDependencies(
                serviceManager.bevelClient,
                projectPath,
                args.functionName,
                args.filePath
            );
            
            if (dependencies.length === 0) {
                vscode.window.showInformationMessage(`Bevel: No dependencies found for ${args.functionName}.`);
                return;
            }
            
            console.log(`[ExtractDependencies] Found ${dependencies.length} dependencies:`, dependencies);
            
            // Create a webview panel to display the dependencies
            const panel = vscode.window.createWebviewPanel(
                'bevelDependencies',
                `Dependencies for ${args.functionName}`,
                vscode.ViewColumn.Beside,
                { enableScripts: true }
            );
            
            // Generate HTML to display dependencies with implementation options
            panel.webview.html = DependencyViewTemplateProvider.generateHtml(args.functionName, dependencies);
            
            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(
                message => {
                    if (message.command === 'updateImplementation') {
                        console.log(`[ExtractDependencies] Updating implementation for ${message.name} to ${message.implementation}`);
                        // Here you can implement logic to save the implementation choice
                    }
                }
            );
            
        } catch (error) {
            console.error('[ExtractDependencies] Error:', error);
            vscode.window.showErrorMessage(`Bevel: Error extracting dependencies: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * CodeLens provider for Bevel functions and methods
 */
export class BevelCodeLensProvider implements vscode.CodeLensProvider {
    private context: vscode.ExtensionContext;
    private cache = {
        lastDocumentPath: "",
        lastDocumentContent: "",
        lastCodeLenses: [] as vscode.CodeLens[]
    };
    
    private refreshEmitter = new vscode.EventEmitter<void>();
    public onDidChangeCodeLenses?: vscode.Event<void> = this.refreshEmitter.event;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        serviceManager.codeLensProvider = this;
        this.registerCommands();
    }

    /**
     * Register commands used by CodeLenses
     */
    private registerCommands(): void {
        this.context.subscriptions.push(
            vscode.commands.registerCommand(
                'bevel.codelensActionShowInSidebar', 
                CodeLensCommandHandler.showInSidebar
            ),
            vscode.commands.registerCommand(
                'bevel.codelensActionExtractDependencies', 
                CodeLensCommandHandler.extractDependencies
            )
        );
    }

    /**
     * Resets the CodeLens cache to force refresh
     */
    public resetCodeLensCache(): void {
        this.cache.lastDocumentPath = "";
        this.refreshEmitter.fire();
    }

    /**
     * Provides CodeLenses for the given document
     */
    public async provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.CodeLens[]> {
        try {
            // Return cached lenses if document hasn't changed
            if (this.cache.lastDocumentPath === document.fileName && 
                this.cache.lastDocumentContent === document.getText() && 
                this.cache.lastCodeLenses.length > 0) {
                console.log('[CodeLensProvider] Using cached code lenses for', document.fileName);
                return this.cache.lastCodeLenses;
            }

            const codeLenses: vscode.CodeLens[] = [];
            
            // Check for valid workspace
            const workspace = vscode.workspace.getWorkspaceFolder(document.uri);
            if (!workspace) {
                console.log(`[CodeLensProvider] Document not in workspace: ${document.fileName}`);
                return [];
            }
            
            // Validate document URI
            if (!document.uri.fsPath) {
                console.log(`[CodeLensProvider] Invalid document URI: ${document.uri.toString()}`);
                return [];
            }
            
            const filePath = document.uri.fsPath;
            console.log(`[CodeLensProvider] Processing file: ${filePath} in workspace: ${workspace.uri.fsPath}`);
            
            // Check if Bevel client and connection are available
            if (!serviceManager.bevelClient) {
                console.warn('[CodeLensProvider] Bevel client not initialized. Skipping CodeLens generation.');
                return [];
            }

            // Check if Bevel service is connected before continuing
            if (!serviceManager.isBevelConnected) {
                console.warn('[CodeLensProvider] Bevel service is not connected. Skipping CodeLens generation.');
                // Show warning message if needed (uncomment if you want this shown every time)
                // vscode.window.showWarningMessage('Bevel service is not connected. Please install and start the Bevel extension for full functionality.');
                return [];
            }

            console.log(`[CodeLensProvider] Providing CodeLenses for ${filePath}`);

            const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                'vscode.executeDocumentSymbolProvider',
                document.uri
            );

            if (token.isCancellationRequested) {
                return [];
            }

            if (symbols) {
                this.processSymbols(symbols, document, codeLenses);
            }
            
            console.log(`[CodeLensProvider] Found ${codeLenses.length} CodeLenses for ${filePath}`);
            
            // Update cache
            this.cache.lastCodeLenses = codeLenses;
            this.cache.lastDocumentContent = document.getText();
            this.cache.lastDocumentPath = document.fileName;
            
            return codeLenses;
        } catch (error) {
            console.error(`[CodeLensProvider] Error providing code lenses for ${document.fileName}:`, error);
            // Reset cache on error
            this.cache.lastDocumentPath = ""; 
            this.cache.lastCodeLenses = [];
            return [];
        }
    }

    /**
     * Process document symbols recursively to create CodeLenses
     */
    private processSymbols(
        symbols: vscode.DocumentSymbol[], 
        document: vscode.TextDocument,
        codeLenses: vscode.CodeLens[],
        parentName?: string
    ): void {
        for (const symbol of symbols) {
            // Consider functions and methods for CodeLenses
            if (symbol.kind === vscode.SymbolKind.Function || symbol.kind === vscode.SymbolKind.Method) {
                const range = symbol.selectionRange || symbol.range;
                const functionName = parentName ? `${parentName}.${symbol.name}` : symbol.name;
                
                const commandArgs = {
                    documentUri: document.uri,
                    range: range,
                    functionName: functionName,
                    filePath: document.uri.fsPath 
                };

                // Add CodeLenses
                codeLenses.push(new vscode.CodeLens(range, {
                    title: "$(testing) Create test",
                    command: "bevel.codelensActionShowInSidebar",
                    arguments: [commandArgs]
                }));
            }
            
            // Process nested symbols
            if (symbol.children && symbol.children.length > 0) {
                const newParentName = (symbol.kind === vscode.SymbolKind.Class || 
                                       symbol.kind === vscode.SymbolKind.Interface || 
                                       symbol.kind === vscode.SymbolKind.Module) 
                    ? (parentName ? `${parentName}.${symbol.name}` : symbol.name) 
                    : parentName;
                    
                this.processSymbols(symbol.children, document, codeLenses, newParentName);
            }
        }
    }
}

/**
 * Register the code lens provider with VSCode
 */
export const registerCodeLensProvider = async (context: vscode.ExtensionContext) => {
    const codeLensProvider = new BevelCodeLensProvider(context);
    
    // Get file patterns to register the provider for
    let fileEndings = [
        (await getSupportedFileExtensions()).map(ext => ({ pattern: `**/*${ext}` })),
        (await getSupportedFileExtensions()).map(ext => ({ pattern: `**/*${ext.toUpperCase()}` }))
    ].flatMap(ext => ext);
    
    const codeLensProviderDisposable = vscode.languages.registerCodeLensProvider(
        fileEndings,
        codeLensProvider
    );
    
    context.subscriptions.push(codeLensProviderDisposable);
};