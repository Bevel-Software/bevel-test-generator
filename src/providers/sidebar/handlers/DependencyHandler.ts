import * as vscode from "vscode";
import { extractDependencies } from "../../../utils/DependencyExtractor";

/**
 * Handler for dependencies related operations in the sidebar
 */
export class DependencyHandler {
    constructor(
        private bevelClient: any,
        private outputChannel?: vscode.OutputChannel
    ) {}

    /**
     * Extracts and formats dependencies for a node
     */
    public async getDependencies(
        nodeDetails: { functionName: string; filePath: string }
    ): Promise<any[]> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            
            if (!workspaceFolders || workspaceFolders.length === 0) {
                throw new Error('No workspace folder found');
            }
            
            const projectPath = workspaceFolders[0].uri.fsPath;
            
            if (!this.bevelClient) {
                throw new Error('Bevel client not initialized');
            }
            
            // Extract dependencies using the utility function
            const dependencies = await extractDependencies(
                this.bevelClient,
                projectPath,
                nodeDetails.functionName,
                nodeDetails.filePath
            );
            
            return dependencies;
        } catch (error) {
            console.error(`[DependencyHandler] Error getting dependencies:`, error);
            throw error;
        }
    }

    /**
     * Formats dependency data for the UI
     */
    public formatDependenciesForUI(dependencies: any[]): any[] {
        return dependencies.map(dep => ({
            name: dep.name,
            type: dep.type,
            implementation: dep.implementation === 'Fake' ? 'Fake Object' : dep.implementation,
            expanded: true,
            nodeId: dep.nodeId,
            filePath: dep.filePath,
            startLine: dep.startLine,
            endLine: dep.endLine,
            definingNodeName: dep.definingNodeName
        }));
    }
} 