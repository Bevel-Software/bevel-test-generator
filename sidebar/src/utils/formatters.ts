/**
 * Format a file path to be more readable by shortening the middle part
 * if it's too long
 */
export const formatFilePath = (path: string): string => {
  // If the path is null or undefined, return empty string
  if (!path) return '';

  // Check if path is too long
  if (path.length <= 60) return path;

  // Split the path into parts
  const parts = path.split('/');
  
  // If we have a very short path or just one component, return it
  if (parts.length <= 2) return path;
  
  // Keep the filename and its parent directory, plus truncate the middle
  const fileName = parts.pop() || '';
  const parentDir = parts.pop() || '';
  const projectRootDir = parts[0] || '';
  
  return `${projectRootDir}/.../${parentDir}/${fileName}`;
}; 