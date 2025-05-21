import * as vscode from "vscode";
import Fuse from 'fuse.js';

/**
 * Handles search-related functionality in the sidebar
 */
export class SearchHandler {
    constructor(
        private bevelClient: any,
        private outputChannel?: vscode.OutputChannel
    ) {}

    /**
     * Searches for nodes in the subgraph based on a query
     */
    public async searchSubgraphNodes(searchQuery: string): Promise<any[]> {
        try {
            if (!this.bevelClient) {
                throw new Error('Bevel client not initialized');
            }
            
            // Get workspace folder
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                throw new Error('No workspace folder found');
            }
            
            const workspacePath = workspaceFolders[0].uri.fsPath;
            
            // We need to search by simple name, not by the full node identifier
            let searchResults: any[] = [];
            
            try {
                // Use getNodes() to get all nodes, then filter them by name
                const nodes = await this.bevelClient.nodes.getNodes(workspacePath);
                
                console.log(`[SearchHandler] Found ${nodes.length} nodes in the project`);
                
                // Set up Fuse for fuzzy search
                const fuseOptions = {
                    includeScore: true,
                    keys: ['simpleName', 'name'],
                    threshold: 0.4, // Lower threshold means more strict matching
                    ignoreLocation: true
                };
                
                const fuse = new Fuse(nodes, fuseOptions);
                const fuzzyResults = fuse.search(searchQuery);
                
                // Convert fuse results to nodes and add score for ranking
                searchResults = fuzzyResults.map(result => {
                    // Safely copy properties to avoid spread type issues
                    const resultWithScore = { ...Object(result.item), _score: result.score };
                    return resultWithScore;
                });
                
                console.log(`[SearchHandler] Found ${searchResults.length} fuzzy matches for "${searchQuery}"`);
            } catch (error) {
                console.error(`[SearchHandler] Error getting nodes: ${error}`);
                
                // As a fallback, try finding the node by exact name
                try {
                    const node = await this.bevelClient.nodes.findNodeByName(
                        workspacePath,
                        searchQuery,
                        "" // Use empty string instead of projectPath which was causing the path concatenation issue
                    );
                    
                    if (node) {
                        searchResults.push(node);
                        console.log(`[SearchHandler] Found a single node with exact match for "${searchQuery}"`);
                    }
                } catch (exactMatchError) {
                    console.log(`[SearchHandler] No exact match found for "${searchQuery}": ${exactMatchError}`);
                }
            }
            
            return searchResults;
        } catch (error) {
            console.error(`[SearchHandler] Error searching subgraph nodes:`, error);
            return [];
        }
    }
} 