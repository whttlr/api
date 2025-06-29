# Files Feature Module

## Purpose
Handles G-code file operations including upload, validation, information retrieval, and file management. Provides secure file handling with validation and processing capabilities.

## API Endpoints

### `POST /api/v1/files/upload`
Upload G-code files to the server with validation.
- **Body**: Multipart form data with file field
- **Response**: Upload confirmation with file details
- **Use case**: Upload G-code files for execution

### `POST /api/v1/files/validate`
Validate G-code file content without execution.
- **Body**: Multipart form data with file field
- **Response**: Validation results and file analysis
- **Use case**: Pre-execution file verification

### `GET /api/v1/files/info/:filename`
Get information about a specific uploaded file.
- **Parameters**: `filename` - Name of the uploaded file
- **Response**: File metadata and analysis
- **Use case**: File inspection before execution

### `DELETE /api/v1/files/:filename`
Delete an uploaded file from the server.
- **Parameters**: `filename` - Name of the file to delete
- **Response**: Deletion confirmation
- **Use case**: Cleanup and file management

## Module Structure

```
files/
├── controller.js      # File operations and business logic (577 lines - needs splitting)
├── routes.js         # Express route definitions (405 lines - needs splitting)
├── schemas.js        # Validation schemas (315 lines - over limit)
├── index.js          # Public API exports
├── middleware/       # File-specific middleware
│   └── fileUpload.js # Multer configuration for file uploads
├── __tests__/        # Unit tests (currently empty - needs tests)
├── __mocks__/        # Mock data for testing
│   └── multer-mock.js
└── README.md         # This documentation
```

## Dependencies

### Internal
- `FileProcessor` - Core file processing logic from cnc/files
- `Logger Service` - Centralized logging
- `API Messages` - Internationalized response messages

### External
- `multer` - File upload handling
- `express` - Route handling
- `fs` - File system operations
- `path` - Path utilities

## Configuration

File handling configured via:
- Maximum file size limits
- Allowed file extensions (.gcode, .nc, .txt)
- Upload directory location
- Validation strictness levels
- File retention policies

## File Processing Features

### Upload Processing
- **File size validation** - Configurable size limits
- **Extension validation** - Only G-code file types allowed
- **Content validation** - G-code syntax checking
- **Duplicate handling** - Prevents overwrites with warnings

### Validation Engine
- **Syntax checking** - Validates G-code commands
- **Command analysis** - Identifies potentially dangerous commands
- **Coordinate validation** - Checks movement limits
- **Tool validation** - Verifies tool change commands

### File Analysis
- **Line counting** - Total lines and command lines
- **Execution time estimation** - Based on feedrates and distances
- **Coordinate bounds** - Min/max X, Y, Z positions
- **Tool usage** - Required tools and changes

## Security Features

- **Path traversal protection** - Prevents directory escape
- **File type validation** - MIME type and extension checking
- **Size limits** - Prevents large file uploads
- **Content sanitization** - Removes potentially dangerous content

## Error Handling

Handles these scenarios:
- **File too large** - Returns 413 with size information
- **Invalid file type** - Returns 400 with allowed types
- **Upload failures** - Returns 500 with error details
- **Validation errors** - Returns 400 with specific validation issues
- **File not found** - Returns 404 for missing files
- **Permission errors** - Returns 403 for access issues

## Testing Requirements

Critical tests needed:
- File upload with various file types
- File size limit enforcement
- G-code validation logic
- File deletion and cleanup
- Error scenarios and edge cases
- Security vulnerability tests

## Refactoring Needed

**Priority: HIGH** - Files exceed line limits:
- `controller.js` (577 lines) → Split by operation type
- `routes.js` (405 lines) → Split by endpoint groups
- `schemas.js` (315 lines) → Split by schema categories

Suggested split:
```
controllers/
├── upload.js      # File upload operations
├── validation.js  # File validation logic
├── management.js  # File info and deletion
└── index.js      # Controller exports

routes/
├── upload.js     # Upload-related routes
├── management.js # File management routes
└── index.js     # Route exports
```

## Usage Examples

```javascript
// Upload a file
const formData = new FormData();
formData.append('file', gCodeFile);
const upload = await fetch('/api/v1/files/upload', {
  method: 'POST',
  body: formData
});

// Validate a file
const validation = await fetch('/api/v1/files/validate', {
  method: 'POST',
  body: formData
});

// Get file info
const info = await fetch('/api/v1/files/info/my-file.gcode');
const fileDetails = await info.json();
```

## Integration Notes

- Files are stored in configured upload directory
- File processing integrates with core CNC file handling
- All operations are logged for audit trail
- Responses support internationalization
- File uploads require multipart/form-data content type