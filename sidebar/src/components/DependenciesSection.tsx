import React from 'react';
import { DependencyNode, BevelNodeDetails, ImplementationType } from '../types';
import Codicon from './common/Codicon';
import SearchContainer from './SearchContainer';
import HierarchicalDependencyItem from './HierarchicalDependencyItem';

interface DependenciesSectionProps {
  dependencies: DependencyNode[];
  isLoadingDependencies: boolean;
  dependenciesError: string | null;
  updateNodeImplementation: (nodeId: string, implementation: ImplementationType) => void;
  deleteDependency: (nodeId: string) => void;
  handleNodeClick: (node: DependencyNode) => void;
  isAddingDependency: boolean;
  addNewDependency: () => void;
  searchProps: {
    searchQuery: string;
    isSearching: boolean;
    searchResults: any[];
    handleSearchInputChange: (e: React.ChangeEvent<HTMLInputElement>, displayedNodeDetails: BevelNodeDetails | null) => void;
    handleNodeSelection: (node: any) => void;
    cancelAddDependency: () => void;
  };
  displayedNodeDetails: BevelNodeDetails | null;
}

const DependenciesSection: React.FC<DependenciesSectionProps> = ({
  dependencies,
  isLoadingDependencies,
  dependenciesError,
  updateNodeImplementation,
  deleteDependency,
  handleNodeClick,
  isAddingDependency,
  addNewDependency,
  searchProps,
  displayedNodeDetails
}) => {
  console.log('[DependenciesSection] Rendering with', dependencies.length, 'dependencies');
  
  return (
    <div className="section">
      <div className="section-header">
        <span>Dependencies</span>
        <button 
          className="add-dependency-button"
          onClick={addNewDependency}
        >
          <Codicon name="add" className="add-dependency-icon" /> Add Dependency
        </button>
      </div>
      <div className="section-content">
        {isAddingDependency && (
          <SearchContainer
            {...searchProps}
            displayedNodeDetails={displayedNodeDetails}
          />
        )}
        {isLoadingDependencies ? (
          <p className="muted-text">Loading dependencies...</p>
        ) : dependenciesError ? (
          <p className="error-text">
            Error: {dependenciesError}
          </p>
        ) : dependencies.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th className="table-header-cell dependency-column">Dependency</th>
                  <th className="table-header-cell type-column">Type</th>
                  <th className="table-header-cell implementation-column">
                    Implementation
                    <div className="info-tooltip-container">
                      <Codicon name="info" className="info-icon" />
                      <div className="info-tooltip">
                        <strong>Mock</strong>: Use the framework specified by user to create a lightweight mock of the dependency with fake responses<br/><br/>
                        <strong>Use Real One</strong>: Use the actual implementation of the dependency<br/><br/>
                        <strong>Fake Object</strong>: Create a simple implementation of the specified interface or class with custom behavior
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {dependencies.map((node) => (
                  <HierarchicalDependencyItem
                    key={node.id}
                    node={node}
                    level={0}
                    updateNodeImplementation={updateNodeImplementation}
                    deleteDependency={deleteDependency}
                    handleNodeClick={handleNodeClick}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted-text">No dependencies found for this function.</p>
        )}
      </div>
    </div>
  );
};

export default DependenciesSection; 