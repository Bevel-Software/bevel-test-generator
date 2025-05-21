import React from 'react';
import '../../index.css';
import { postMessageToExtension } from '../../utils/vscode';

interface ConnectionWarningProps {
  isProjectAnalyzed?: boolean;
}

/**
 * Displays a warning message when Bevel is not connected or when the project is not analyzed
 */
const ConnectionWarning: React.FC<ConnectionWarningProps> = ({ isProjectAnalyzed }) => {
  const installBevel = () => {
    // Use our utility function to send message to extension
    postMessageToExtension({
      type: 'openBevelMarketplace'
    });
  };

  const checkConnection = () => {
    // Send message to extension to check connection again
    postMessageToExtension({
      type: 'checkBevelConnection'
    });
  };

  const openBevelSidepanel = () => {
    // Send message to extension to open the Bevel sidepanel
    postMessageToExtension({
      type: 'openBevelSidepanel'
    });
  };

  // If isProjectAnalyzed is false but not undefined, it means Bevel is connected but project not analyzed
  const isConnectedButNotAnalyzed = isProjectAnalyzed === false;

  return (
    <div className="connection-warning">
      <div className="warning-content">
        <span className="warning-icon">⚠️</span>
        <div className="warning-message">
          {isConnectedButNotAnalyzed ? (
            <>
              <h3>Project not analyzed</h3>
              <p>This project has not been analyzed by Bevel yet. Please open the Bevel sidepanel and analyze your project for full functionality.</p>
              <div className="button-container">
                <button 
                  onClick={openBevelSidepanel} 
                  className="install-button"
                  style={{
                    marginTop: '8px',
                    fontWeight: 'bold',
                    padding: '8px 12px'
                  }}
                >
                  Open Bevel
                </button>
                <button 
                  onClick={checkConnection} 
                  className="try-again-button"
                  style={{
                    marginTop: '8px',
                    marginLeft: '8px',
                    fontWeight: 'bold',
                    padding: '8px 12px',
                    backgroundColor: 'var(--vscode-button-secondaryBackground, #3c3c3c)',
                    color: 'var(--vscode-button-secondaryForeground, #ffffff)'
                  }}
                >
                  Try Again
                </button>
              </div>
            </>
          ) : (
            <>
              <h3>Bevel is not connected</h3>
              <p>Bevel extension should be installed and localhost service should be running for full functionality.</p>
              <div className="button-container">
                <button 
                  onClick={installBevel} 
                  className="install-button"
                  style={{
                    marginTop: '8px',
                    fontWeight: 'bold',
                    padding: '8px 12px'
                  }}
                >
                  Install Bevel Extension
                </button>
                <button 
                  onClick={checkConnection} 
                  className="try-again-button"
                  style={{
                    marginTop: '8px',
                    marginLeft: '8px',
                    fontWeight: 'bold',
                    padding: '8px 12px',
                    backgroundColor: 'var(--vscode-button-secondaryBackground, #3c3c3c)',
                    color: 'var(--vscode-button-secondaryForeground, #ffffff)'
                  }}
                >
                  Try Again
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionWarning; 