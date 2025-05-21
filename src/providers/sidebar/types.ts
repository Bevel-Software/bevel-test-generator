import { DependencyInfo } from "../../utils/DependencyExtractor";

/**
 * Payload for displaying a node in the sidebar
 */
export interface DisplayNodePayload {
	nodeId: string;
	functionName: string;
	filePath: string;
	code?: string;
}

/**
 * Request to highlight a dependency in the editor
 */
export interface DependencyHighlightRequest {
	name?: string;
	filePath: string;
	startLine?: number;
	endLine?: number;
}

/**
 * Request to generate a prompt for a function
 */
export interface GeneratePromptRequest {
	nodeDetails: {
		functionName: string;
		filePath: string;
	};
	dependencies: DependencyInfo[];
	additionalInstructions?: string;
	testFilePath?: string;
	framework?: string;
} 