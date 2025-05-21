import { useState } from 'react';
import { BevelNodeDetails, DependencyNode } from '../types';
import { generatePrompt } from '../utils/generatePrompt';

/**
 * Hook for managing test generation functionality
 */
export function useTestGeneration() {
  const [testFilePath, setTestFilePath] = useState("");
  const [framework, setFramework] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [generatePromptStatus, setGeneratePromptStatus] = useState<string | null>(null);
  const [receivedResponse, setReceivedResponse] = useState<string | null>(null);

  const handleGenerateTest = (nodeDetails: BevelNodeDetails | null, dependencies: DependencyNode[]) => {
    if (!nodeDetails) return;
    
    generatePrompt(
      {
        nodeDetails,
        dependencies,
        additionalInstructions,
        testFilePath,
        framework
      },
      {
        onStatusChange: setGeneratePromptStatus,
        onResponseReceived: setReceivedResponse,
        getCurrentStatus: () => generatePromptStatus
      }
    );
  };

  return {
    testFilePath,
    setTestFilePath,
    framework,
    setFramework,
    additionalInstructions,
    setAdditionalInstructions,
    generatePromptStatus,
    receivedResponse,
    setGeneratePromptStatus,
    setReceivedResponse,
    handleGenerateTest
  };
} 