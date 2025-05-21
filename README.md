# Characterization Test Prompt Generator for Cursor, Copilot, etc.

## Overview

This extension helps developers create effective prompts for AI coding assistants like Cursor, GitHub Copilot, and others to generate characterization tests. By automatically extracting and organizing code dependencies, it enables more precise test creation for legacy or complex codebases without modifying existing functionality.

## Features

### 🔍 Automated Dependency Extraction
- Automatically identify and extract code dependencies
- Organize dependencies for effective prompt creation
- Support for mocking or using real dependencies in test generation

### 🤖 AI-Ready Prompt Generation
- Create structured prompts for AI assistants to generate tests
- Format dependency information for optimal test coverage
- Enable more effective characterization test creation

### 🔌 Seamless Bevel Integration
- Automatic connection to the main Bevel extension
- Utilizes Bevel's code analysis capabilities
- Access to Bevel's knowledge graph for better dependency mapping

## Installation Requirements

⚠️ **Important**: The [Bevel](https://marketplace.visualstudio.com/items?itemName=bevel-software.bevel) main extension must be installed and running for this extension to function properly.

1. Install the [Bevel](https://marketplace.visualstudio.com/items?itemName=bevel-software.bevel) extension from the VS Code marketplace
2. Install this dependency extractor extension
3. Ensure Bevel is running before using the dependency extraction features

## Usage

1. Open a project in VS Code
2. The extension will automatically connect to Bevel if it's running
3. Select the function for which you want to extract dependencies
4. Choose between mocking dependencies or using real implementations
5. Generate prompts for AI coding assistants like Cursor or GitHub Copilot
6. Use these prompts with your preferred AI assistant for test generation

## Why Use AI-Assisted Characterization Tests?

Characterization tests are especially valuable when:
- Working with legacy code that lacks proper tests
- Preparing for major refactoring efforts
- Documenting existing behavior in complex systems

By extracting dependencies and creating structured prompts for AI coding assistants, this extension helps:
- Generate more accurate and comprehensive tests
- Save time in test creation for complex systems
- Ensure better coverage of edge cases and error conditions

## Extension Development

### Getting Started

1. Clone this repository
2. Run `npm run install:all` to install dependencies
3. Run `npm run build:all` to build the extension
4. Press F5 to open a new VS Code window with the extension loaded

### Project Structure

```
bevel-test-generator/
├── src/                      # Main extension code
│   ├── bevel/                # Bevel-specific functionality
│   ├── commands/             # Command registration and handling
│   ├── domain/               # Domain logic
│   ├── providers/            # VS Code providers (sidebar, tab, codelens)
│   ├── utils/                # Utility functions
│   └── webview-communication/ # Communication with webviews
├── sidebar/                  # Sidebar webview implementation
├── tab-webview/              # Tab webview implementation
└── media/                    # Images and other static assets
```

## License

See the LICENSE file for details.

## Feedback and Support

For issues, questions, or feedback regarding this dependency extractor, please:
- Contact support at juan@bevel.software

---

**Keywords**: Bevel, dependency extraction, characterization testing, AI-assisted testing, test generator, legacy code, refactoring, code analysis, prompt engineering, automated testing, Cursor, GitHub Copilot, AI coding assistants