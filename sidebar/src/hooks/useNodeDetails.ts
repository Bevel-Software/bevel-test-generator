import { useState, useEffect } from 'react';
import { BevelNodeDetails } from '../types';
import { postMessageToExtension } from '../utils/vscode';

/**
 * Hook for managing node details display
 */
export function useNodeDetails() {
  // State for the currently displayed node details
  const [displayedNodeDetails, setDisplayedNodeDetails] = useState<BevelNodeDetails | null>(null);

  // Listen for line info response
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      // Handle line info response from extension
      if (message.type === 'nodeLineInfo' && 
          displayedNodeDetails && 
          message.nodeId === displayedNodeDetails.nodeId) {
        
        console.log('[Sidebar App] Received line info for node:', message);
        
        // Update node details with line information
        setDisplayedNodeDetails(prevDetails => {
          if (!prevDetails) return null;
          
          const updatedDetails = {
            ...prevDetails,
            startLine: message.startLine,
            endLine: message.endLine
          };
          
          // Now trigger highlighting with the updated line information
          highlightNode(updatedDetails);
          
          return updatedDetails;
        });
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [displayedNodeDetails]);

  // Function to highlight node in editor
  const highlightNode = (nodeDetails: BevelNodeDetails) => {
    if (!nodeDetails || !nodeDetails.filePath) {
      console.log('[Sidebar App] Cannot highlight node: missing file path');
      return;
    }
    
    // Use available line information, avoid arbitrary defaults
    console.log(`[Sidebar App] Highlighting target function: ${nodeDetails.functionName} in ${nodeDetails.filePath}${
      nodeDetails.startLine !== undefined ? `, lines ${nodeDetails.startLine}-${nodeDetails.endLine}` : ' (line numbers unknown)'
    }`);
    
    postMessageToExtension({
      type: 'highlightDependency',
      dependency: {
        name: nodeDetails.functionName,
        filePath: nodeDetails.filePath,
        startLine: nodeDetails.startLine,
        endLine: nodeDetails.endLine
      }
    });
  };

  // Handle click on a node to highlight it in the editor
  const handleNodeClick = () => {
    console.log('[useNodeDetails] handleNodeClick called with displayedNodeDetails:', displayedNodeDetails);
    
    if (!displayedNodeDetails || !displayedNodeDetails.filePath) {
      console.log('[Sidebar App] Cannot highlight node: missing file path');
      return;
    }

    // If we have a node ID and missing line numbers, request them from the extension
    if (displayedNodeDetails.nodeId && 
        (displayedNodeDetails.startLine === undefined || displayedNodeDetails.endLine === undefined)) {
      console.log(`[Sidebar App] Requesting line information for ${displayedNodeDetails.functionName}`);
      
      // Send a message to get the line information first
      postMessageToExtension({
        type: 'getNodeLineInfo',
        nodeId: displayedNodeDetails.nodeId,
        functionName: displayedNodeDetails.functionName,
        filePath: displayedNodeDetails.filePath
      });
      
      // The extension should respond with line info which will be handled by the event listener
      return;
    }

    // We already have line numbers, highlight directly
    highlightNode(displayedNodeDetails);
  };

  return {
    displayedNodeDetails,
    setDisplayedNodeDetails,
    handleNodeClick
  };
} 