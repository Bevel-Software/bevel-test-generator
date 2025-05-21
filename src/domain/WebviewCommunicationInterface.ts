import { WebviewMessage, WebviewServerRequest } from "./WebviewMessage";

export interface WebviewCommunicationInterface {
	// Send messages to registered listeners
    sendMessage(message: WebviewMessage): void

	// Send a request to a registered handler and wait for a response
	sendRequest<REQUEST_TYPE, RESPONSE_TYPE>(endpointName: string, message: REQUEST_TYPE, options?: { timeout?: number }): Promise<RESPONSE_TYPE>
    
	// Register a listener for a specific message type
	registerMessageListener(messageType: string, listener: (message: WebviewMessage) => void): () => void

	// Register an endpoint for a specific request type
	registerRequestHandler<REQUEST_TYPE, RESPONSE_TYPE>(endpointName: string, listener: (message: REQUEST_TYPE) => Promise<RESPONSE_TYPE>): void

	unregisterRequestHandler(endpointName: string): void
}