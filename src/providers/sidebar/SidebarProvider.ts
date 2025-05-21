import * as vscode from "vscode";
import { serviceManager } from "../../utils/ServiceManager";
import { WebviewCommunication } from "../../webview-communication/WebviewCommunication";
import { NodeCodeExtractor } from "./NodeCodeExtractor";
import { 
    DisplayNodePayload, 
    GeneratePromptRequest 
} from "./types";
import { WebviewSetupService } from "./services/WebviewSetupService";
import { MessageRouter } from "./services/MessageRouter";
import { DependencyHandler } from "./handlers/DependencyHandler";
import { HighlightHandler } from "./handlers/HighlightHandler";
import { NodeHandler } from "./handlers/NodeHandler";
import { SearchHandler } from "./handlers/SearchHandler";
import { ConnectionHandler } from "./handlers/ConnectionHandler";
import { PromptHandler } from "./handlers/PromptHandler";

/**
 * Provides the sidebar webview functionality
 */
export class SidebarProvider implements vscode.WebviewViewProvider {
	public static readonly sidebarId = "bevel-test-generator.sidebar";
	private disposables: vscode.Disposable[] = [];
	public view?: vscode.WebviewView | vscode.WebviewPanel;
	public communicationInterface?: WebviewCommunication;

	// Services and handlers - use definite assignment assertion (!)
	private webviewSetupService!: WebviewSetupService;
	private messageRouter!: MessageRouter;
	private dependencyHandler!: DependencyHandler;
	private highlightHandler!: HighlightHandler;
	private nodeHandler!: NodeHandler;
	private searchHandler!: SearchHandler;
	private connectionHandler!: ConnectionHandler;
	private promptHandler!: PromptHandler;

	constructor(
		readonly context: vscode.ExtensionContext,
		private readonly outputChannel?: vscode.OutputChannel,
	) {
		this.outputChannel?.appendLine("SidebarProvider constructor called");
		
		// Set this instance in the service manager
		serviceManager.sidebarProvider = this;
		
		// Initialize services and handlers
		this.initializeServices();
	}

	/**
	 * Initialize all services and handlers
	 */
	private initializeServices(): void {
		// Initialize services
		this.webviewSetupService = new WebviewSetupService(this.context, this.outputChannel);
		
		// Initialize handlers
		this.dependencyHandler = new DependencyHandler(serviceManager.bevelClient, this.outputChannel);
		this.highlightHandler = new HighlightHandler();
		this.nodeHandler = new NodeHandler(serviceManager.bevelClient, this.outputChannel);
		this.searchHandler = new SearchHandler(serviceManager.bevelClient, this.outputChannel);
		this.connectionHandler = new ConnectionHandler();
		this.promptHandler = new PromptHandler(serviceManager.bevelClient, this.outputChannel);
		
		// Initialize message router with handlers
		this.messageRouter = new MessageRouter(
			this.dependencyHandler,
			this.highlightHandler,
			this.nodeHandler,
			this.searchHandler,
			this.connectionHandler
		);
	}

	/**
	 * Sends the current Bevel connection status to the sidebar
	 */
	public sendConnectionStatus(isConnected: boolean): void {
		if (!this.view) {
			return; // No view to send message to
		}

		this.view.webview.postMessage({
			type: 'bevelConnectionStatus',
			isConnected
		});
	}

	/**
	 * Sends the current Bevel project analysis status to the sidebar
	 */
	public sendProjectStatus(isAnalyzed: boolean): void {
		if (!this.view) {
			return; // No view to send message to
		}

		this.view.webview.postMessage({
			type: 'bevelProjectStatus',
			isAnalyzed
		});
	}

	/**
	 * Gets code for a node
	 */
	public async getNodeCode(node: any, projectPath: string): Promise<string> {
		return NodeCodeExtractor.getNodeCode(node, projectPath);
	}

	/**
	 * Disposes of resources
	 */
	async dispose(): Promise<void> {
		this.outputChannel?.appendLine("Disposing SidebarProvider...");
		
		if (this.view && "dispose" in this.view) {
			this.view.dispose();
			this.outputChannel?.appendLine("Disposed webview");
		}
		
		// Dispose of the highlight handler
		this.highlightHandler.dispose();
		
		// Dispose of all disposables
		while (this.disposables.length) {
			const x = this.disposables.pop();
			if (x) {
				x.dispose();
			}
		}
		
		if (serviceManager.sidebarProvider === this) {
			serviceManager.sidebarProvider = null;
		}
	}

	/**
	 * Resolves the webview view
	 */
	resolveWebviewView(
		webviewView: vscode.WebviewView | vscode.WebviewPanel
	): void | Thenable<void> {
		this.outputChannel?.appendLine("resolveWebviewView called");
		
		this.view = webviewView;
		this.communicationInterface = new WebviewCommunication(webviewView.webview);
		
		// Set up the webview using the WebviewSetupService
		this.webviewSetupService.setupWebview(webviewView);
		
		// Set up message listeners
		this.setupMessageListeners(webviewView.webview);
		
		// Register request handlers
		this.registerRequestHandlers();
		
		// Listen for when the view is disposed
		webviewView.onDidDispose(
			async () => {
				await this.dispose();
			},
			null,
			this.disposables,
		);
		
		this.outputChannel?.appendLine("Webview view resolved");
	}

	/**
	 * Sets up message listeners for the webview
	 */
	private setupMessageListeners(webview: vscode.Webview): void {
		webview.onDidReceiveMessage(
			async (message) => {
				// Delegate to the message router
				await this.messageRouter.handleMessage(message, webview);
			},
			undefined,
			this.disposables
		);
	}

	/**
	 * Registers request handlers for the webview communication interface
	 */
	private registerRequestHandlers(): void {
		if (!this.communicationInterface) {
			this.outputChannel?.appendLine("[SidebarProvider] Error: communicationInterface not initialized");
			return;
		}
		
		// Register handler for displaying Bevel node details
		this.communicationInterface.registerRequestHandler<DisplayNodePayload, void>(
			'sidebar:displayBevelNode',
			async (data: DisplayNodePayload) => {
				this.outputChannel?.appendLine(
					`[SidebarProvider] Received request to display node: ${data.functionName} (ID: ${data.nodeId})`
				);
				
				// Post message to the React frontend
				this.view?.webview.postMessage({
					type: 'bevelNodeDetailsForDisplay',
					payload: data
				});
				
				return Promise.resolve();
			}
		);
		
		// Register handler for generating prompt
		this.communicationInterface.registerRequestHandler<GeneratePromptRequest, { prompt: string }>(
			'sidebar:generatePrompt',
			async (data: GeneratePromptRequest) => {
				try {
					const prompt = await this.promptHandler.generatePrompt(data);
					return { prompt };
				} catch (error) {
					console.error('[SidebarProvider] Error in generatePrompt handler:', error);
					throw error;
				}
			}
		);
	}
} 