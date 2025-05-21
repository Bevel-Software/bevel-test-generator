import * as path from 'path';

export class BevelFilesPathResolver {
    private constructor() {}

    public static baseFolderPath(projectPath: string): string {
        return path.join(projectPath, '.bevel');
    }

    public static privateFolderPath(projectPath: string): string {
        return path.join(projectPath, '.bevel', 'do_not_share');
    }

    public static publicFolderPath(projectPath: string): string {
        return path.join(projectPath, '.bevel', 'shareable');
    }

    public static bevelEnvFilePath(projectPath: string): string {
        return path.join(projectPath, '.bevel', 'do_not_share', '.env');
    }

    public static bevelPortFilePath(projectPath: string): string {
        return path.join(projectPath, '.bevel', 'do_not_share', 'port');
    }

    public static bevelMcpServerPath(projectPath: string): string {
        return path.join(projectPath, '.bevel', 'do_not_share', 'bevel-mcp.js');
    }

    public static bevelConfigFilePath(projectPath: string): string {
        return path.join(projectPath, '.bevel', 'shareable', 'config.json');
    }

    public static bevelExtensionConfigPath(projectPath: string): string {
        return path.join(projectPath, '.bevel', 'shareable', 'allowedFileExtensions.json');
    }

    public static bevelRequirementsFilePath(projectPath: string): string {
        return path.join(projectPath, '.bevel', 'shareable', 'requirements.breq');
    }

    public static bevelIgnoreFilePath(projectPath: string): string {
        return path.join(projectPath, '.bevel', 'shareable', '.bevelignore');
    }

    public static bevelManualRequirementsFilePath(projectPath: string): string {
        return path.join(projectPath, '.bevel', 'shareable', 'manualRequirements.json');
    }

    public static bevelDatabasePath(projectPath: string): string {
        return path.join(projectPath, '.bevel', 'do_not_share', 'bevel.db');
    }
}
