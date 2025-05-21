# Bevel Dependency Extraction

This feature allows you to extract the dependencies of any code function using the Bevel TS client. You can then choose how to implement each dependency (Mock, Real, or Fake) for your test generation.

## How to Use

1. Open a code file and look for the "Bevel: Extract Dependencies" CodeLens that appears above your functions
2. Click on the CodeLens to extract dependencies for that specific function
3. A panel will open showing all dependencies with options to select the implementation type (Mock, Real, or Fake)
4. Select the appropriate implementation type for each dependency
5. Click "Save Preferences" to store your choices

## Implementation Types

- **Mock**: Use the framework specified by user to create a lightweight mock of the dependency with fake responses
- **Real**: Use the actual implementation of the dependency
- **Fake**: Create a simple implementation of the specified interface or class with custom behavior

## Technical Details

The dependency extraction works by:

1. Using Bevel's `findNodeByName` to locate the target function
2. Finding all connections to that node via `findConnectionsTo`
3. Processing each connection to identify source nodes (dependencies)
4. Presenting them in a convenient UI for configuration

This implementation represents the smallest step toward enabling full test generation with configurable dependency handling.

## Next Steps

Future improvements could include:

- Saving dependency implementation preferences persistently
- Generating test code with the selected implementation approach
- Supporting more complex dependency configurations 