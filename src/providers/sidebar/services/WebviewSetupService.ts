import * as vscode from "vscode";
import { WebviewHtmlGenerator } from "../WebviewHtmlGenerator";

/**
 * Service for setting up and configuring webviews
 */
export class WebviewSetupService {
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly outputChannel?: vscode.OutputChannel
    ) {}

    /**
     * Sets up a webview with appropriate options and HTML content
     */
    public setupWebview(webviewView: vscode.WebviewView | vscode.WebviewPanel): void {
        this.outputChannel?.appendLine("[WebviewSetupService] Setting up webview");
        
        // Configure webview options
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri],
        };
        
        // Customize appearance for sidebar view
        this.customizeSidebarAppearance(webviewView);
        
        // Set HTML content
        webviewView.webview.html = WebviewHtmlGenerator.generateHtml(
            webviewView.webview, 
            this.context.extensionUri
        );
    }

    /**
     * Customizes the appearance of the sidebar
     */
    private customizeSidebarAppearance(webviewView: vscode.WebviewView | vscode.WebviewPanel): void {
        if ('onDidChangeVisibility' in webviewView) {
            // Remove default padding around the webview
            (webviewView as vscode.WebviewView).description = "Bevel Sidebar";
            
            // Apply custom styles by setting specific properties directly on the webview element
            if ((webviewView as any).webviewElement) {
                try {
                    (webviewView as any).webviewElement.style.padding = '0';
                } catch (e) {
                    // Ignore errors - this is using internal APIs
                    console.log("[WebviewSetupService] Error setting webview element style:", e);
                }
            }
        }
    }
} 