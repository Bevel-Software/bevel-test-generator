import * as vscode from "vscode";
import { getUri } from "../../utils/getUri";
import { getNonce } from "../../utils/getNonce";

/**
 * Generates HTML for webviews
 */
export class WebviewHtmlGenerator {
	/**
	 * Generates HTML content for the webview
	 */
	public static generateHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
		const stylesUri = getUri(webview, extensionUri, ["sidebar", "build", "static", "css", "main.css"]);
		const scriptUri = getUri(webview, extensionUri, ["sidebar", "build", "static", "js", "main.js"]);
		const codiconsUri = getUri(webview, extensionUri, [
			"node_modules",
			"@vscode",
			"codicons",
			"dist",
			"codicon.css",
		]);
		
		const nonce = getNonce();
		
		return /*html*/ `
		<!DOCTYPE html>
		<html lang="en">
		  <head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
			<meta name="theme-color" content="#000000">
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}'; connect-src http://localhost:1645;">
			<link rel="stylesheet" type="text/css" href="${stylesUri}">
			<link href="${codiconsUri}" rel="stylesheet" />
			<title>Bevel_Chat</title>
			<style nonce="${nonce}">
			  /* Ensure webview fits seamlessly in container */
			  html, body {
				margin: 0;
				padding: 0;
				height: 100%;
				width: 100%;
				overflow: hidden;
				background-color: var(--vscode-sideBar-background);
				color: var(--vscode-foreground);
			  }
			  body {
				overflow-y: auto;
			  }
			  #root {
				height: 100%;
			  }
			</style>
		  </head>
		  <body>
			<noscript>You need to enable JavaScript to run this app.</noscript>
			<div id="root"></div>
			<script nonce="${nonce}" src="${scriptUri}"></script>
		  </body>
		</html>
	  `;
	}
} 