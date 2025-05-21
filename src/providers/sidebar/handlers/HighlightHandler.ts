import * as vscode from "vscode";
import { DecorationService } from "../services/DecorationService";
import { DependencyHighlightRequest } from "../types";

/**
 * Handler for code highlighting operations in the sidebar
 */
export class HighlightHandler {
    private decorationService: DecorationService;

    constructor() {
        this.decorationService = new DecorationService();
    }

    /**
     * Highlights a dependency in the editor
     */
    public async highlightDependency(dependency: DependencyHighlightRequest): Promise<void> {
        try {
            const { filePath, startLine, endLine } = dependency;
            
            console.log(`[HighlightHandler] Received highlight request with details:`, {
                name: dependency.name,
                filePath: dependency.filePath,
                startLine: dependency.startLine,
                endLine: dependency.endLine,
                hasStartLine: dependency.startLine !== undefined,
                hasEndLine: dependency.endLine !== undefined
            });
            
            if (!filePath) {
                console.error(`[HighlightHandler] Cannot highlight dependency: Missing file path`);
                return;
            }
            
            // If startLine and endLine are defined, use them
            // Otherwise, show the first 10 lines of the file
            const defaultStartLine = 0;
            const defaultEndLine = 10;
            
            const effectiveStartLine = typeof startLine === 'number' ? startLine : defaultStartLine;
            const effectiveEndLine = typeof endLine === 'number' ? endLine : defaultEndLine;
            
            // Delegate to the decoration service
            await this.decorationService.highlightRange(filePath, effectiveStartLine, effectiveEndLine);
        } catch (error) {
            console.error(`[HighlightHandler] Error highlighting dependency:`, error);
            vscode.window.showErrorMessage(
                `Failed to highlight dependency: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Clears any active highlighting
     */
    public clearHighlighting(): void {
        this.decorationService.clearActiveDecoration();
    }

    /**
     * Dispose resources
     */
    public dispose(): void {
        this.decorationService.dispose();
    }
} 