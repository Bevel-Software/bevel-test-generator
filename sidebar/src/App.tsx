import React, { useState } from 'react';
import './index.css';

// Components
import TargetFunctionSection from './components/TargetFunctionSection';
import DependenciesSection from './components/DependenciesSection';
import TestConfigurationSection from './components/TestConfigurationSection';
import ConnectionWarning from './components/common/ConnectionWarning';

// Hooks
import { useNodeDetails } from './hooks/useNodeDetails';
import { useDependencies } from './hooks/useDependencies';
import { useSearch } from './hooks/useSearch';
import { useTargetFunctionSearch } from './hooks/useTargetFunctionSearch';
import { useTestGeneration } from './hooks/useTestGeneration';
import { useMessageHandler } from './hooks/useMessageHandler';

// Version identifier to verify code reload
const DEBUG_VERSION = "3.0";

const App = () => {
	console.log(`[Sidebar App] DEBUG VERSION: ${DEBUG_VERSION} - Debugging enabled`);
	
	// Bevel connection status
	const [isBevelConnected, setIsBevelConnected] = useState<boolean | null>(null);
	// Project analysis status
	const [isProjectAnalyzed, setIsProjectAnalyzed] = useState<boolean | null>(null);
	
	// Use our custom hooks to manage different parts of the application state
	const { 
		displayedNodeDetails, 
		setDisplayedNodeDetails, 
		handleNodeClick: handleTargetNodeClick 
	} = useNodeDetails();
	
	const {
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
	} = useDependencies();
	
	// Custom setter for dependencies that organizes into hierarchical structure
	const setHierarchicalDependencies = (rawDependencies: any[]) => {
		const organizedDeps = organizeHierarchicalDependencies(rawDependencies);
		setDependencies(organizedDeps);
	};
	
	const {
		isAddingDependency,
		searchQuery,
		searchResults,
		isSearching,
		setSearchResults,
		setIsSearching,
		addNewDependency,
		cancelAddDependency,
		handleSearchInputChange,
		handleNodeSelection
	} = useSearch(dependencies, setDependencies);
	
	const {
		isSearchingTargetFunction,
		targetFunctionSearchQuery,
		targetFunctionSearchResults,
		isTargetFunctionSearching,
		setTargetFunctionSearchResults,
		setIsTargetFunctionSearching,
		beginTargetFunctionSearch,
		cancelTargetFunctionSearch,
		handleTargetFunctionSearchInputChange,
		handleTargetFunctionSelection
	} = useTargetFunctionSearch(setDisplayedNodeDetails);
	
	const {
		testFilePath,
		setTestFilePath,
		framework,
		setFramework,
		additionalInstructions,
		setAdditionalInstructions,
		receivedResponse,
		setReceivedResponse,
		generatePromptStatus,
		setGeneratePromptStatus,
		handleGenerateTest
	} = useTestGeneration();

	// Search props to pass to DependenciesSection
	const searchProps = {
		searchQuery,
		searchResults,
		isSearching,
		handleSearchInputChange,
		handleNodeSelection,
		cancelAddDependency
	};
	
	// Target function search props
	const targetFunctionSearchProps = {
		isSearchingTargetFunction,
		targetFunctionSearchQuery,
		targetFunctionSearchResults,
		isTargetFunctionSearching,
		handleTargetFunctionSearchInputChange,
		handleTargetFunctionSelection,
		cancelTargetFunctionSearch
	};

	// Initialize the message handler
	useMessageHandler(
		setDisplayedNodeDetails,
		setHierarchicalDependencies,
		setIsLoadingDependencies,
		setDependenciesError,
		setSearchResults,
		setIsSearching,
		setReceivedResponse,
		setGeneratePromptStatus,
		requestDependenciesForNode,
		addParentNodeFromTypeInfo,
		setIsBevelConnected,
		setIsProjectAnalyzed,
		setTargetFunctionSearchResults,
		setIsTargetFunctionSearching
	);

	return (
		<div className="container">
			{/* Connection Warning */}
			{(isBevelConnected === false || isProjectAnalyzed === false) && (
				<ConnectionWarning isProjectAnalyzed={isBevelConnected ? (isProjectAnalyzed === null ? undefined : isProjectAnalyzed) : undefined} />
			)}
			
			{/* Target Function Section */}
			<TargetFunctionSection 
				displayedNodeDetails={displayedNodeDetails}
				handleTargetFunctionClick={handleTargetNodeClick}
				searchProps={targetFunctionSearchProps}
				beginTargetFunctionSearch={beginTargetFunctionSearch}
			/>

			{/* Dependencies Section */}
			<DependenciesSection
				dependencies={dependencies}
				isLoadingDependencies={isLoadingDependencies}
				dependenciesError={dependenciesError}
				updateNodeImplementation={updateNodeImplementation}
				deleteDependency={deleteDependency}
				handleNodeClick={handleNodeClick}
				isAddingDependency={isAddingDependency}
				addNewDependency={addNewDependency}
				searchProps={searchProps}
				displayedNodeDetails={displayedNodeDetails}
			/>

			{/* Test Configuration Section */}
			<TestConfigurationSection
				testFilePath={testFilePath}
				setTestFilePath={setTestFilePath}
				framework={framework}
				setFramework={setFramework}
				additionalInstructions={additionalInstructions}
				setAdditionalInstructions={setAdditionalInstructions}
				generatePromptStatus={generatePromptStatus}
				handleGenerateTest={handleGenerateTest}
				displayedNodeDetails={displayedNodeDetails}
				dependencies={dependencies}
			/>
		</div>
	);
};

export default App;
