import { useState } from 'react';
import { BevelNodeDetails } from '../types';
import { postMessageToExtension } from '../utils/vscode';
import { requestDependenciesForNode } from '../utils/dependencyHelpers';

/**
 * Hook for handling target function search functionality
 */
export function useTargetFunctionSearch(setDisplayedNodeDetails: React.Dispatch<React.SetStateAction<BevelNodeDetails | null>>) {
  const [isSearchingTargetFunction, setIsSearchingTargetFunction] = useState(false);
  const [targetFunctionSearchQuery, setTargetFunctionSearchQuery] = useState("");
  const [targetFunctionSearchResults, setTargetFunctionSearchResults] = useState<any[]>([]);
  const [isTargetFunctionSearching, setIsTargetFunctionSearching] = useState(false);

  const beginTargetFunctionSearch = () => {
    setIsSearchingTargetFunction(true);
    setTargetFunctionSearchQuery("");
    setTargetFunctionSearchResults([]);
  };

  const cancelTargetFunctionSearch = () => {
    setIsSearchingTargetFunction(false);
    setTargetFunctionSearchQuery("");
    setTargetFunctionSearchResults([]);
  };

  const handleTargetFunctionSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setTargetFunctionSearchQuery(query);
    
    if (query.length < 2) {
      setTargetFunctionSearchResults([]);
      return;
    }
    
    searchTargetFunctions(query);
  };

  const searchTargetFunctions = (query: string) => {
    if (!query || query.length < 2) return;
    
    setIsTargetFunctionSearching(true);
    
    postMessageToExtension({
      type: 'searchSubgraphNodes',
      projectPath: '', // We'll let the extension determine the project path
      searchQuery: query
    });
  };

  const handleTargetFunctionSelection = (node: any) => {
    if (!node) return;
    
    // Use filePath from the node if available
    if (node.filePath) {
      // Create a node details object to display
      const nodeDetails: BevelNodeDetails = {
        functionName: node.name || node.simpleName || "Unknown",
        filePath: node.filePath,
        startLine: node.startLine || (node.codeLocation?.start?.line),
        endLine: node.endLine || (node.codeLocation?.end?.line),
        nodeId: node.id
      };
      
      // Set the displayed node details
      setDisplayedNodeDetails(nodeDetails);
      
      // Request dependencies for this node using the shared helper
      requestDependenciesForNode(nodeDetails);
    } else {
      console.log('[Sidebar App] Cannot get dependencies: missing file path for selected function');
    }
    
    // Reset search state
    setIsSearchingTargetFunction(false);
    setTargetFunctionSearchQuery("");
    setTargetFunctionSearchResults([]);
  };

  return {
    isSearchingTargetFunction,
    targetFunctionSearchQuery,
    targetFunctionSearchResults,
    isTargetFunctionSearching,
    setTargetFunctionSearchResults,
    setIsTargetFunctionSearching,
    beginTargetFunctionSearch,
    cancelTargetFunctionSearch,
    handleTargetFunctionSearchInputChange,
    handleTargetFunctionSelection
  };
} 