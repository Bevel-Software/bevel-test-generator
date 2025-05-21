import React from 'react';
import { BevelNodeDetails } from '../types';
import Codicon from './common/Codicon';

interface SearchContainerProps {
  searchQuery: string;
  isSearching: boolean;
  searchResults: any[];
  handleSearchInputChange: (e: React.ChangeEvent<HTMLInputElement>, displayedNodeDetails: BevelNodeDetails | null) => void;
  handleNodeSelection: (node: any) => void;
  cancelAddDependency: () => void;
  displayedNodeDetails: BevelNodeDetails | null;
}

const SearchContainer: React.FC<SearchContainerProps> = ({
  searchQuery,
  isSearching,
  searchResults,
  handleSearchInputChange,
  handleNodeSelection,
  cancelAddDependency,
  displayedNodeDetails
}) => {
  // Sort results by score (if available from fuzzy search) or alphabetically
  const sortedResults = [...searchResults].sort((a, b) => {
    // If both have _score property, sort by score (lower is better)
    if (a._score !== undefined && b._score !== undefined) {
      return a._score - b._score;
    }
    // Otherwise sort alphabetically by name
    const nameA = (a.name || a.simpleName || "").toLowerCase();
    const nameB = (b.name || b.simpleName || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });
  
  // Return different icons based on node type
  const getNodeIcon = (node: any) => {
    const type = (node.nodeType || node.simpleType || "").toLowerCase();
    
    switch (type) {
      case 'file':
        return 'file';
      case 'class':
        return 'symbol-class';
      case 'function':
      case 'method':
        return 'symbol-method';
      case 'property':
      case 'field':
        return 'symbol-property';
      default:
        return 'package';
    }
  };

  return (
    <div className="search-container">
      <div className="search-input-wrapper">
        <Codicon name="search" className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search for dependencies..."
          value={searchQuery}
          onChange={(e) => handleSearchInputChange(e, displayedNodeDetails)}
          autoFocus
        />
      </div>
      
      {isSearching && <div className="muted-text searching-status">Searching...</div>}
      
      {sortedResults.length > 0 && (
        <div className="search-results">
          {sortedResults.map((node, index) => (
            <div 
              key={index} 
              className="search-result-item"
              onClick={() => handleNodeSelection(node)}
            >
              <Codicon name={getNodeIcon(node)} className="search-result-icon" />
              <div>
                <div className="search-result-name">{node.name || node.simpleName || "Unknown"}</div>
                <div className="search-result-details">
                  {node.nodeType || node.simpleType || "Unknown"} - {node.filePath || "Unknown path"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="search-actions-container">
        <button 
          className="cancel-button"
          onClick={cancelAddDependency}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default SearchContainer; 