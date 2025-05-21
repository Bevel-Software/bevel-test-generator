import { BevelNodeDetails, DependencyNode } from '../types';
import vscode, { postMessageToExtension } from './vscode';

interface GeneratePromptParams {
  nodeDetails: BevelNodeDetails;
  dependencies: DependencyNode[];
  additionalInstructions: string;
  testFilePath: string;
  framework: string;
}

interface GeneratePromptOptions {
  onStatusChange: (status: string) => void;
  onResponseReceived: (response: string) => void;
  getCurrentStatus: () => string | null;
}

/**
 * Sends a request to generate a test prompt and handles the response
 */
export function generatePrompt(
  params: GeneratePromptParams,
  options: GeneratePromptOptions
): void {
  const { nodeDetails, dependencies, additionalInstructions, testFilePath, framework } = params;
  const { onStatusChange, onResponseReceived, getCurrentStatus } = options;
  
  if (!vscode) {
    onStatusChange("Error: VSCode API is not available");
    alert('VSCode API is not available.');
    return;
  }
  
  // Debug logs for framework and testFilePath
  console.log('DEBUG-Framework: Framework selected:', framework);
  console.log('DEBUG-TestPath: Test file path entered:', testFilePath);

  onStatusChange("Button clicked, preparing request...");
  
  try {
    // Generate a unique request ID
    const requestId = Math.random().toString(36).substr(2, 9);
    console.log('DEBUG-1: Starting to construct request with ID:', requestId);
    onStatusChange("Creating request with ID: " + requestId);
    
    // Create the request with explicit serverEndpoint
    const request = {
      type: 'serverRequest',
      serverRequestId: requestId,
      serverEndpoint: 'sidebar:generatePrompt',
      serverRequest: { 
        nodeDetails, 
        dependencies, 
        additionalInstructions,
        testFilePath,
        framework
      }
    };
    
    console.log('DEBUG-2: Request payload created:', JSON.stringify(request));
    onStatusChange("Request payload created, sending...");
    
    // Listen specifically for response to this request
    const specificHandler = (event: MessageEvent) => {
      console.log('DEBUG-3: Received message while waiting for response:', event.data);
      
      if (event.data && event.data.type === 'serverResponse' && event.data.serverRequestId === requestId) {
        console.log('DEBUG-4: Matched response for our request!', event.data);
        window.removeEventListener('message', specificHandler);
        console.log('DEBUG-4.1: Removed specific handler after receiving response');
        
        if (event.data.serverResponse && event.data.serverResponse.prompt) {
          console.log('DEBUG-5: Got prompt:', event.data.serverResponse.prompt.substring(0, 100) + '...');
          onStatusChange("Received prompt response!");
          onResponseReceived(event.data.serverResponse.prompt);
          
          try {
            navigator.clipboard.writeText(event.data.serverResponse.prompt);
            console.log('DEBUG-5.1: Copied prompt to clipboard');
            onStatusChange("Prompt copied to clipboard!");
          } catch (clipErr) {
            console.error('DEBUG-6: Error copying to clipboard:', clipErr);
            onStatusChange("Error copying to clipboard");
          }
        } else if (event.data.serverResponse && event.data.serverResponse.error) {
          console.error('DEBUG-5.2: Received error response:', event.data.serverResponse.error);
          onStatusChange("Error: " + event.data.serverResponse.error);
        } else {
          console.warn('DEBUG-5.3: Received response with unexpected format:', event.data.serverResponse);
          onStatusChange("Received response with unexpected format");
        }
      }
    };
    
    // Add listener for this specific response
    window.addEventListener('message', specificHandler);
    console.log('DEBUG-7: Added specific response listener');
    
    // Send directly with postMessage
    console.log('DEBUG-8: About to call vscode.postMessage...');
    const messageSent = postMessageToExtension(request);
    
    if (messageSent) {
      console.log('DEBUG-9: vscode.postMessage called successfully');
      onStatusChange("Request sent, waiting for response...");
      
      // Set timeout to clean up listener if no response
      setTimeout(() => {
        const currentStatus = getCurrentStatus();
        if (currentStatus === "Request sent, waiting for response...") {
          console.warn('DEBUG-10: No response received after timeout period');
          onStatusChange("No response received after 10 seconds - check console logs");
          window.removeEventListener('message', specificHandler);
          console.log('DEBUG-10: Removed response listener after timeout');
        }
      }, 10000);
    } else {
      onStatusChange("Error: Failed to send message to extension");
      window.removeEventListener('message', specificHandler);
    }
    
  } catch (err) {
    console.error('DEBUG-ERROR: Error in request process:', err);
    onStatusChange("Error: " + (err instanceof Error ? err.message : String(err)));
    alert('Failed to send request: ' + (err instanceof Error ? err.message : String(err)));
  }
} 