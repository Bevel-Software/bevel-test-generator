import { useState } from 'react';
import { DependencyNode, BevelNodeDetails } from '../types';
import { postMessageToExtension } from '../utils/vscode';
import { v4 as uuidv4 } from 'uuid';

/**
 * Hook for handling dependency search functionality
 */
export function useSearch(dependencies: DependencyNode[], setDependencies: React.Dispatch<React.SetStateAction<DependencyNode[]>>) {
  const [isAddingDependency, setIsAddingDependency] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const addNewDependency = () => {
    setIsAddingDependency(true);
    setSearchQuery("");
    setSearchResults([]);
  };

  const cancelAddDependency = () => {
    setIsAddingDependency(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>, displayedNodeDetails: BevelNodeDetails | null) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    searchNodesInSubgraph(query, displayedNodeDetails);
  };

  const searchNodesInSubgraph = (query: string, displayedNodeDetails: BevelNodeDetails | null) => {
    if (!displayedNodeDetails || !query || query.length < 2) return;
    
    setIsSearching(true);
    
    postMessageToExtension({
      type: 'searchSubgraphNodes',
      projectPath: displayedNodeDetails.filePath.split('/').slice(0, -1).join('/'),
      searchQuery: query
    });
  };

  const handleNodeSelection = (node: any) => {
    if (!node) return;
    
    // Create a standalone node without grouping into file hierarchy
    const newNode: DependencyNode = {
      id: uuidv4(),
      name: node.name || node.simpleName || "Unknown",
      type: node.nodeType || node.simpleType || "Unknown",
      implementation: "Mock", // Set default to Mock
      nodeId: node.id,
      filePath: node.filePath,
      startLine: node.startLine || (node.codeLocation?.start?.line),
      endLine: node.endLine || (node.codeLocation?.end?.line),
      children: []
    };
    
    setDependencies([...dependencies, newNode]);
    
    setIsAddingDependency(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  return {
    isAddingDependency,
    searchQuery,
    searchResults,
    isSearching,
    setSearchResults,
    setIsSearching,
    addNewDependency,
    cancelAddDependency,
    handleSearchInputChange,
    handleNodeSelection
  };
} 