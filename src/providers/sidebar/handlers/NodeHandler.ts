import * as vscode from "vscode";

/**
 * Handler for node-related operations in the sidebar
 */
export class NodeHandler {
    constructor(
        private bevelClient: any,
        private outputChannel?: vscode.OutputChannel
    ) {}

    /**
     * Gets type information for a node
     */
    public async getNodeTypeInfo(nodeName: string): Promise<any> {
        try {
            console.log(`[NodeHandler] Getting node type info for: ${nodeName}`);
            
            if (!this.bevelClient) {
                throw new Error('Bevel client not initialized');
            }
            
            // Get workspace folder
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                throw new Error('No workspace folder found');
            }
            
            const projectPath = workspaceFolders[0].uri.fsPath;
            
            // First, try to directly get the node by ID (if nodeName is already a node ID)
            let nodeInfo: any = null;
            
            try {
                // Try to directly get the node by its ID 
                nodeInfo = await this.bevelClient.nodes.getNode(
                    projectPath,
                    nodeName
                );
                
                if (nodeInfo) {
                    console.log(`[NodeHandler] Found node by ID: ${nodeName}`, nodeInfo);
                }
            } catch (idError) {
                console.log(`[NodeHandler] Could not find node by ID: ${nodeName}`, idError);
                
                // If it's not a valid node ID, try finding by name across all nodes
                try {
                    // Get all node IDs (more efficient than getting all nodes)
                    const nodeIds = await this.bevelClient.nodes.getIds(projectPath);
                    console.log(`[NodeHandler] Found ${nodeIds.length} node IDs in the project`);
                    
                    // Find a node ID that contains the name we're looking for
                    const matchingIds = nodeIds.filter((id: string) => id.includes(nodeName));
                    
                    if (matchingIds.length > 0) {
                        console.log(`[NodeHandler] Found ${matchingIds.length} matching IDs for ${nodeName}`);
                        
                        // Get the first matching node
                        try {
                            nodeInfo = await this.bevelClient.nodes.getNode(projectPath, matchingIds[0]);
                            console.log(`[NodeHandler] Found node with matching ID: ${matchingIds[0]}`, nodeInfo);
                        } catch (matchNodeError) {
                            console.log(`[NodeHandler] Error getting node with ID ${matchingIds[0]}:`, matchNodeError);
                        }
                    } else {
                        console.log(`[NodeHandler] No matching node IDs found for ${nodeName}`);
                    }
                } catch (idsError) {
                    console.log(`[NodeHandler] Error getting node IDs:`, idsError);
                }
            }
            
            // If we still couldn't find it, try to extract potential parent node info 
            if (!nodeInfo) {
                // Try to extract parent node information from the name
                const parts = nodeName.split('.');
                if (parts.length >= 3) { 
                    // This looks like a compound ID like "number.hash.Class.Method"
                    // Try getting the parent class by constructing its ID
                    const parentParts = parts.slice(0, -1);
                    const parentNodeName = parentParts.join('.');
                    
                    try {
                        nodeInfo = await this.bevelClient.nodes.getNode(
                            projectPath,
                            parentNodeName
                        );
                        console.log(`[NodeHandler] Found parent node: ${parentNodeName}`, nodeInfo);
                    } catch (parentError) {
                        console.log(`[NodeHandler] Could not find parent node: ${parentNodeName}`, parentError);
                    }
                }
                
                // If we still couldn't find anything, return null
                if (!nodeInfo) {
                    return null;
                }
            }
            
            // Extract the node type from the retrieved info
            const nodeAny = nodeInfo as any;
            const nodeType = nodeAny.type || nodeAny.nodeType || 'Unknown';
            console.log(`[NodeHandler] Node type for ${nodeName}: ${nodeType}`);
            
            // Extract useful information from the node API response
            return {
                name: nodeName,
                type: nodeType,
                nodeId: nodeInfo.id,
                filePath: nodeAny.filePath,
                startLine: nodeAny.startLine || 
                    (nodeAny.codeLocation?.start?.line),
                endLine: nodeAny.endLine || 
                    (nodeAny.codeLocation?.end?.line)
            };
        } catch (error) {
            console.error(`[NodeHandler] Error getting node type info:`, error);
            return null;
        }
    }

    /**
     * Gets line information for a node
     */
    public async getNodeLineInfo(
        nodeId: string,
        functionName: string,
        filePath: string
    ): Promise<{
        nodeId: string;
        functionName: string;
        filePath: string;
        startLine?: number;
        endLine?: number;
        error?: string;
    }> {
        try {
            console.log(`[NodeHandler] Getting line info for node: ${nodeId}`);
            
            if (!this.bevelClient) {
                throw new Error('Bevel client not initialized');
            }
            
            // Try to get node information using Bevel client
            let startLine: number | undefined;
            let endLine: number | undefined;
            
            // Try to get line information from node data
            try {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders || workspaceFolders.length === 0) {
                    throw new Error('No workspace folder found');
                }
                
                const projectPath = workspaceFolders[0].uri.fsPath;
                
                // Try to find node information by ID
                try {
                    const nodeInfo = await this.bevelClient.nodes.getNode(projectPath, nodeId);
                    if (nodeInfo && (nodeInfo as any).codeLocation) {
                        const location = (nodeInfo as any).codeLocation;
                        startLine = location.start?.line;
                        endLine = location.end?.line;
                        console.log(`[NodeHandler] Found line info for ${nodeId}: ${startLine}-${endLine}`);
                    }
                } catch (nodeError) {
                    console.log(`[NodeHandler] Could not find node by ID: ${nodeError}`);
                }
                
                // If no line info, try to find by name
                if (startLine === undefined || endLine === undefined) {
                    try {
                        const node = await this.bevelClient.nodes.findNodeByName(projectPath, functionName, filePath);
                        if (node && (node as any).codeLocation) {
                            const location = (node as any).codeLocation;
                            startLine = location.start?.line;
                            endLine = location.end?.line;
                            console.log(`[NodeHandler] Found line info by name for ${functionName}: ${startLine}-${endLine}`);
                        }
                    } catch (nameError) {
                        console.log(`[NodeHandler] Could not find node by name: ${nameError}`);
                    }
                }
                
                // If still no line info, look in connections
                if (startLine === undefined || endLine === undefined) {
                    try {
                        // Look for connections where this node is a source or target
                        const fromConnections = await this.bevelClient.connections.findConnectionsFrom(projectPath, nodeId);
                        const toConnections = await this.bevelClient.connections.findConnectionsTo(projectPath, nodeId);
                        
                        const allConnections = [...fromConnections, ...toConnections];
                        
                        // Find connections with location information
                        for (const conn of allConnections) {
                            if (conn.location) {
                                startLine = conn.location.start.line;
                                endLine = conn.location.end.line;
                                console.log(`[NodeHandler] Found line info in connection for ${nodeId}: ${startLine}-${endLine}`);
                                break;
                            }
                        }
                    } catch (connError) {
                        console.log(`[NodeHandler] Error finding connections: ${connError}`);
                    }
                }
            } catch (err) {
                console.log(`[NodeHandler] Error getting node from Bevel: ${err}`);
            }
            
            // If we still don't have line info, try to parse the file
            if (startLine === undefined || endLine === undefined) {
                try {
                    const document = await vscode.workspace.openTextDocument(filePath);
                    const text = document.getText();
                    
                    // Simple function detection - can be improved based on language
                    const functionRegex = new RegExp(`function\\s+${functionName}\\s*\\(|${functionName}\\s*=\\s*\\([^)]*\\)\\s*=>|${functionName}\\s*\\([^)]*\\)\\s*{`, 'g');
                    const match = functionRegex.exec(text);
                    
                    if (match) {
                        const position = document.positionAt(match.index);
                        startLine = position.line;
                        
                        // Estimate the end based on brackets matching or 10 lines after start
                        endLine = Math.min(startLine + 10, document.lineCount - 1);
                        
                        console.log(`[NodeHandler] Estimated line range for ${functionName}: ${startLine}-${endLine}`);
                    }
                } catch (err) {
                    console.log(`[NodeHandler] Error finding function in document: ${err}`);
                }
            }
            
            return {
                nodeId,
                functionName,
                filePath,
                startLine,
                endLine
            };
        } catch (error) {
            console.error(`[NodeHandler] Error getting line info:`, error);
            return {
                nodeId,
                functionName,
                filePath,
                error: 'Failed to get line information'
            };
        }
    }
} 