# File Browser Feature

Advanced G-code file browser with directory navigation, file preview, and comprehensive file management capabilities.

## Components

### FileBrowserScreen
Main file browsing interface with two operational modes and recent file access.

**Features:**
- Two browsing modes: Browse and Preview
- Directory navigation with breadcrumbs
- Recent files quick access (1-3 shortcuts)
- File and folder management
- Loading states and error handling

**Usage:**
```jsx
import { FileBrowserScreen } from '../features/file-browser';

<FileBrowserScreen />
```

### DirectoryBrowser
Directory content display with file listing and navigation controls.

**Features:**
- File and directory listing
- Visual file type indicators
- File size and modification date display
- Empty directory and error state handling
- Selection highlighting and navigation

**Usage:**
```jsx
import { DirectoryBrowser } from '../features/file-browser';

<DirectoryBrowser
  files={files}
  selectedIndex={selectedIndex}
  currentDirectory="/path/to/files"
  isLoading={false}
  error={null}
  onSelect={handleSelect}
  onRefresh={handleRefresh}
/>
```

### FilePreview
Comprehensive G-code file preview with analysis and content display.

**Features:**
- File content preview (first 15 lines)
- G-code analysis and statistics
- Execution time estimation
- File complexity assessment
- Syntax highlighting for comments

**Usage:**
```jsx
import { FilePreview } from '../features/file-browser';

<FilePreview
  currentFile="/path/to/file.gcode"
  fileContent="G0 X0 Y0..."
  fileStats={{ totalLines: 100, codeLines: 85 }}
  onExecute={handleExecute}
/>
```

### RecentFiles
Recent files display with quick access shortcuts.

**Features:**
- Last 3 accessed files
- File type icons
- Keyboard shortcuts (1-3)
- Clean, compact display

**Usage:**
```jsx
import { RecentFiles } from '../features/file-browser';

<RecentFiles recentFiles={['/path/to/recent1.gcode', '/path/to/recent2.nc']} />
```

## Hooks

### useFileBrowser
Comprehensive file browser state management with navigation and file operations.

**Features:**
- File list management with metadata
- Directory navigation
- File preview and execution
- Recent files handling
- Selection state management

**Usage:**
```jsx
import { useFileBrowser } from '../features/file-browser';

const { browserState, browserActions } = useFileBrowser({
  selectedIndex,
  setSelectedIndex,
  currentMode,
  setCurrentMode
});

// browserState includes: files, currentDirectory, currentFile, fileContent, etc.
// browserActions includes: handleFileSelect, previewFile, executeFile, etc.
```

### useFileNavigation
Keyboard navigation utilities for file lists.

**Features:**
- Arrow key navigation
- First/last file shortcuts
- Navigation boundary checking
- Selection movement tracking

**Usage:**
```jsx
import { useFileNavigation } from '../features/file-browser';

const {
  moveUp,
  moveDown,
  moveToFirst,
  moveToLast,
  canMoveUp,
  canMoveDown
} = useFileNavigation(files, selectedIndex, setSelectedIndex);
```

### useRecentFiles
Recent files management with quick access utilities.

**Usage:**
```jsx
import { useRecentFiles } from '../features/file-browser';

const {
  getRecentFile,
  hasRecentFiles,
  recentFileCount,
  recentFiles
} = useRecentFiles(recentFilePaths);
```

## Services

### FileBrowserService
Comprehensive file management and analysis utilities.

**Functions:**
- `formatFileSize(bytes)` - Human-readable file sizes
- `formatTime(seconds)` - Duration formatting
- `getFileIcon(extension)` - File type icons
- `isSupportedGcodeFile(extension)` - G-code format validation
- `analyzeGcodeFile(content)` - File analysis and statistics
- `extractFileMetadata(file)` - Enhanced file information
- `sortFilesForDisplay(files)` - Optimal file ordering
- `validateGcodeFileForExecution(file)` - Execution validation

**Usage:**
```jsx
import { FileBrowserService } from '../features/file-browser';

const icon = FileBrowserService.getFileIcon('.gcode');
const size = FileBrowserService.formatFileSize(1024);
const analysis = FileBrowserService.analyzeGcodeFile(content);
const validation = FileBrowserService.validateGcodeFileForExecution(file);
```

## File Analysis

### Supported Formats
The browser supports these G-code file extensions:
- `.gcode`, `.nc`, `.ngc` - Standard G-code formats
- `.cnc`, `.tap`, `.g` - Common CNC formats  
- `.prg`, `.txt` - Program and text formats
- `.min`, `.eia`, `.fan` - Specialized formats
- `.fgc`, `.gc`, `.ncc` - Additional G-code variants
- `.din`, `.hnc` - DIN and Heidenhain formats

### File Statistics
For each G-code file, the browser provides:

**Basic Information:**
- Total lines and actual code lines
- File size and modification date
- Estimated execution time

**Complexity Assessment:**
- **Simple**: < 50 code lines (green)
- **Medium**: 50-200 code lines (yellow)  
- **Complex**: > 200 code lines (red)

**Content Analysis:**
- Movement command detection
- Spindle command presence
- Coolant command usage

### File Icons
Visual indicators for different file types:
- ⚙️ `.gcode`, `.cnc`, `.g`, `.fgc`, `.gc`
- 🔧 `.nc`, `.ngc`, `.eia`, `.ncc`, `.hnc`
- 🔩 `.tap`
- 📋 `.prg`
- 📄 `.txt`
- 📐 `.min`
- 💨 `.fan`
- 📏 `.din`

## Navigation Features

### Keyboard Controls
- **↑↓** - Navigate file list
- **Enter** - Select file/directory
- **P** - Preview selected file
- **E** - Execute selected file
- **1-3** - Quick access to recent files
- **R** - Refresh directory
- **ESC** - Go back/exit preview

### Directory Navigation
- Automatic parent directory detection
- Breadcrumb display
- Directory-first sorting
- Empty directory handling

### Recent Files
- Persistent recent file history
- Quick access with number keys
- Visual file type indicators
- Last 3 files displayed

## State Management

### Browser Modes
- **Browse**: Directory navigation and file listing
- **Preview**: File content and analysis display

### Loading States
- Directory scanning indicator
- File content loading feedback
- Error state handling
- Empty directory messaging

### File Metadata
Enhanced file objects include:
```javascript
{
  name: 'file.gcode',
  path: '/full/path/to/file.gcode',
  type: 'file',
  size: 1024,
  extension: '.gcode',
  modified: '2024-01-01T00:00:00Z',
  isGcodeFile: true,
  icon: '⚙️',
  formattedSize: '1.0 KB',
  formattedModified: '1/1/2024'
}
```

## Architecture

This feature follows the established modular architecture:

```
file-browser/
├── components/
│   ├── FileBrowserScreen.jsx       # Main browser interface
│   ├── DirectoryBrowser.jsx       # Directory content display
│   ├── FilePreview.jsx           # File preview and analysis
│   └── RecentFiles.jsx           # Recent files quick access
├── hooks/
│   └── useFileBrowser.js          # Browser state management
├── services/
│   └── FileBrowserService.js      # File utilities and analysis
├── __tests__/                     # Unit tests (to be added)
├── README.md                      # This file
└── index.js                       # Public API
```

## Dependencies

- `../shared/contexts` - CNC and app state management
- `../shared/components` - Shared UI components
- `path` - Node.js path utilities for file operations

## Future Enhancements

- [ ] File upload and download capabilities
- [ ] Advanced file filtering and search
- [ ] File preview with syntax highlighting
- [ ] Directory bookmarks and favorites
- [ ] File operation history and undo
- [ ] Batch file operations
- [ ] File comparison and diff viewer
- [ ] Network file browser support
- [ ] File metadata editing
- [ ] Advanced G-code analysis and validation