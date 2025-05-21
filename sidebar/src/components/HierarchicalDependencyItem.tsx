import React, { useState } from 'react';
import { DependencyNode, ImplementationType } from '../types';
import Codicon from './common/Codicon';

interface HierarchicalDependencyItemProps {
  node: DependencyNode;
  level: number;
  updateNodeImplementation: (nodeId: string, implementation: ImplementationType) => void;
  deleteDependency: (nodeId: string) => void;
  handleNodeClick: (node: DependencyNode) => void;
}

const HierarchicalDependencyItem: React.FC<HierarchicalDependencyItemProps> = ({
  node,
  level,
  updateNodeImplementation,
  deleteDependency,
  handleNodeClick
}) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  
  // Different icons based on node type
  const getNodeIcon = () => {
    switch (node.type.toLowerCase()) {
      case 'class':
        return 'symbol-class';
      case 'function':
      case 'method':
        return 'symbol-method';
      default:
        return 'symbol-misc';
    }
  };

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <>
      <tr className={level > 0 ? "child-node-row" : ""}>
        <td className="table-cell-flex" style={{ paddingLeft: `${level * 16}px` }}>
          {hasChildren && (
            <span className="expand-toggle" onClick={toggleExpanded}>
              <Codicon name={expanded ? "chevron-down" : "chevron-right"} />
            </span>
          )}
          <div 
            className={node.filePath ? "dependency-name-clickable dependency-clickable" : "dependency-nonclickable"}
            onClick={() => node.filePath && handleNodeClick(node)}
            title={node.filePath ? `Click to highlight in ${node.filePath}${node.startLine ? ` (lines ${node.startLine}-${node.endLine})` : ''}` : "No file path available"}
          >
            <Codicon name={getNodeIcon()} className="node-type-icon" />
            <span className="node-name">{node.name}</span>
          </div>
        </td>
        <td className="table-cell">{node.type}</td>
        <td className="table-cell align-right">
          <div className="flex-end">
            {level === 0 ? (
              <select 
                className={`implementation-select ${node.implementation.toLowerCase().replace(/\s+/g, '-')}`}
                value={node.implementation}
                onChange={(e) => updateNodeImplementation(node.id, e.target.value as ImplementationType)}
              >
                <option value="Mock">Mock</option>
                <option value="Use Real One">Use Real One</option>
                <option value="Fake Object">Fake Object</option>
              </select>
            ) : null}
            <Codicon 
              name="trash" 
              className="delete-icon" 
              title="Delete dependency" 
              onClick={() => deleteDependency(node.id)}
            />
          </div>
        </td>
      </tr>
      
      {/* Render children recursively if expanded */}
      {expanded && hasChildren && node.children.map(childNode => (
        <HierarchicalDependencyItem
          key={childNode.id}
          node={childNode}
          level={level + 1}
          updateNodeImplementation={updateNodeImplementation}
          deleteDependency={deleteDependency}
          handleNodeClick={handleNodeClick}
        />
      ))}
    </>
  );
};

export default HierarchicalDependencyItem; 