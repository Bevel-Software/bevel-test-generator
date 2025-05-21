export interface BevelNodeDetails {
  nodeId: string;
  functionName: string;
  filePath: string;
  startLine?: number;
  endLine?: number;
}

export type ImplementationType = 'Mock' | 'Real' | 'Fake Object' | 'Use Real One' | 'Mixed';

export interface DependencyNode {
  id: string;           // Unique identifier
  name: string;         // Node name
  type: string;         // Node type (File, Class, Function, etc.)
  implementation: ImplementationType;
  expanded?: boolean;   // UI expanded state
  filePath?: string;    // Path to the file
  startLine?: number;   // Starting line in file
  endLine?: number;     // Ending line in file
  nodeId?: string;      // Original graph node ID
  parentId?: string;    // Reference to parent node
  definingNodeName?: string; // Name of the node that defines this dependency
  children: DependencyNode[]; // Child nodes
  originalData?: any;   // Original data from API response
} 