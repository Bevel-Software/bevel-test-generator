import { BevelNodeDetails } from '../types';
import { postMessageToExtension } from './vscode';

/**
 * Request dependencies for a node from the extension
 * @param nodeDetails Details about the node to get dependencies for
 */
export function requestDependenciesForNode(nodeDetails: BevelNodeDetails) {
  if (!nodeDetails || !nodeDetails.filePath) {
    console.log('[Sidebar App] Cannot get dependencies: missing node details or file path');
    return;
  }

  postMessageToExtension({
    type: 'getDependencies',
    nodeDetails
  });
}

/**
 * Handle highlighting a node in the editor
 * @param nodeDetails Details about the node to highlight
 */
export function highlightNodeInEditor(nodeDetails: BevelNodeDetails) {
  console.log('[Sidebar App] highlightNodeInEditor called with:', nodeDetails);
  
  if (!nodeDetails || !nodeDetails.filePath) {
    console.log('[Sidebar App] Cannot highlight node: missing file path');
    return;
  }

  console.log(`[Sidebar App] Sending highlightDependency message for ${nodeDetails.functionName} in ${nodeDetails.filePath}`);
  
  postMessageToExtension({
    type: 'highlightDependency',
    dependency: {
      name: nodeDetails.functionName,
      filePath: nodeDetails.filePath,
      startLine: nodeDetails.startLine,
      endLine: nodeDetails.endLine
    }
  });
} 