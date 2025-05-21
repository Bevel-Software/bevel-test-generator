import * as vscode from "vscode";
import * as path from "path";

/**
 * Handles editor decorations for highlighting code regions
 */
export class DecorationService {
    // Store the active decoration
    private activeDecoration?: vscode.TextEditorDecorationType;
    
    // Store the click handler disposable
    private clickDisposable?: vscode.Disposable;

    /**
     * Highlights a range of code in the editor
     */
    public async highlightRange(filePath: string, startLine: number, endLine: number): Promise<void> {
        try {
            // Clean up any existing decorations
            this.clearActiveDecoration();
            
            console.log(`[DecorationService] Highlighting lines from ${startLine} to ${endLine} in ${filePath}`);
            
            // Convert path to URI
            let fileUri: vscode.Uri;
            if (path.isAbsolute(filePath)) {
                // Absolute path (works on all platforms)
                fileUri = vscode.Uri.file(filePath);
            } else {
                // Relative path - resolve against workspace root
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders || workspaceFolders.length === 0) {
                    throw new Error('No workspace folder found');
                }
                fileUri = vscode.Uri.joinPath(workspaceFolders[0].uri, filePath);
            }
            
            // Open the file
            const document = await vscode.workspace.openTextDocument(fileUri);
            const editor = await vscode.window.showTextDocument(document);
            
            // Ensure we have valid line numbers
            // VSCode is 0-based internally, but we'll use proper bounds checking
            const adjustedStartLine = Math.max(0, startLine);
            const adjustedEndLine = Math.min(document.lineCount - 1, endLine);
            
            // Create a range from the start of the first line to the end of the last line
            const startPos = new vscode.Position(adjustedStartLine, 0);
            const endPos = new vscode.Position(
                adjustedEndLine, 
                document.lineAt(adjustedEndLine).text.length
            );
            const range = new vscode.Range(startPos, endPos);
            
            // Don't select the range, just reveal it
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
            
            // Add a decorative background to highlight the range - blue instead of orange
            this.activeDecoration = vscode.window.createTextEditorDecorationType({
                backgroundColor: '#1a85ff60', // More vibrant blue with alpha
                isWholeLine: true,
                overviewRulerColor: '#1a85ff',
                overviewRulerLane: vscode.OverviewRulerLane.Right
            });
            
            // Apply the decoration to the range
            editor.setDecorations(this.activeDecoration, [range]);
            
            // Register a one-time click handler to clear the decoration when clicking elsewhere
            this.registerClickHandler();
        } catch (error) {
            console.error(`[DecorationService] Error highlighting code:`, error);
            vscode.window.showErrorMessage(
                `Failed to highlight code: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Clear the active decoration
     */
    public clearActiveDecoration(): void {
        if (this.activeDecoration) {
            this.activeDecoration.dispose();
            this.activeDecoration = undefined;
        }
        
        // Dispose of the click handler if it exists
        if (this.clickDisposable) {
            this.clickDisposable.dispose();
            this.clickDisposable = undefined;
        }
    }
    
    /**
     * Register a click handler to remove the decoration when clicking elsewhere
     */
    private registerClickHandler(): void {
        // Remove any existing click handler
        if (this.clickDisposable) {
            this.clickDisposable.dispose();
        }
        
        // Create a new click handler
        this.clickDisposable = vscode.window.onDidChangeTextEditorSelection(() => {
            // Only clear if the selection is empty (just a click) and not a text selection drag
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.selection.isEmpty) {
                this.clearActiveDecoration();
            }
        });
    }
    
    /**
     * Dispose of resources
     */
    public dispose(): void {
        this.clearActiveDecoration();
    }
} 