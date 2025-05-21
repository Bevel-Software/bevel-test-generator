import { useState } from 'react';
import { DependencyNode, BevelNodeDetails, ImplementationType } from '../types';
import { postMessageToExtension } from '../utils/vscode';
import { v4 as uuidv4 } from 'uuid';

/**
 * Hook for managing hierarchical dependencies with parent-child relationships
 */
export function useDependencies() {
  const [dependencies, setDependencies] = useState<DependencyNode[]>([]);
  const [isLoadingDependencies, setIsLoadingDependencies] = useState<boolean>(false);
  const [dependenciesError, setDependenciesError] = useState<string | null>(null);
  const [nodeMap, setNodeMap] = useState<Map<string, DependencyNode>>(new Map());
  const [displayedNodeId, setDisplayedNodeId] = useState<string>('');

  const requestDependenciesForNode = (nodeDetails: BevelNodeDetails) => {
    setIsLoadingDependencies(true);
    setDisplayedNodeId(nodeDetails.nodeId || '');
    postMessageToExtension({
      type: 'getDependencies',
      nodeDetails
    });
  };

  // Request node details for a specific parent name
  const requestNodeTypeFromBevel = (nodeName: string) => {
    postMessageToExtension({
      type: 'getNodeTypeInfo',
      nodeName
    });
  };

  const updateNodeImplementation = (nodeId: string, implementation: ImplementationType) => {
    setDependencies(prevDeps => {
      // Create a deep copy of the dependencies
      const newDeps = JSON.parse(JSON.stringify(prevDeps)) as DependencyNode[];
      
      // Recursive function to update a node and all its children
      const updateNodeAndChildren = (nodes: DependencyNode[]): boolean => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].id === nodeId) {
            // Update this node's implementation
            nodes[i].implementation = implementation;
            
            // Also update all children recursively
            if (nodes[i].children && nodes[i].children.length > 0) {
              nodes[i].children.forEach(child => {
                child.implementation = implementation;
                // Recursively update any nested children
                if (child.children && child.children.length > 0) {
                  updateNodeAndChildren(child.children);
                }
              });
            }
            
            return true;
          }
          
          // Check children recursively
          if (nodes[i].children && nodes[i].children.length > 0) {
            const found = updateNodeAndChildren(nodes[i].children);
            if (found) return true;
          }
        }
        return false;
      };
      
      updateNodeAndChildren(newDeps);
      return newDeps;
    });
  };

  const deleteDependency = (nodeId: string) => {
    console.log('[Sidebar App] Deleting dependency with ID:', nodeId);
    setDependencies(prevDeps => {
      // Create a deep copy
      const newDeps = JSON.parse(JSON.stringify(prevDeps)) as DependencyNode[];
      
      // Recursive function to find and remove a node by ID
      const removeNodeById = (nodes: DependencyNode[], id: string): boolean => {
        for (let i = 0; i < nodes.length; i++) {
          // If this is the node to remove
          if (nodes[i].id === id) {
            nodes.splice(i, 1);
            return true;
          }
          
          // Check children recursively
          if (nodes[i].children && nodes[i].children.length > 0) {
            const removed = removeNodeById(nodes[i].children, id);
            if (removed) return true;
          }
        }
        return false;
      };
      
      // Apply the removal logic
      removeNodeById(newDeps, nodeId);
      return newDeps;
    });
  };

  const handleNodeClick = (node: DependencyNode) => {
    console.log('[Sidebar App] Node clicked:', node);
    
    if (!node.filePath) {
      console.log('[Sidebar App] Cannot highlight node: missing file path');
      return;
    }

    postMessageToExtension({
      type: 'highlightDependency',
      dependency: {
        name: node.name,
        filePath: node.filePath,
        startLine: node.startLine,
        endLine: node.endLine
      }
    });
  };

  // Helper function to organize raw dependencies into a hierarchical structure
  const organizeHierarchicalDependencies = (rawDependencies: any[]): DependencyNode[] => {
    console.log('[Sidebar] Starting to organize dependencies:', rawDependencies);
    
    // Get the target function name and node id
    const targetFunctionName = rawDependencies[0]?.targetFunctionName || '';
    const targetNodeId = displayedNodeId;
    
    console.log(`[Sidebar] Target Function: ${targetFunctionName}, Target Node ID: ${targetNodeId}`);
    
    // Extract a clean function name from nodeId if available
    const extractFunctionNameFromNodeId = (nodeId: string): string | undefined => {
      if (!nodeId) return undefined;
      
      const parts = nodeId.split('.');
      if (parts.length >= 3) {
        // Return the last part which is typically the function name
        return parts[parts.length - 1];
      }
      
      return undefined;
    };
    
    // Get clean target function name from nodeId if possible
    const cleanTargetFunctionName = extractFunctionNameFromNodeId(targetNodeId) || targetFunctionName;

    // First, filter out files and target function children
    const filteredDeps = rawDependencies.filter(dep => {
      // Skip files
      if (dep.type?.toLowerCase() === 'file') {
        return false;
      }
      
      // Multiple ways to check if this dependency has the target function as defining parent
      
      // 1. Direct match with definingNodeName
      if (dep.definingNodeName === targetFunctionName) {
        console.log(`[Sidebar] Filtering out dependency with target function name "${targetFunctionName}" as defining name:`, dep.name);
        return false;
      }
      
      // 2. Match with clean function name from nodeId
      if (cleanTargetFunctionName && dep.definingNodeName === cleanTargetFunctionName) {
        console.log(`[Sidebar] Filtering out dependency with clean target function name "${cleanTargetFunctionName}" as defining name:`, dep.name);
        return false;
      }
      
      // 3. Check if definingNodeName contains the nodeId (for fully qualified IDs)
      if (targetNodeId && dep.definingNodeName && dep.definingNodeName.includes(targetNodeId)) {
        console.log(`[Sidebar] Filtering out dependency with target nodeId "${targetNodeId}" in defining name:`, dep.name);
        return false;
      }
      
      // 4. Check if the nodeId patterns match (for complex nodeId formats)
      if (targetNodeId && dep.nodeId && dep.definingNodeName) {
        const targetParts = targetNodeId.split('.');
        const depParts = dep.nodeId.split('.');
        
        // If they share the same prefix and the defining name matches the target's last part
        if (targetParts.length >= 3 && depParts.length >= 3) {
          const targetLastPart = targetParts[targetParts.length - 1];
          if (dep.definingNodeName === targetLastPart) {
            console.log(`[Sidebar] Filtering out dependency with target function last part "${targetLastPart}" as defining name:`, dep.name);
            return false;
          }
        }
      }
      
      return true;
    });
    
    
    // Create nodes map and name-to-node mapping
    const allNodesMap = new Map<string, DependencyNode>();
    const nodesByName = new Map<string, DependencyNode>();
    
    // First pass: create all nodes
    filteredDeps.forEach(dep => {
      const id = uuidv4();
      
      // Clean up the name by removing hash parts if present
      let cleanName = dep.name;
      // Check if name has a hash pattern (e.g., 210136012.obKPyA==.ServiceManager.ServiceManager)
      if (cleanName.includes('==.')) {
        // Extract just the meaningful part after the hash
        const parts = cleanName.split('==.');
        if (parts.length > 1) {
          cleanName = parts[1];
        }
      }
      
      const node: DependencyNode = {
        id,
        name: cleanName, // Use the cleaned name
        type: dep.type || 'Unknown',
        implementation: dep.implementation || 'Mock',
        filePath: dep.filePath,
        startLine: dep.startLine,
        endLine: dep.endLine,
        nodeId: dep.nodeId,
        definingNodeName: dep.definingNodeName,
        children: [],
        originalData: dep
      };
      
      allNodesMap.set(id, node);
      
      // Only add to nodesByName if we don't already have a node with this clean name
      // This prevents duplicate entries for the same logical node
      if (!nodesByName.has(cleanName)) {
        nodesByName.set(cleanName, node);
      } else {
        // If we already have this node name and the existing one doesn't have node details,
        // but this one does, update the existing one
        const existingNode = nodesByName.get(cleanName);
        if (existingNode && (!existingNode.filePath || !existingNode.startLine) && 
            (node.filePath || node.startLine)) {
          existingNode.filePath = node.filePath || existingNode.filePath;
          existingNode.startLine = node.startLine || existingNode.startLine;
          existingNode.endLine = node.endLine || existingNode.endLine;
          existingNode.nodeId = node.nodeId || existingNode.nodeId;
        }
      }
    });
    
    // Second pass: handle defining node names with hash parts
    // Define the missingParents Set to track parents we need to fetch
    const missingParents = new Set<string>();
    
    filteredDeps.forEach(dep => {
      if (dep.definingNodeName) {
        // Clean up the defining node name if it has hash parts
        let cleanDefiningName = dep.definingNodeName;
        if (cleanDefiningName.includes('==.')) {
          const parts = cleanDefiningName.split('==.');
          if (parts.length > 1) {
            cleanDefiningName = parts[1];
          }
        }
        
        // Update the definingNodeName to the clean version
        const nodeId = allNodesMap.get(dep.id)?.id;
        if (nodeId) {
          const node = allNodesMap.get(nodeId);
          if (node) {
            node.definingNodeName = cleanDefiningName;
          }
        }
        
        if (!nodesByName.has(cleanDefiningName)) {
          missingParents.add(cleanDefiningName);
          
          // Request node type information from Bevel API
          requestNodeTypeFromBevel(dep.definingNodeName);
        }
      }
    });
    
    // Third pass: establish parent-child relationships and track child nodes
    const childNodeIds = new Set<string>();
    
    allNodesMap.forEach(node => {
      // If this node has a defining parent
      if (node.definingNodeName && nodesByName.has(node.definingNodeName)) {
        const parentNode = nodesByName.get(node.definingNodeName);
        if (parentNode) {
          // Add as child to parent node
          parentNode.children.push(node);
          // Track which nodes are children
          childNodeIds.add(node.id);
        }
      } else if (node.nodeId) {
        // Try to extract parent-child relationship from nodeId format
        const parts = node.nodeId.split('.');
        if (parts.length >= 3) {
          // For format like "number.hash.Class.Method"
          // Find the second last part which should be the class/parent
          const potentialParentName = parts[parts.length - 2];
          
          // Check if we have this parent in our existing nodes
          if (potentialParentName && nodesByName.has(potentialParentName) && 
              potentialParentName !== node.name) {
            const parentNode = nodesByName.get(potentialParentName);
            if (parentNode) {
              // Add as child to parent node
              parentNode.children.push(node);
              // Track which nodes are children
              childNodeIds.add(node.id);
            }
          } else if (potentialParentName && potentialParentName !== node.name) {
            // If we don't have the parent, it may be a class that's not in the dependency list
            // Add the parent to missingParents to fetch its info
            if (potentialParentName !== '<global>' && !missingParents.has(potentialParentName)) {
              // Construct a more complete parent node name from the nodeId
              // Use all parts up to the method name
              const parentParts = parts.slice(0, parts.length - 1);
              const fullParentName = parentParts.join('.');
              
              // Clean up the parent name
              let cleanParentName = fullParentName;
              if (cleanParentName.includes('==.')) {
                const nameParts = cleanParentName.split('==.');
                if (nameParts.length > 1) {
                  cleanParentName = nameParts[1];
                }
              }
              
              missingParents.add(fullParentName);
              
              // Request node type information from Bevel API
              requestNodeTypeFromBevel(fullParentName);
              
              console.log(`[Sidebar] Inferring parent node ${cleanParentName} from nodeId pattern`);
            }
          }
        }
      }
    });
    
    // Final pass: collect root nodes (nodes that aren't children)
    const rootNodes = Array.from(allNodesMap.values()).filter(node => !childNodeIds.has(node.id));
    
    console.log('[Sidebar] Organized hierarchical dependencies:', rootNodes);
    
    // Store the node map for future reference
    setNodeMap(allNodesMap);
    
    // Log missing parents that need to be resolved
    if (missingParents.size > 0) {
      console.log('[Sidebar] Missing parent nodes to be resolved:', Array.from(missingParents));
    }
    
    return rootNodes;
  };
  
  // Function to handle parent node type information received from Bevel API
  const addParentNodeFromTypeInfo = (parentNodeInfo: any) => {
    if (!parentNodeInfo || !parentNodeInfo.name) {
      console.log('[Sidebar] Received invalid parent node info');
      return;
    }
    
    console.log('[Sidebar] Received parent node info:', parentNodeInfo);
    
    // Clean up the parent name
    let cleanParentName = parentNodeInfo.name;
    if (cleanParentName.includes('==.')) {
      const parts = cleanParentName.split('==.');
      if (parts.length > 1) {
        cleanParentName = parts[1];
      }
    }
    
    // Only add if the API identifies this as a Class node
    if (parentNodeInfo.type === 'Class') {
      // Check if we already have this class in the dependency tree
      const existingClassNode = dependencies.find(dep => 
        dep.name === cleanParentName || 
        (dep.nodeId && dep.nodeId.includes(parentNodeInfo.name))
      );
      
      if (existingClassNode) {
        console.log(`[Sidebar] Class node ${cleanParentName} already exists, not adding duplicate`);
        return;
      }
      
      setDependencies(prevDeps => {
        // Create a deep copy
        const newDeps = JSON.parse(JSON.stringify(prevDeps)) as DependencyNode[];
        
        // Create a new parent node with clean name
        const parentNode: DependencyNode = {
          id: uuidv4(),
          name: cleanParentName,
          type: 'Class',
          implementation: 'Mock',
          filePath: parentNodeInfo.filePath,
          startLine: parentNodeInfo.startLine,
          endLine: parentNodeInfo.endLine,
          nodeId: parentNodeInfo.nodeId,
          children: [],
          originalData: parentNodeInfo
        };
        
        // Find child nodes that should be moved under this parent
        // Only consider nodes where the defining node name explicitly matches the parent name
        // or matches after cleaning
        const childNodes = newDeps.filter(dep => {
          if (dep.definingNodeName === parentNodeInfo.name) return true;
          
          // Also match if the clean versions match
          let cleanDefiningName = dep.definingNodeName;
          if (cleanDefiningName?.includes('==.')) {
            const parts = cleanDefiningName.split('==.');
            if (parts.length > 1) {
              cleanDefiningName = parts[1];
              return cleanDefiningName === cleanParentName;
            }
          }
          
          return false;
        });
        
        // Move children under parent
        childNodes.forEach(child => {
          parentNode.children.push(child);
        });
        
        // Remove the child nodes from root level
        const updatedRootNodes = newDeps.filter(dep => {
          if (dep.definingNodeName === parentNodeInfo.name) return false;
          
          // Also remove if the clean versions match
          let cleanDefiningName = dep.definingNodeName;
          if (cleanDefiningName?.includes('==.')) {
            const parts = cleanDefiningName.split('==.');
            if (parts.length > 1) {
              cleanDefiningName = parts[1];
              return cleanDefiningName !== cleanParentName;
            }
          }
          
          return true;
        });
        
        // Add the new parent node
        updatedRootNodes.push(parentNode);
        
        return updatedRootNodes;
      });
    } else {
      console.log(`[Sidebar] Not adding parent node ${cleanParentName} since type is not Class: ${parentNodeInfo.type}`);
    }
  };

  return {
    dependencies,
    setDependencies,
    isLoadingDependencies,
    setIsLoadingDependencies,
    dependenciesError,
    setDependenciesError,
    requestDependenciesForNode,
    updateNodeImplementation,
    deleteDependency,
    handleNodeClick,
    organizeHierarchicalDependencies,
    addParentNodeFromTypeInfo
  };
} 