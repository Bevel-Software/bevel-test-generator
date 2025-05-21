import { BevelClient, Node } from '@bevel-software/bevel-ts-client';
import * as vscode from 'vscode';

export interface DependencyInfo {
  name: string;
  type: string;
  implementation: 'Mock' | 'Real' | 'Fake';
  nodeId?: string; // Full node identifier
  filePath?: string; // File path of the dependency
  startLine?: number; // Start line of the code
  endLine?: number; // End line of the code
  definingNodeName?: string; // The node that defines this dependency (for hierarchy)
}

// Type for connections to handle different API versions
interface GenericConnection {
  [key: string]: any;
}

/**
 * Extracts dependencies for a given function using Bevel TS client
 * @param bevelClient The initialized Bevel client
 * @param projectPath Path to the project
 * @param functionName Name of the function (possibly qualified with class name)
 * @param filePath Path to the file containing the function
 * @returns Array of dependency information
 */
export async function extractDependencies(
  bevelClient: BevelClient,
  projectPath: string,
  functionName: string,
  filePath: string
): Promise<DependencyInfo[]> {
  try {
    // Find the node for the specified function
    const node = await bevelClient.nodes.findNodeByName(projectPath, functionName, filePath);
    
    if (!node || !node.id) {
      console.log(`[DependencyExtractor] No node found for function: ${functionName}`);
      return [];
    }

    console.log(`[DependencyExtractor] Found node: ${node.id} for function: ${functionName}`);

    // First, try to get dependencies using findConnectionsFrom (outgoing connections)
    let connections: GenericConnection[] = [];
    try {
      console.log(`[DependencyExtractor] Looking for connections FROM node: ${node.id}`);
      connections = await bevelClient.connections.findConnectionsFrom(projectPath, node.id);
      console.log(`[DependencyExtractor] Found ${connections?.length || 0} connections FROM the node`);
      
      // Log some sample connection data to understand structure
      if (connections && connections.length > 0) {
        console.log(`[DependencyExtractor] Sample connection:`, JSON.stringify(connections[0]));
      }
    } catch (e) {
      console.log(`[DependencyExtractor] Error finding connections FROM: ${e}, will try alternative methods`);
      // If that fails, try findConnections (general connections)
      try {
        // Try to get all connections for this node using different client versions' API
        try {
          // Try the method with the most general signature
          connections = (await (bevelClient.connections as any).findConnections(projectPath, node.id)) || [];
        } catch (err) {
          console.log(`[DependencyExtractor] Standard findConnections failed: ${err}, trying alternatives`);
          
          // Try other potential signatures/methods that different versions might have
          try {
            connections = (await (bevelClient.connections as any).getConnections(projectPath, node.id)) || [];
          } catch {
            console.log('[DependencyExtractor] Alternative connection methods also failed');
            connections = [];
          }
        }
        
        console.log(`[DependencyExtractor] Found ${connections?.length || 0} connections via general methods`);
        
        // Filter to only connections where our node is the source
        if (connections && connections.length > 0) {
          connections = connections.filter(conn => {
            const sourceId = getConnectionSourceId(conn);
            return sourceId === node.id;
          });
          console.log(`[DependencyExtractor] After filtering for outgoing connections: ${connections.length}`);
        }
      } catch (generalError) {
        console.log(`[DependencyExtractor] Error finding general connections: ${generalError}`);
      }
    }

    if (!connections || connections.length === 0) {
      console.log(`[DependencyExtractor] No dependencies found for ${functionName} via outgoing connections, trying incoming`);
      
      // As a fallback, try incoming connections (findConnectionsTo)
      try {
        connections = await bevelClient.connections.findConnectionsTo(projectPath, node.id);
        console.log(`[DependencyExtractor] Found ${connections?.length || 0} incoming connections TO the node`);
      } catch (e) {
        console.log(`[DependencyExtractor] Error finding connections TO: ${e}`);
        return [];
      }
    }

    if (!connections || connections.length === 0) {
      return [];
    }

    // Process the connections to extract dependencies
    const dependencies: DependencyInfo[] = [];
    const processedDependencies = new Set<string>(); // To avoid duplicates

    for (const connection of connections) {
      console.log(`[DependencyExtractor] Processing connection:`, connection);
      
      // Based on the Swagger API docs, the connections might have sourceNodeName and targetNodeName
      const targetNodeName = connection.targetNodeName;
      const connectionFilePath = connection.filePath || ''; // Get file path from connection if available
      
      // For outgoing connections, we want the target node
      if (targetNodeName && !processedDependencies.has(targetNodeName)) {
        // Skip if the target is the same as ourselves (self-reference)
        if (targetNodeName === connection.sourceNodeName) {
          console.log(`[DependencyExtractor] Skipping self-reference: ${targetNodeName}`);
          continue;
        }
        
        console.log(`[DependencyExtractor] Found dependency: ${targetNodeName}`);
        
        // Extract the simple name from the node identifier
        // Format is often something like: 569302938.hrNzCQ==.<global>.hover
        let simpleName = targetNodeName;
        const lastDotIndex = targetNodeName.lastIndexOf('.');
        if (lastDotIndex !== -1) {
          simpleName = targetNodeName.substring(lastDotIndex + 1);
        }
        
        // Try to get more info about the target node
        let targetNodeDetails: any = null;
        try {
          targetNodeDetails = await bevelClient.nodes.getNode(projectPath, targetNodeName);
        } catch (nodeError) {
          console.log(`[DependencyExtractor] Could not get details for node ${targetNodeName}: ${nodeError}`);
        }

        // Extract line information from the node details
        let startLine: number | undefined = undefined;
        let endLine: number | undefined = undefined;
        
        if (targetNodeDetails) {
          if (targetNodeDetails.startLine != null && targetNodeDetails.endLine != null) {
            startLine = targetNodeDetails.startLine;
            endLine = targetNodeDetails.endLine;
            console.log(`[DependencyExtractor] Found line information for ${targetNodeName}: ${startLine}-${endLine}`);
          } else if (targetNodeDetails.codeLocation && 
                   targetNodeDetails.codeLocation.start && 
                   targetNodeDetails.codeLocation.start.line != null && 
                   targetNodeDetails.codeLocation.end && 
                   targetNodeDetails.codeLocation.end.line != null) {
            startLine = targetNodeDetails.codeLocation.start.line;
            endLine = targetNodeDetails.codeLocation.end.line;
            console.log(`[DependencyExtractor] Found code location for ${targetNodeName}: ${startLine}-${endLine}`);
          } else {
            console.log(`[DependencyExtractor] No line information found for ${targetNodeName}`);
          }
        }
        
        // Add to dependencies list with full nodeId and filePath
        dependencies.push({
          name: simpleName,
          type: targetNodeDetails?.type || targetNodeDetails?.nodeType || 'File',
          implementation: 'Mock', // Default to Mock for now
          nodeId: targetNodeName, // Store the full node identifier
          filePath: targetNodeDetails?.filePath || connectionFilePath, // Prefer node details path
          startLine,
          endLine,
          definingNodeName: targetNodeDetails?.definingNodeName || targetNodeDetails?.parentNodeName
        });
        
        processedDependencies.add(targetNodeName);
        continue;
      }
      
      // If we didn't find a targetNodeName, try the more complex approach with target/targetId
      const targetIdProperty = getConnectionTargetId(connection);
      if (targetIdProperty && !processedDependencies.has(targetIdProperty)) {
        // Skip if the target is the same as the source (self-reference)
        if (targetIdProperty === node.id) {
          console.log(`[DependencyExtractor] Skipping self-reference: ${targetIdProperty}`);
          continue;
        }
        
        // Get the target node details
        try {
          console.log(`[DependencyExtractor] Getting node details for ${targetIdProperty}`);
          const targetNode = await bevelClient.nodes.getNode(projectPath, targetIdProperty);
          if (!targetNode) {
            console.log(`[DependencyExtractor] No node found for ID: ${targetIdProperty}`);
            continue;
          }
          
          // Handle node properties safely using any to bypass type checking
          // since the Node type might not have all the properties we expect
          const nodeAny = targetNode as any;
          const depName = nodeAny.name || nodeAny.simpleName || targetNode.id || 'Unknown';
          const depFilePath = nodeAny.filePath || '';
          
          // Extract line information from the node details
          let startLine: number | undefined = undefined;
          let endLine: number | undefined = undefined;
          
          if (nodeAny.startLine != null && nodeAny.endLine != null) {
            startLine = nodeAny.startLine;
            endLine = nodeAny.endLine;
          } else if (nodeAny.codeLocation && 
                   nodeAny.codeLocation.start && 
                   nodeAny.codeLocation.start.line != null && 
                   nodeAny.codeLocation.end && 
                   nodeAny.codeLocation.end.line != null) {
            startLine = nodeAny.codeLocation.start.line;
            endLine = nodeAny.codeLocation.end.line;
          }
          
          console.log(`[DependencyExtractor] Adding dependency: ${depName}, path: ${depFilePath}, lines: ${startLine}-${endLine}`);
          
          dependencies.push({
            name: depName,
            type: nodeAny.type || nodeAny.nodeType || 'File',
            implementation: 'Mock', // Default to Mock for now
            nodeId: targetIdProperty, // Store the full node identifier
            filePath: depFilePath,
            startLine,
            endLine,
            definingNodeName: nodeAny.definingNodeName || nodeAny.parentNodeName
          });
          
          processedDependencies.add(targetIdProperty);
        } catch (err) {
          console.log(`[DependencyExtractor] Error fetching node ${targetIdProperty}:`, err);
        }
      }
    }
    
    console.log(`[DependencyExtractor] Total dependencies found: ${dependencies.length}`);
    if (dependencies.length > 0) {
      console.log(`[DependencyExtractor] Dependencies:`, dependencies);
    }

    return dependencies;
  } catch (error) {
    console.error(`[DependencyExtractor] Error extracting dependencies:`, error);
    throw error;
  }
}

/**
 * Safely extracts the source ID from a connection object, accounting for different API versions
 * @param connection The connection object
 * @returns The source ID if found, otherwise undefined
 */
function getConnectionSourceId(connection: GenericConnection): string | undefined {
  // Try different property paths that might exist
  if (connection.source && connection.source.id) {
    return connection.source.id;
  }
  
  if (connection.sourceId) {
    return connection.sourceId;
  }
  
  if (connection.from) {
    return connection.from;
  }
  
  if (connection.sourceNodeName) {
    return connection.sourceNodeName;
  }
  
  // For connections that represent the relationship differently
  if (connection.start) {
    return connection.start;
  }
  
  return undefined;
}

/**
 * Safely extracts the target ID from a connection object, accounting for different API versions
 * @param connection The connection object
 * @returns The target ID if found, otherwise undefined
 */
function getConnectionTargetId(connection: GenericConnection): string | undefined {
  // Try different property paths that might exist
  if (connection.target && connection.target.id) {
    return connection.target.id;
  }
  
  if (connection.targetId) {
    return connection.targetId;
  }
  
  if (connection.to) {
    return connection.to;
  }
  
  if (connection.targetNodeName) {
    return connection.targetNodeName;
  }
  
  // For connections that represent the relationship differently
  if (connection.end) {
    return connection.end;
  }
  
  return undefined;
}

/**
 * Updates the implementation type for a dependency
 * @param dependency The dependency to update
 * @param implementationType The new implementation type
 */
export function updateDependencyImplementation(
  dependency: DependencyInfo,
  implementationType: 'Mock' | 'Real' | 'Fake'
): DependencyInfo {
  return {
    ...dependency,
    implementation: implementationType
  };
} 