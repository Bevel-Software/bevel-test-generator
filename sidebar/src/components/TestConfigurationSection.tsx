import React from 'react';
import { BevelNodeDetails, DependencyNode } from '../types';
import StatusBadge from './common/StatusBadge';

interface TestConfigurationSectionProps {
  testFilePath: string;
  setTestFilePath: (path: string) => void;
  framework: string;
  setFramework: (framework: string) => void;
  additionalInstructions: string;
  setAdditionalInstructions: (instructions: string) => void;
  generatePromptStatus: string | null;
  handleGenerateTest: (nodeDetails: BevelNodeDetails | null, dependencies: DependencyNode[]) => void;
  displayedNodeDetails: BevelNodeDetails | null;
  dependencies: DependencyNode[];
}

const TestConfigurationSection: React.FC<TestConfigurationSectionProps> = ({
  testFilePath,
  setTestFilePath,
  framework,
  setFramework,
  additionalInstructions,
  setAdditionalInstructions,
  generatePromptStatus,
  handleGenerateTest,
  displayedNodeDetails,
  dependencies
}) => {
  // Common testing frameworks
  const frameworks = [
    { value: "", label: "Auto-detect" },
    { value: "None", label: "None" },
    { value: "JUnit", label: "JUnit (Java)" },
    { value: "pytest", label: "pytest (Python)" },
    { value: "Jest", label: "Jest (JavaScript/TypeScript)" },
    { value: "Mocha", label: "Mocha (JavaScript)" },
    { value: "NUnit", label: "NUnit (.NET)" },
    { value: "xUnit", label: "xUnit (.NET)" },
    { value: "PHPUnit", label: "PHPUnit (PHP)" },
    { value: "RSpec", label: "RSpec (Ruby)" },
    { value: "go test", label: "go test (Go)" },
    { value: "Vitest", label: "Vitest (JavaScript/TypeScript)" },
    { value: "Jasmine", label: "Jasmine (JavaScript)" },
    { value: "Other", label: "Other" }
  ];

  return (
    <div className="section">
      <div className="section-header">
        <span>Test Configuration</span>
      </div>
      <div className="section-content">
        <div className="form-field">
          <label className="label">Test File Path (optional)</label>
          <input 
            type="text" 
            className="input"
            value={testFilePath}
            onChange={(e) => setTestFilePath(e.target.value)}
            placeholder="controller/src/main/kotlin/GitignoreAwareFile..."
          />
        </div>

        <div className="form-field">
          <label className="label">Framework (optional)</label>
          <input 
            type="text" 
            className="input"
            value={framework}
            onChange={(e) => setFramework(e.target.value)}
            placeholder="Jest, pytest, JUnit, etc..."
          />
        </div>

        <div className="form-field">
          <label className="label">Additional Instructions</label>
          <textarea 
            className="textarea"
            value={additionalInstructions}
            onChange={(e) => setAdditionalInstructions(e.target.value)}
            placeholder="Add any specific instructions for the test generation here..."
            rows={4}
          />
        </div>
        
        <button
          className="generate-button"
          onClick={() => handleGenerateTest(displayedNodeDetails, dependencies)}
        >
          Generate Prompt
        </button>
        
        {generatePromptStatus && <StatusBadge status={generatePromptStatus} />}
      </div>
    </div>
  );
};

export default TestConfigurationSection; 