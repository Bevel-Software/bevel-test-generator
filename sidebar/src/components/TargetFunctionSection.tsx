import React from 'react';
import { BevelNodeDetails } from '../types';
import { formatFilePath } from '../utils/formatters';
import Codicon from './common/Codicon';
import TargetFunctionSearchContainer from './TargetFunctionSearchContainer';

interface TargetFunctionSectionProps {
  displayedNodeDetails: BevelNodeDetails | null;
  handleTargetFunctionClick: () => void;
  searchProps?: {
    isSearchingTargetFunction: boolean;
    targetFunctionSearchQuery: string;
    targetFunctionSearchResults: any[];
    isTargetFunctionSearching: boolean;
    handleTargetFunctionSearchInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleTargetFunctionSelection: (node: any) => void;
    cancelTargetFunctionSearch: () => void;
  };
  beginTargetFunctionSearch?: () => void;
}

const TargetFunctionSection: React.FC<TargetFunctionSectionProps> = ({ 
  displayedNodeDetails, 
  handleTargetFunctionClick,
  searchProps,
  beginTargetFunctionSearch
}) => {
  return (
    <div className="section">
      <div className="section-header">
        <span>Target Function</span>
        {beginTargetFunctionSearch && (
          <button 
            className="search-target-button"
            onClick={beginTargetFunctionSearch}
          >
            <Codicon name="search" className="search-target-icon" /> Search
          </button>
        )}
      </div>
      <div className="section-content">
        {searchProps && searchProps.isSearchingTargetFunction ? (
          <TargetFunctionSearchContainer
            searchQuery={searchProps.targetFunctionSearchQuery}
            isSearching={searchProps.isTargetFunctionSearching}
            searchResults={searchProps.targetFunctionSearchResults}
            handleSearchInputChange={searchProps.handleTargetFunctionSearchInputChange}
            handleNodeSelection={searchProps.handleTargetFunctionSelection}
            cancelSearch={searchProps.cancelTargetFunctionSearch}
          />
        ) : displayedNodeDetails ? (
          <div className="target-function">
            <div className="function-name">
              <span className="function-label">Function:</span>
              <div 
                className="function-value dependency-clickable"
                onClick={handleTargetFunctionClick}
                title={`Click to highlight in ${displayedNodeDetails.filePath}`}
              >
                {displayedNodeDetails.functionName}()
              </div>
            </div>
            
            <div className="file-path">
              <span className="file-label">File:</span>
              <div 
                className="file-value dependency-clickable"
                onClick={handleTargetFunctionClick}
                title={displayedNodeDetails.filePath}
              >
                {formatFilePath(displayedNodeDetails.filePath)}
              </div>
            </div>
          </div>
        ) : (
          <p className="muted-text">
            Click a "Bevel: Show in Sidebar" CodeLens in your editor to see details here, or use the search to find a function.
          </p>
        )}
      </div>
    </div>
  );
};

export default TargetFunctionSection; 