import { WebviewCommunicationInterface } from "../domain/WebviewCommunicationInterface";
import { WebviewMessage, WebviewServerRequest, WebviewServerResponse } from "../domain/WebviewMessage";
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';

export class WebviewCommunication implements WebviewCommunicationInterface {
	private endpointCleanups: Map<string, () => void> = new Map();
	private pendingRequests: Map<string, { resolve: Function, reject: Function, timeout: NodeJS.Timeout }> = new Map();
	private registeredHandlers: Map<string, (message: any) => Promise<any>> = new Map();
	private messageListeners: Map<string, Array<(message: WebviewMessage) => void>> = new Map();
	private disposables: vscode.Disposable[] = [];

    constructor(private readonly webview: vscode.Webview) {
		console.log('[WebviewCommunication] Constructor called');
		
		// Set up a single global message listener
		const messageHandler = this.webview.onDidReceiveMessage((message) => {
			console.log(`[WebviewCommunication] Received message: ${message?.type}`, message);
			
			// Handle server responses for the request/response pattern
			if (message.type === 'serverResponse' && this.pendingRequests.has(message.serverRequestId)) {
				console.log(`[WebviewCommunication] Processing serverResponse for ID: ${message.serverRequestId}`);
				const { resolve, timeout } = this.pendingRequests.get(message.serverRequestId)!;
				clearTimeout(timeout);
				resolve(message.serverResponse);
				this.pendingRequests.delete(message.serverRequestId);
				console.log(`[WebviewCommunication] Resolved request ${message.serverRequestId}`);
			}
			
			// Handle server requests that have registered handlers
			else if (message.type === 'serverRequest') {
				const request = message as WebviewServerRequest<any>;
				console.log(`[WebviewCommunication] Processing serverRequest for endpoint: ${request.serverEndpoint}, ID: ${request.serverRequestId}`);
				
				const handler = this.registeredHandlers.get(request.serverEndpoint);
				if (handler) {
					console.log(`[WebviewCommunication] Found handler for ${request.serverEndpoint}, executing...`);
					
					// Execute the handler
					handler(request.serverRequest)
						.then(response => {
							console.log(`[WebviewCommunication] Handler for ${request.serverEndpoint} completed successfully`);
							const responseMessage: WebviewServerResponse<any> = {
								type: "serverResponse", 
								serverRequestId: request.serverRequestId, 
								serverResponse: response 
							};
							console.log(`[WebviewCommunication] Sending response for request ${request.serverRequestId}`, responseMessage);
							this.webview.postMessage(responseMessage);
							console.log(`[WebviewCommunication] Response sent for request ${request.serverRequestId}`);
						})
						.catch(error => {
							console.error(`[WebviewCommunication] Error in handler for ${request.serverEndpoint}:`, error);
							const errorResponseMessage: WebviewServerResponse<any> = {
								type: "serverResponse",
								serverRequestId: request.serverRequestId,
								serverResponse: { error: error instanceof Error ? error.message : String(error) }
							};
							this.webview.postMessage(errorResponseMessage);
							console.log(`[WebviewCommunication] Error response sent for request ${request.serverRequestId}`);
						});
				} else {
					console.warn(`[WebviewCommunication] No handler found for endpoint: ${request.serverEndpoint}`);
				}
			}
			
			// Handle other message types with registered listeners
			if (this.messageListeners.has(message.type)) {
				const listeners = this.messageListeners.get(message.type)!;
				listeners.forEach(listener => {
					try {
						listener(message);
					} catch (error) {
						console.error(`[WebviewCommunication] Error in message listener for type ${message.type}:`, error);
					}
				});
			}
		});
		
		this.disposables.push(messageHandler);
		console.log('[WebviewCommunication] Global message handler registered');
    }

	public dispose() {
		this.disposables.forEach(d => d.dispose());
		this.disposables = [];
		console.log('[WebviewCommunication] Disposed all resources');
	}
    
    public sendMessage(message: WebviewMessage) {
		console.log(`[WebviewCommunication] Sending message type: ${message.type}`);
        this.webview.postMessage(message);
	}

	public sendRequest<REQUEST_TYPE, RESPONSE_TYPE>(endpointName: string, message: REQUEST_TYPE, options?: { timeout?: number }): Promise<RESPONSE_TYPE> {
		const requestId = uuidv4();
		const timeoutMs = options?.timeout ?? 10000; // Default 10 second timeout
		
		console.log(`[WebviewCommunication] Creating request for ${endpointName} with ID ${requestId}`);
		
		const serverRequest: WebviewServerRequest<REQUEST_TYPE> = {
			type: "serverRequest",
			serverRequest: message,
			serverRequestId: requestId,
			serverEndpoint: endpointName
		};
		
		return new Promise((resolve, reject) => {
			// Create timeout function
			const timeoutId = setTimeout(() => {
				if (this.pendingRequests.has(requestId)) {
					this.pendingRequests.delete(requestId);
					console.log(`[WebviewCommunication] Request ${requestId} timed out after ${timeoutMs/1000} seconds.`);
					reject(new Error(`Request ${requestId} timed out after ${timeoutMs/1000} seconds.`));
				}
			}, timeoutMs);

			// Store request in pending requests map
			this.pendingRequests.set(requestId, {
				resolve,
				reject,
				timeout: timeoutId
			});

			// Send the request
			this.sendMessage(serverRequest);
			console.log(`[WebviewCommunication] Sent request ${requestId} to ${endpointName}`);
		});
	}

	public registerMessageListener(messageType: string, listener: (message: WebviewMessage) => void): () => void {
		console.log(`[WebviewCommunication] Registering message listener for type: ${messageType}`);
		
		if (!this.messageListeners.has(messageType)) {
			this.messageListeners.set(messageType, []);
		}
		
		const listeners = this.messageListeners.get(messageType)!;
		listeners.push(listener);
		
		// Return a cleanup function
		return () => {
			const index = listeners.indexOf(listener);
			if (index !== -1) {
				listeners.splice(index, 1);
				console.log(`[WebviewCommunication] Removed message listener for type: ${messageType}`);
			}
		};
	}

	public registerRequestHandler<REQUEST_TYPE, RESPONSE_TYPE>(endpointName: string, listener: (message: REQUEST_TYPE) => Promise<RESPONSE_TYPE>): void {
		console.log(`[WebviewCommunication] Registering request handler for endpoint: ${endpointName}`);
		
		// Store the handler
		this.registeredHandlers.set(endpointName, listener);
		console.log(`[WebviewCommunication] Successfully registered handler for ${endpointName}`);
		
		// Set up cleanup function
		const cleanup = () => {
			this.registeredHandlers.delete(endpointName);
			console.log(`[WebviewCommunication] Unregistered handler for ${endpointName}`);
		};
		
		if (this.endpointCleanups.has(endpointName)) {
			console.log(`[WebviewCommunication] Found existing handler for ${endpointName}, removing it first`);
			this.endpointCleanups.get(endpointName)!();
		}
		
		this.endpointCleanups.set(endpointName, cleanup);
	}

	public unregisterRequestHandler(endpointName: string): void {
		console.log(`[WebviewCommunication] Unregistering request handler for endpoint: ${endpointName}`);
		if (this.endpointCleanups.has(endpointName)) {
			this.endpointCleanups.get(endpointName)!();
			this.endpointCleanups.delete(endpointName);
			console.log(`[WebviewCommunication] Successfully unregistered handler for ${endpointName}`);
		} else {
			console.log(`[WebviewCommunication] No handler found for ${endpointName}`);
		}
	}
}