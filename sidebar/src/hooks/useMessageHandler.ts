import { useEffect } from 'react';
import { BevelNodeDetails } from '../types';
import { postMessageToExtension } from '../utils/vscode';

/**
 * Hook to handle message communication with the VS Code extension
 */
export function useMessageHandler(
  setDisplayedNodeDetails: (details: BevelNodeDetails | null) => void,
  setDependencies: (deps: any[]) => void,
  setIsLoadingDependencies: (loading: boolean) => void,
  setDependenciesError: (error: string | null) => void,
  setSearchResults: (results: any[]) => void,
  setIsSearching: (searching: boolean) => void,
  setReceivedResponse: (response: string | null) => void,
  setGeneratePromptStatus: (status: string | null) => void,
  requestDependenciesForNode: (nodeDetails: BevelNodeDetails) => void,
  addParentNodeFromTypeInfo: (parentNodeInfo: any) => void,
  setIsBevelConnected: (isConnected: boolean) => void,
  setIsProjectAnalyzed: (isAnalyzed: boolean | null) => void,
  setTargetFunctionSearchResults?: (results: any[]) => void,
  setIsTargetFunctionSearching?: (searching: boolean) => void
) {
  useEffect(() => {
    console.log('[Sidebar App] Setting up message handlers');

    // Let's expose a global handler for debugging
    const globalMessageHandler = (event: MessageEvent) => {
      console.log('[Sidebar App] (Global Handler) Message received:', event.data);
    };

    // Add global message handler for debugging
    window.addEventListener('message', globalMessageHandler);

    // Use the extension's API to get initial state
    try {
      postMessageToExtension({
        type: 'checkBevelConnection'
      });
    } catch (e) {
      console.error('[Sidebar App] Error checking Bevel connection:', e);
    }

    const handleMessage = (event: MessageEvent) => {
      const message = event.data; 
      console.log('[Sidebar App] Received message from extension:', message);

      if (message.type === 'bevelConnectionStatus') {
        console.log(`[Sidebar App] Bevel connection status changed: ${message.isConnected ? 'Connected' : 'Not connected'}`);
        setIsBevelConnected(message.isConnected);
        
        // Reset project analyzed status if server disconnected
        if (!message.isConnected) {
          setIsProjectAnalyzed(null);
        }
      } else if (message.type === 'bevelProjectStatus') {
        console.log(`[Sidebar App] Bevel project status changed: ${message.isAnalyzed ? 'Analyzed' : 'Not analyzed'}`);
        setIsProjectAnalyzed(message.isAnalyzed);
      } else if (message.type === 'serverRequest' && message.serverEndpoint === 'sidebar:displayBevelNode') {
        console.log('[Sidebar App] Matched serverRequest for sidebar:displayBevelNode. Payload:', message.serverRequest);
        console.log('[Sidebar App] DEBUG - Node details with line info:', JSON.stringify({
          nodeId: message.serverRequest.nodeId,
          functionName: message.serverRequest.functionName,
          filePath: message.serverRequest.filePath,
          startLine: message.serverRequest.startLine,
          endLine: message.serverRequest.endLine,
          hasStartLine: message.serverRequest.startLine !== undefined,
          hasEndLine: message.serverRequest.endLine !== undefined
        }));
        setDisplayedNodeDetails(message.serverRequest as BevelNodeDetails);
        
        // Reset dependencies when a new node is selected
        setDependencies([]);
        setDependenciesError(null);

        try {
          // Send the response back to the extension
          postMessageToExtension({
            type: 'serverResponse',
            serverRequestId: message.serverRequestId,
            serverResponse: {} // Empty object for void response
          });
          console.log('[Sidebar App] serverResponse sent successfully for ID:', message.serverRequestId);
          
          // Now request dependencies for this node
          requestDependenciesForNode(message.serverRequest as BevelNodeDetails);
        } catch (e) {
          console.error('[Sidebar App] Error calling postMessageToExtension:', e);
        }
      } else if (message.type === 'bevelNodeDetailsForDisplay') {
        console.log('[Sidebar App] Matched (legacy?) bevelNodeDetailsForDisplay. Payload:', message.payload);
        setDisplayedNodeDetails(message.payload as BevelNodeDetails);
        
        // Reset dependencies when a new node is selected
        setDependencies([]);
        setDependenciesError(null);
        
        // Request dependencies for this node
        requestDependenciesForNode(message.payload as BevelNodeDetails);
      } else if (message.type === 'functionDependencies') {
        console.log('[Sidebar App] Received function dependencies:', message.dependencies);
        
        // Send raw dependencies to the grouping function in App.tsx
        const rawDependencies = message.dependencies.map((dep: any) => {
          return {
            ...dep,
            implementation: dep.implementation || 'Use Real One'
          };
        });
        
        console.log('[Sidebar App] Processed raw dependencies:', rawDependencies);
        setDependencies(rawDependencies);
        setIsLoadingDependencies(false);
      } else if (message.type === 'functionDependenciesError') {
        console.error('[Sidebar App] Error getting dependencies:', message.error);
        setDependenciesError(message.error);
        setIsLoadingDependencies(false);
      } else if (message.type === 'subgraphSearchResults') {
        console.log('[Sidebar App] Received subgraph search results:', message.results);
        // Update both dependency search and target function search results
        setSearchResults(message.results || []);
        setIsSearching(false);
        
        // If target function search handlers are provided, update those too
        if (setTargetFunctionSearchResults) {
          setTargetFunctionSearchResults(message.results || []);
        }
        if (setIsTargetFunctionSearching) {
          setIsTargetFunctionSearching(false);
        }
      } else if (message.type === 'parentNodeTypeInfo') {
        console.log('[Sidebar App] Received parent node type info:', message.nodeInfo);
        
        // If the node info exists and it's a Class type, add it as a parent node
        if (message.nodeInfo && message.nodeInfo.type === 'Class') {
          console.log('[Sidebar App] Adding parent Class node:', message.nodeInfo);
          addParentNodeFromTypeInfo(message.nodeInfo);
        } else {
          console.log('[Sidebar App] Not adding parent node, either null or not a Class type');
          if (message.error) {
            console.error('[Sidebar App] Error getting parent node info:', message.error);
          }
        }
      } else if (message.type === 'testGenerationResponse') {
        console.log('[Sidebar App] Received test generation response:', message.response);
        setReceivedResponse(message.response);
        setGeneratePromptStatus(null);
      } else {
        console.log('[Sidebar App] Received unhandled message type:', message.type);
      }
    };

    window.addEventListener('message', handleMessage);
    console.log('[Sidebar App] Event listeners added.');

    return () => {
      window.removeEventListener('message', globalMessageHandler);
      window.removeEventListener('message', handleMessage);
      console.log('[Sidebar App] Event listeners removed.');
    };
  }, [
    setDisplayedNodeDetails, 
    setDependencies, 
    setIsLoadingDependencies, 
    setDependenciesError,
    setSearchResults,
    setIsSearching,
    setReceivedResponse,
    setGeneratePromptStatus,
    requestDependenciesForNode,
    addParentNodeFromTypeInfo,
    setIsBevelConnected,
    setIsProjectAnalyzed,
    setTargetFunctionSearchResults,
    setIsTargetFunctionSearching
  ]); 
} 