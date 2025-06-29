/**
 * File Browser Feature Index
 * 
 * Exports all file browser related components, hooks, and services.
 * 
 * @module FileBrowserFeature
 */

// Components
export { FileBrowserScreen } from './components/FileBrowserScreen.jsx';
export { DirectoryBrowser } from './components/DirectoryBrowser.jsx';
export { FilePreview } from './components/FilePreview.jsx';
export { RecentFiles } from './components/RecentFiles.jsx';

// Hooks
export { 
  useFileBrowser,
  useFileNavigation,
  useRecentFiles
} from './hooks/useFileBrowser.js';

// Services
export { 
  FileBrowserService,
  formatFileSize,
  formatTime,
  getFileIcon,
  isSupportedGcodeFile,
  analyzeGcodeFile,
  extractFileMetadata,
  sortFilesForDisplay,
  validateGcodeFileForExecution
} from './services/FileBrowserService.js';

// Default export
export { FileBrowserScreen as default } from './components/FileBrowserScreen.jsx';