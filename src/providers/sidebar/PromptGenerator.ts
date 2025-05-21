import { DependencyInfo } from "../../utils/DependencyExtractor";
import { GeneratePromptRequest } from "./types";
import { NodeCodeExtractor } from "./NodeCodeExtractor";

/**
 * Generates characterization test prompts
 */
export class PromptGenerator {
	/**
	 * Generates a characterization test prompt
	 */
	public static async generatePrompt(
		request: GeneratePromptRequest, 
		projectPath: string,
		bevelClient: any
	): Promise<string> {
		// Get main function node and code
		const mainNode = await bevelClient.nodes.findNodeByName(
			projectPath, 
			request.nodeDetails.functionName, 
			request.nodeDetails.filePath
		);
		
		const mainCode = await NodeCodeExtractor.getNodeCode(mainNode, projectPath);
		
		// Get dependencies code
		const dependenciesCode = await this.getDependenciesCode(
			request.dependencies,
			projectPath,
			bevelClient
		);
		
		// Assemble prompt
		let prompt = `# Characterization Test Prompt\n\n`;
		
		// Function metadata section
		prompt += `## Function Details\n`;
		prompt += `- Name: ${request.nodeDetails.functionName}\n`;
		prompt += `- File: ${request.nodeDetails.filePath}\n`;

		// Add test file path if provided
		if (request.testFilePath && request.testFilePath.trim()) {
			prompt += `- Test File: ${request.testFilePath.trim()}\n`;
		}
		
		// Add framework if provided
		if (request.framework && request.framework.trim()) {
			prompt += `- Framework: ${request.framework.trim()}\n`;
		}
		
		// Main code section
		prompt += `\n## Target Function Code\n\`\`\`\n${mainCode}\n\`\`\`\n`;
		
		// Dependencies section - categorize by implementation type if possible
		const mockedDeps = request.dependencies.filter(d => d.implementation.toLowerCase().includes('mock') || d.implementation.toLowerCase().includes('stub'));
		const realDeps = request.dependencies.filter(d => !mockedDeps.includes(d));
		
		if (dependenciesCode) {
			prompt += `\n## Dependencies Source Code\n`;
			prompt += `The following dependencies are used by the target function. Consider how they interact with the main function when writing tests.\n`;
			prompt += dependenciesCode;
		}
		
		if (request.dependencies && request.dependencies.length > 0) {
			prompt += `\n## Dependencies Implementation Strategy\n`;
			
			if (mockedDeps.length > 0) {
				prompt += `\n### Mocked Dependencies:\n`;
				prompt += `Mock: Use the framework specified by user to create a lightweight mock of the dependency with fake responses\n`;
				prompt += `Fake Object: Create a simple implementation of the specified interface or class with custom behavior\n\n`;
				for (const dep of mockedDeps) {
					prompt += `- ${dep.name} (filepath: ${dep.filePath || 'unknown'}): ${dep.implementation}\n`;
				}
			}
			
			if (realDeps.length > 0) {
				prompt += `\n### Real Dependencies:\n`;
				for (const dep of realDeps) {
					prompt += `- ${dep.name} (filepath: ${dep.filePath || 'unknown'}): ${dep.implementation}\n`;
				}
			}
		}
		
		if (request.additionalInstructions && request.additionalInstructions.trim()) {
			prompt += `\n## Additional Instructions\n${request.additionalInstructions.trim()}\n`;
		}
		
		// Task section with more detailed instructions
		prompt += `\n## Test Objectives\n`;
		prompt += `1. Create characterization tests that capture the current behavior of the function without modifying it\n`;
		prompt += `2. Focus on verifying inputs and outputs, not implementation details\n`;
		prompt += `3. Use appropriate assertions and test cases to cover typical usage and edge cases\n`;
		prompt += `4. Follow the specified test framework conventions if provided\n`;
		
		prompt += `\n## Guidelines\n`;
		prompt += `- Ensure tests are isolated and repeatable\n`;
		prompt += `- Use appropriate mocking techniques for dependencies as specified\n`;
		prompt += `- Include comments explaining the purpose of each test case\n`;
		prompt += `- Structure tests to be maintainable and readable\n`;
		
		return prompt;
	}
	
	/**
	 * Gets code for all dependencies
	 */
	private static async getDependenciesCode(
		dependencies: DependencyInfo[],
		projectPath: string,
		bevelClient: any
	): Promise<string> {
		if (!Array.isArray(dependencies) || dependencies.length === 0) {
			return '';
		}
		
		let dependenciesCode = '';
		
		for (const dep of dependencies) {
			try {
				// If we have nodeId, use getNode directly, otherwise fallback to findNodeByName
				let depNode;
				if (dep.nodeId) {
					depNode = await bevelClient.nodes.getNode(projectPath, dep.nodeId);
				} else if (dep.filePath) {
					depNode = await bevelClient.nodes.findNodeByName(projectPath, dep.name, dep.filePath);
				} else {
					throw new Error(`Missing nodeId or filePath for dependency: ${dep.name}`);
				}
				
				const depCode = await NodeCodeExtractor.getNodeCode(depNode, projectPath);
				dependenciesCode += `\n### Dependency: ${dep.name} (${dep.filePath || 'unknown path'})\n\n\`\`\`\n${depCode}\n\`\`\`\n`;
			} catch (e) {
				dependenciesCode += `\n### Dependency: ${dep.name} (${dep.filePath || 'unknown path'})\n(Code not found - ${e instanceof Error ? e.message : String(e)})\n`;
			}
		}
		
		return dependenciesCode;
	}
} 