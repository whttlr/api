import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

export function FileSelector({ 
  directory = '.', 
  extensions = ['.gcode', '.nc', '.tap'],
  onSelect,
  focus = true
}) {
  const [files, setFiles] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFiles();
  }, [directory]);

  useInput((input, key) => {
    if (!focus || loading) return;

    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(files.length - 1, selectedIndex + 1));
    } else if (key.return) {
      if (files[selectedIndex]) {
        onSelect?.(files[selectedIndex]);
      }
    }
  });

  async function loadFiles() {
    try {
      setLoading(true);
      setError(null);

      const entries = await readdir(directory);
      const fileList = [];

      for (const entry of entries) {
        const fullPath = join(directory, entry);
        const stats = await stat(fullPath);
        
        if (stats.isFile()) {
          const hasValidExtension = extensions.some(ext => 
            entry.toLowerCase().endsWith(ext.toLowerCase())
          );
          
          if (hasValidExtension) {
            fileList.push({
              name: entry,
              path: fullPath,
              size: stats.size,
              modified: stats.mtime
            });
          }
        }
      }

      fileList.sort((a, b) => b.modified - a.modified);
      setFiles(fileList);
      setSelectedIndex(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Box>
        <Text>Loading files...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  if (files.length === 0) {
    return (
      <Box>
        <Text dimColor>No G-code files found in {directory}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>
          Files in {directory} ({files.length} files)
        </Text>
      </Box>
      
      {files.map((file, index) => (
        <Box key={file.path} marginBottom={0}>
          <Text 
            color={index === selectedIndex ? 'green' : 'white'}
            backgroundColor={index === selectedIndex ? 'gray' : undefined}
            bold={index === selectedIndex}
          >
            {index === selectedIndex ? '> ' : '  '}
            {file.name}
          </Text>
          <Text dimColor marginLeft={2}>
            ({(file.size / 1024).toFixed(1)} KB)
          </Text>
        </Box>
      ))}
      
      <Box marginTop={1}>
        <Text dimColor>
          Use ↑↓ to navigate, Enter to select
        </Text>
      </Box>
    </Box>
  );
}