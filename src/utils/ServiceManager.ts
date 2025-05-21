import { Disposable } from "vscode";
import { BevelCodeLensProvider } from "../providers/BevelCodeLensProvider";
import { ExtensionContext } from "vscode";
import { SidebarProvider } from "../providers/sidebar/SidebarProvider";
import { TabWebviewProvider } from "../providers/TabWebviewProvider";
import { Logger } from "./Logger";
import { BevelClient } from "@bevel-software/bevel-ts-client";

class ServiceManager implements Disposable {
    private static instance: ServiceManager | null = null;

    public static getInstance(): ServiceManager {
        if (!ServiceManager.instance) {
            ServiceManager.instance = new ServiceManager();
        }
        return ServiceManager.instance;
    }

    dispose() {
        ServiceManager.instance = null
    }

    public codeLensProvider: BevelCodeLensProvider | null = null;
    public bevelContext: ExtensionContext | null = null;
    public sidebarProvider: SidebarProvider | null = null;
    public activeTabs: Set<TabWebviewProvider> = new Set();
    public logger: Logger | null = null;
    public bevelClient: BevelClient = new BevelClient();
    public isBevelConnected: boolean = false;
}

export const serviceManager = new ServiceManager();