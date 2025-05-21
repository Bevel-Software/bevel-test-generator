import * as vscode from 'vscode';

export let activeHoverProvider: vscode.Disposable | undefined;
export function setActiveHoverProvider(provider: vscode.Disposable | undefined) {
    activeHoverProvider = provider;
}

export async function createHover(position: vscode.Position, content: string) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        if (activeHoverProvider) {
            activeHoverProvider.dispose();
            setActiveHoverProvider(undefined);
        }

        // Move cursor to the position and reveal it
        editor.selection = new vscode.Selection(position, position);
        await editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.InCenter
        );

        // Position the hover above the CodeLens, aligned with function
        const hoverLine = Math.max(0, position.line - 2);
        const functionIndent = editor.document.lineAt(position.line).firstNonWhitespaceCharacterIndex;
        const hoverPosition = new vscode.Position(hoverLine, functionIndent + 40);

        setActiveHoverProvider(vscode.languages.registerHoverProvider({ scheme: 'file' }, {
            async provideHover(document, pos) {
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) {
                    return new vscode.Hover('No workspace folder found');
                }

                const markdown = new vscode.MarkdownString();
                markdown.isTrusted = true;
                markdown.supportHtml = true;
                markdown.appendMarkdown(content);

                return new vscode.Hover(markdown, new vscode.Range(hoverPosition, hoverPosition));
            }
        }));

        // Show hover and then dispose the provider after a delay
        await vscode.commands.executeCommand('editor.action.showHover');
        setTimeout(() => {
            if (activeHoverProvider) {
                activeHoverProvider.dispose();
                setActiveHoverProvider(undefined);
            }
        }, 3000);
    }
}