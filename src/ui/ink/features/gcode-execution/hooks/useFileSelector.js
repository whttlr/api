import { useState, useEffect, useCallback } from 'react';
import { readdir, stat, readFile } from 'fs/promises';
import { join } from 'path';
import { useAppState } from '../../../shared/context/AppStateContext.jsx';
import appConfig from '../../../config/app.js';

export function useFileSelector(directory = appConfig.gcodeDirectory) {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(false);
  const { setError } = useAppState();

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const entries = await readdir(directory).catch(() => []);
      const fileList = [];

      for (const entry of entries) {
        try {
          const fullPath = join(directory, entry);
          const stats = await stat(fullPath);
          
          if (stats.isFile()) {
            const hasValidExtension = appConfig.fileExtensions.some(ext => 
              entry.toLowerCase().endsWith(ext.toLowerCase())
            );
            
            if (hasValidExtension) {
              fileList.push({
                name: entry,
                path: fullPath,
                size: stats.size,
                modified: stats.mtime,
                extension: entry.split('.').pop()?.toLowerCase() || ''
              });
            }
          }
        } catch (fileError) {
          console.warn(`Could not process file ${entry}:`, fileError.message);
        }
      }

      fileList.sort((a, b) => b.modified - a.modified);
      setFiles(fileList);
      
      if (fileList.length > 0 && !selectedFile) {
        setSelectedFile(fileList[0]);
      }

    } catch (error) {
      setError(`Failed to load files from ${directory}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [directory, selectedFile, setError]);

  const selectFile = useCallback(async (file) => {
    if (!file) return;

    try {
      setLoading(true);
      setSelectedFile(file);
      
      const content = await readFile(file.path, 'utf8');
      setFileContent(content);
      
    } catch (error) {
      setError(`Failed to read file ${file.name}: ${error.message}`);
      setFileContent('');
    } finally {
      setLoading(false);
    }
  }, [setError]);

  const refreshFiles = useCallback(() => {
    loadFiles();
  }, [loadFiles]);

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setFileContent('');
  }, []);

  const getFileStats = useCallback(() => {
    if (!fileContent) {
      return {
        totalLines: 0,
        gcodeLines: 0,
        comments: 0,
        size: 0
      };
    }

    const lines = fileContent.split('\n');
    const gcodeLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith(';') && !trimmed.startsWith('(');
    });
    const comments = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith(';') || trimmed.startsWith('(');
    });

    return {
      totalLines: lines.length,
      gcodeLines: gcodeLines.length,
      comments: comments.length,
      size: selectedFile?.size || 0
    };
  }, [fileContent, selectedFile]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  return {
    files,
    selectedFile,
    fileContent,
    loading,
    loadFiles,
    selectFile,
    refreshFiles,
    clearSelection,
    getFileStats,
    hasFiles: files.length > 0,
    directory
  };
}