import * as vscode from "vscode";
import { DependencyHandler } from "../handlers/DependencyHandler";
import { HighlightHandler } from "../handlers/HighlightHandler";
import { NodeHandler } from "../handlers/NodeHandler";
import { SearchHandler } from "../handlers/SearchHandler";
import { ConnectionHandler } from "../handlers/ConnectionHandler";
import { serviceManager } from "../../../utils/ServiceManager";

/**
 * Routes messages from the webview to the appropriate handlers
 */
export class MessageRouter {
    constructor(
        private dependencyHandler: DependencyHandler,
        private highlightHandler: HighlightHandler,
        private nodeHandler: NodeHandler,
        private searchHandler: SearchHandler,
        private connectionHandler: ConnectionHandler
    ) {}

    /**
     * Handles a message from the webview
     */
    public async handleMessage(message: any, webview: vscode.Webview): Promise<void> {
        try {
            if (!message || !message.type) {
                console.error('[MessageRouter] Received invalid message without type');
                return;
            }

            console.log(`[MessageRouter] Handling message of type: ${message.type}`);

            switch (message.type) {
                case 'highlightDependency':
                    await this.handleHighlightDependency(message, webview);
                    break;
                    
                case 'getDependencies':
                    await this.handleGetDependencies(message, webview);
                    break;
                    
                case 'searchSubgraphNodes':
                    await this.handleSearchSubgraphNodes(message, webview);
                    break;
                    
                case 'getNodeTypeInfo':
                    await this.handleGetNodeTypeInfo(message, webview);
                    break;
                    
                case 'getNodeLineInfo':
                    await this.handleGetNodeLineInfo(message, webview);
                    break;
                    
                case 'openBevelMarketplace':
                    vscode.commands.executeCommand(
                        'vscode.open', 
                        vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=bevel-software.bevel')
                    );
                    break;
                
                case 'openBevelSidepanel':
                    vscode.commands.executeCommand('workbench.view.extension.bevel-explorer');
                    break;
                
                case 'checkBevelConnection':
                    await this.handleCheckBevelConnection(webview);
                    break;
                    
                case 'analyzeProject':
                    vscode.commands.executeCommand('bevel.analyzeProject');
                    break;
                    
                default:
                    console.log(`[MessageRouter] Unhandled message type: ${message?.type}`);
            }
        } catch (error) {
            console.error('[MessageRouter] Error handling message:', error);
        }
    }

    /**
     * Handles highlightDependency message
     */
    private async handleHighlightDependency(message: any, webview: vscode.Webview): Promise<void> {
        await this.highlightHandler.highlightDependency(message.dependency);
    }

    /**
     * Handles getDependencies message
     */
    private async handleGetDependencies(message: any, webview: vscode.Webview): Promise<void> {
        try {
            const dependencies = await this.dependencyHandler.getDependencies(message.nodeDetails);
            const formattedDependencies = this.dependencyHandler.formatDependenciesForUI(dependencies);
            
            webview.postMessage({
                type: 'functionDependencies',
                dependencies: formattedDependencies
            });
        } catch (error) {
            console.error(`[MessageRouter] Error in handleGetDependencies:`, error);
            
            webview.postMessage({
                type: 'functionDependenciesError',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Handles searchSubgraphNodes message
     */
    private async handleSearchSubgraphNodes(message: any, webview: vscode.Webview): Promise<void> {
        try {
            const results = await this.searchHandler.searchSubgraphNodes(message.searchQuery);
            
            webview.postMessage({
                type: 'subgraphSearchResults',
                results
            });
        } catch (error) {
            console.error(`[MessageRouter] Error in handleSearchSubgraphNodes:`, error);
            
            webview.postMessage({
                type: 'subgraphSearchResults',
                results: []
            });
        }
    }

    /**
     * Handles getNodeTypeInfo message
     */
    private async handleGetNodeTypeInfo(message: any, webview: vscode.Webview): Promise<void> {
        try {
            const nodeInfo = await this.nodeHandler.getNodeTypeInfo(message.nodeName);
            
            webview.postMessage({
                type: 'parentNodeTypeInfo',
                nodeInfo
            });
        } catch (error) {
            console.error(`[MessageRouter] Error in handleGetNodeTypeInfo:`, error);
            
            webview.postMessage({
                type: 'parentNodeTypeInfo',
                nodeInfo: null,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Handles getNodeLineInfo message
     */
    private async handleGetNodeLineInfo(message: any, webview: vscode.Webview): Promise<void> {
        try {
            const lineInfo = await this.nodeHandler.getNodeLineInfo(
                message.nodeId,
                message.functionName,
                message.filePath
            );
            
            webview.postMessage({
                type: 'nodeLineInfo',
                ...lineInfo
            });
        } catch (error) {
            console.error(`[MessageRouter] Error in handleGetNodeLineInfo:`, error);
            
            webview.postMessage({
                type: 'nodeLineInfo',
                nodeId: message.nodeId,
                functionName: message.functionName,
                filePath: message.filePath,
                error: 'Failed to get line information'
            });
        }
    }

    /**
     * Handles checkBevelConnection message
     */
    private async handleCheckBevelConnection(webview: vscode.Webview): Promise<void> {
        try {
            const { isConnected, isAnalyzed } = await this.connectionHandler.checkBevelConnection();
            
            // Update connection status in service manager
            serviceManager.isBevelConnected = isConnected;
            
            // Send connection status to the sidebar
            webview.postMessage({
                type: 'bevelConnectionStatus',
                isConnected
            });
            
            // Send project status to the sidebar
            webview.postMessage({
                type: 'bevelProjectStatus',
                isAnalyzed
            });
        } catch (error) {
            console.error(`[MessageRouter] Error in handleCheckBevelConnection:`, error);
            
            // Update connection status
            serviceManager.isBevelConnected = false;
            
            webview.postMessage({
                type: 'bevelConnectionStatus',
                isConnected: false
            });
        }
    }
} 