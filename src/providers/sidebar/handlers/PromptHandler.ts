import * as vscode from "vscode";
import { PromptGenerator } from "../PromptGenerator";
import { GeneratePromptRequest } from "../types";

/**
 * Handles prompt generation functionality
 */
export class PromptHandler {
    constructor(
        private bevelClient: any,
        private outputChannel?: vscode.OutputChannel
    ) {}

    /**
     * Generates a prompt based on the request
     */
    public async generatePrompt(data: GeneratePromptRequest): Promise<string> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                throw new Error('No workspace folder found');
            }
            
            const projectPath = workspaceFolders[0].uri.fsPath;
            
            if (!this.bevelClient) {
                throw new Error('Bevel client not initialized');
            }
            
            // Use the PromptGenerator to generate the prompt
            const prompt = await PromptGenerator.generatePrompt(
                data,
                projectPath,
                this.bevelClient
            );
            
            return prompt;
        } catch (error) {
            console.error('[PromptHandler] Error in generatePrompt handler:', error);
            throw error;
        }
    }
} 