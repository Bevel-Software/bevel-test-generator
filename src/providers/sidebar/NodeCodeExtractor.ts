import * as vscode from "vscode";
import * as path from "path";

/**
 * Utility class for extracting code from nodes
 */
export class NodeCodeExtractor {
	/**
	 * Extracts code for a node from its source file
	 */
	public static async getNodeCode(node: any, projectPath: string): Promise<string> {
		if (!node || !node.filePath) {
			return '';
		}
		
		// Extract line information
		const [startLine, endLine] = this.extractLineRange(node);
		
		if (startLine === null || endLine === null) {
			// Handle special node types
			if (node.simpleType === 'Import' || node.simpleType === 'Module' || node.nodeType === 'File') {
				return `// ${node.simpleType || node.nodeType} ${node.simpleName || ''}`;
			}
			return '';
		}
		
		try {
			// Make sure the file path is absolute
			const filePath = this.ensureAbsolutePath(node.filePath, projectPath);
			
			// Extract code from the file
			const doc = await vscode.workspace.openTextDocument(filePath);
			const lines = doc.getText().split('\n');
			
			// Adjust for 0-based vs 1-based line numbering
			const adjustedStartLine = Math.max(0, startLine - 1);
			const adjustedEndLine = Math.min(lines.length, endLine);
			
			const code = lines.slice(adjustedStartLine, adjustedEndLine).join('\n');
			return code || '// No code found at specified location';
		} catch (e) {
			console.error('[NodeCodeExtractor] Error getting node code:', e);
			return `// Error loading code: ${e instanceof Error ? e.message : String(e)}`;
		}
	}
	
	/**
	 * Extracts line range from a node
	 */
	private static extractLineRange(node: any): [number | null, number | null] {
		// Check if we have direct startLine and endLine properties
		if (node.startLine != null && node.endLine != null) {
			return [node.startLine, node.endLine];
		} 
		
		// Check if we have a codeLocation object with start and end line info
		if (node.codeLocation && 
			node.codeLocation.start && 
			node.codeLocation.start.line != null && 
			node.codeLocation.end && 
			node.codeLocation.end.line != null) {
			return [node.codeLocation.start.line, node.codeLocation.end.line];
		}
		
		return [null, null];
	}
	
	/**
	 * Ensures a file path is absolute
	 */
	private static ensureAbsolutePath(filePath: string, projectPath: string): string {
		// Check for absolute paths on any platform
		// This covers Windows drive letters (C:\) and UNC paths (\\server)
		if (path.isAbsolute(filePath)) {
			return filePath;
		}
		
		// For relative paths, join with the project path
		return vscode.Uri.joinPath(
			vscode.Uri.file(projectPath), 
			filePath
		).fsPath;
	}
} 