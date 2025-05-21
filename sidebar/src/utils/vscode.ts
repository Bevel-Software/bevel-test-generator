import { WebviewMessage, WebviewServerRequest, WebviewServerResponse } from "../../../src/domain/WebviewMessage"
import { WebviewCommunicationInterface } from "../../../src/domain/WebviewCommunicationInterface"
import type { WebviewApi } from "vscode-webview"
import { v4 as uuidv4 } from 'uuid';

/**
 * A utility wrapper around the acquireVsCodeApi() function, which enables
 * message passing and state management between the webview and extension
 * contexts.
 *
 * This utility also enables webview code to be run in a web browser-based
 * dev server by using native web browser features that mock the functionality
 * enabled by acquireVsCodeApi.
 */
class VSCodeAPIWrapper implements WebviewCommunicationInterface {
	private readonly vsCodeApi: WebviewApi<unknown> | undefined
	private endpointCleanups: Map<string, () => void> = new Map()

	constructor() {
		// Check if the acquireVsCodeApi function exists in the current development
		// context (i.e. VS Code development window or web browser)
		if (typeof acquireVsCodeApi === "function") {
			this.vsCodeApi = acquireVsCodeApi()
		}
	}

	/**
	 * Post a message (i.e. send arbitrary data) to the owner of the webview.
	 *
	 * @remarks When running webview code inside a web browser, postMessage will instead
	 * log the given message to the console.
	 *
	 * @param message Abitrary data (must be JSON serializable) to send to the extension context.
	 */
	public sendMessage(message: WebviewMessage) {
		if (this.vsCodeApi) {
			this.vsCodeApi.postMessage(message)
		} else {
			console.log(message)
		}
	}

	/**
	 * Sends a message to the VSCode extension
	 * 
	 * @param message Message to send to the extension
	 * @returns true if message was sent successfully, false otherwise
	 */
	public postMessageToExtension(message: any): boolean {
		if (!this.vsCodeApi) {
			console.error('[VSCode API] Cannot send message: vscode API not available');
			return false;
		}
		
		try {
			this.vsCodeApi.postMessage(message);
			return true;
		} catch (err) {
			console.error('[VSCode API] Error sending message:', err);
			return false;
		}
	}

	public sendRequest<REQUEST_TYPE, RESPONSE_TYPE>(endpointName: string, message: REQUEST_TYPE, options?: { timeout?: number }): Promise<RESPONSE_TYPE> {
		const requestId = uuidv4()
		const serverRequest: WebviewServerRequest<REQUEST_TYPE> = {
			type: "serverRequest",
			serverRequest: message,
			serverRequestId: requestId,
			serverEndpoint: endpointName
		}
		return new Promise((resolve, reject) => {
			const remover = this.registerMessageListener("serverResponse", (r) => {
				const response: WebviewServerResponse<RESPONSE_TYPE> = r as WebviewServerResponse<RESPONSE_TYPE>
				if(response.type === "serverResponse" && response.serverRequestId === requestId) {
					remover()
					resolve(response.serverResponse)
				}
			})
			setTimeout(() => {
				remover()
				reject(new Error(`Request ${requestId} timed out after ${(options?.timeout ?? 10000)/1000} seconds.`))
			}, options?.timeout ?? 10000)
			this.sendMessage(serverRequest)
		})
	}

	public registerMessageListener(messageType: string, listener: (message: WebviewMessage) => void): () => void {
		const handler = (event: MessageEvent) => {
		  if (event.data && event.data.type === messageType) {
			listener(event.data);
		  }
		};
		
		window.addEventListener('message', handler);
		
		// Return a cleanup function
		return () => {
		  window.removeEventListener('message', handler);
		};
	}

	public registerRequestHandler<REQUEST_TYPE, RESPONSE_TYPE>(endpointName: string, listener: (message: REQUEST_TYPE) => Promise<RESPONSE_TYPE>): void {
		const handler = async (event: MessageEvent) => {
			const receivedMessage: WebviewMessage = event.data
			if(receivedMessage && receivedMessage.type === "serverRequest") {
				const request: WebviewServerRequest<REQUEST_TYPE> = receivedMessage as WebviewServerRequest<REQUEST_TYPE>
				if (request.serverEndpoint === endpointName) {
					const response = await listener(event.data)
					const responseMessage: WebviewServerResponse<RESPONSE_TYPE> = {
						type: "serverResponse", 
						serverRequestId: request.serverRequestId, 
						serverResponse: response 
					}
					this.sendMessage(responseMessage);
				}
			}
		}
		
		window.addEventListener('message', handler);
		
		// Cleanup function
		const remover = () => {
			this.endpointCleanups.delete(endpointName)
			window.removeEventListener('message', handler);
		}
		if(this.endpointCleanups.has(endpointName)) {
			this.endpointCleanups.get(endpointName)!()
		}
		this.endpointCleanups.set(endpointName, remover);
	}

	public unregisterRequestHandler(endpointName: string): void {
		if(this.endpointCleanups.has(endpointName)) {
			this.endpointCleanups.get(endpointName)!()
			this.endpointCleanups.delete(endpointName);
		}
	}

	/**
	 * Get the persistent state stored for this webview.
	 *
	 * @remarks When running webview source code inside a web browser, getState will retrieve state
	 * from local storage (https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).
	 *
	 * @return The current state or `undefined` if no state has been set.
	 */
	public getState(): unknown | undefined {
		if (this.vsCodeApi) {
			return this.vsCodeApi.getState()
		} else {
			const state = localStorage.getItem("vscodeState")
			return state ? JSON.parse(state) : undefined
		}
	}

	/**
	 * Set the persistent state stored for this webview.
	 *
	 * @remarks When running webview source code inside a web browser, setState will set the given
	 * state using local storage (https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).
	 *
	 * @param newState New persisted state. This must be a JSON serializable object. Can be retrieved
	 * using {@link getState}.
	 *
	 * @return The new state.
	 */
	public setState<T extends unknown | undefined>(newState: T): T {
		if (this.vsCodeApi) {
			return this.vsCodeApi.setState(newState)
		} else {
			localStorage.setItem("vscodeState", JSON.stringify(newState))
			return newState
		}
	}
}

// Exports class singleton to prevent multiple invocations of acquireVsCodeApi.
export const vscode = new VSCodeAPIWrapper()

/**
 * Helper function to send a message to the VSCode extension
 * 
 * @param message Message to send to the extension
 * @returns true if message was sent successfully, false otherwise
 */
export function postMessageToExtension(message: any): boolean {
	return vscode.postMessageToExtension(message);
}

// Export the singleton instance as default
export default vscode;
