import React from 'react';
import { DependencyNode, ImplementationType } from '../types';
import Codicon from './common/Codicon';

interface DependencyNodeItemProps {
  node: DependencyNode;
  updateNodeImplementation: (nodeId: string, implementation: ImplementationType) => void;
  deleteDependency: (nodeId: string) => void;
  handleNodeClick: (node: DependencyNode) => void;
}

const DependencyNodeItem: React.FC<DependencyNodeItemProps> = ({
  node,
  updateNodeImplementation,
  deleteDependency,
  handleNodeClick
}) => {
  // Different icons based on node type
  const getNodeIcon = () => {
    switch (node.type.toLowerCase()) {
      case 'file':
        return 'file';
      case 'class':
        return 'symbol-class';
      case 'function':
      case 'method':
        return 'symbol-method';
      default:
        return 'symbol-misc';
    }
  };

  return (
    <tr>
      <td className="table-cell-flex">
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
          <select 
            className={`implementation-select ${node.implementation.toLowerCase().replace(/\s+/g, '-')}`}
            value={node.implementation}
            onChange={(e) => updateNodeImplementation(node.id, e.target.value as ImplementationType)}
          >
            <option value="Mock">Mock</option>
            <option value="Use Real One">Use Real One</option>
            <option value="Fake Object">Fake Object</option>
          </select>
          <Codicon 
            name="trash" 
            className="delete-icon" 
            title="Delete dependency" 
            onClick={() => deleteDependency(node.id)}
          />
        </div>
      </td>
    </tr>
  );
};

export default DependencyNodeItem; 