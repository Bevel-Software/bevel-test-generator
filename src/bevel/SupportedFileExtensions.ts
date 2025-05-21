import * as vscode from 'vscode';
import { BevelFilesPathResolver } from './BevelFilesPathResolver';

class SupportedFileExtensions {
    supportedFileExtensions: {
        [key: string]: string[]
    }

    constructor(supportedFileExtensions: {[key: string]: string[]}) {
        this.supportedFileExtensions = supportedFileExtensions;
    }
}

const defaultSupportedFileEndings: string[] = [
    ".cs",
    ".ts", ".tsx",
    ".js", ".jsx",
    ".cbl", ".cobol", ".cob", ".ccp", ".cpy", ".cpb", ".cblcpy", ".mf",
    ".kt", ".kts",
    ".py",
    ".rb",
    ".java",
    ".go",
    ".rs",
    ".scala",
    ".swift",
    ".c", ".h",
    ".cpp", ".h", ".hpp",
    ".pl", ".pm", ".pod",
    ".php",
    ".pas", ".dfm", ".inc",
    ".dart",
] as const;

export async function getSupportedFileExtensions(): Promise<string[]> {
    if(!vscode.workspace.workspaceFolders) return defaultSupportedFileEndings
    const allowedFileExtensions = vscode.Uri.file(BevelFilesPathResolver.bevelExtensionConfigPath(vscode.workspace.workspaceFolders[0].uri.fsPath));
    try {
        const fileContent = await vscode.workspace.fs.readFile(allowedFileExtensions);
        const fileText = new TextDecoder().decode(fileContent);
        const extensionConfig = JSON.parse(fileText) as SupportedFileExtensions;
        return Object.values(extensionConfig.supportedFileExtensions).flatMap(ext => ext);
    } catch {
        return defaultSupportedFileEndings
    }
};