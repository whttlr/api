import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Button } from '../../../shared/components/Button.jsx';
import { TextInput } from '../../../shared/components/TextInput.jsx';

export function SettingsForm({ 
  settings, 
  onUpdate, 
  title, 
  fields = [],
  validationResult = null 
}) {
  const [selectedField, setSelectedField] = useState(0);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');

  useInput((input, key) => {
    if (editingField !== null) {
      if (key.escape) {
        setEditingField(null);
        setEditValue('');
      } else if (key.return) {
        handleSaveField();
      }
      return;
    }

    if (key.upArrow) {
      setSelectedField(Math.max(0, selectedField - 1));
    } else if (key.downArrow) {
      setSelectedField(Math.min(fields.length - 1, selectedField + 1));
    } else if (key.return) {
      handleEditField();
    }
  });

  const handleEditField = () => {
    const field = fields[selectedField];
    if (field && field.editable !== false) {
      setEditingField(selectedField);
      setEditValue(String(getValue(field.path) || ''));
    }
  };

  const handleSaveField = () => {
    const field = fields[editingField];
    if (field) {
      let value = editValue;
      
      if (field.type === 'number') {
        value = parseFloat(editValue) || 0;
      } else if (field.type === 'boolean') {
        value = editValue.toLowerCase() === 'true';
      } else if (field.type === 'array') {
        try {
          value = JSON.parse(editValue);
        } catch {
          value = editValue.split(',').map(s => s.trim());
        }
      }
      
      if (field.validate) {
        const validation = field.validate(value);
        if (!validation.valid) {
          console.error(validation.error);
          return;
        }
      }
      
      onUpdate(field.path, value);
    }
    
    setEditingField(null);
    setEditValue('');
  };

  const getValue = (path) => {
    const keys = path.split('.');
    let current = settings;
    
    for (const key of keys) {
      if (current && current.hasOwnProperty(key)) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current;
  };

  const formatValue = (value, type) => {
    if (value === undefined || value === null) return 'undefined';
    
    switch (type) {
      case 'boolean':
        return value ? 'true' : 'false';
      case 'array':
        return Array.isArray(value) ? value.join(', ') : String(value);
      case 'object':
        return JSON.stringify(value);
      default:
        return String(value);
    }
  };

  const getFieldError = (path) => {
    if (!validationResult?.errors) return null;
    return validationResult.errors.find(error => error.includes(path));
  };

  const getFieldWarning = (path) => {
    if (!validationResult?.warnings) return null;
    return validationResult.warnings.find(warning => warning.includes(path));
  };

  return (
    <Box flexDirection="column">
      {title && (
        <Box marginBottom={1}>
          <Text bold color="cyan">
            {title}
          </Text>
        </Box>
      )}

      <Box flexDirection="column">
        {fields.map((field, index) => {
          const value = getValue(field.path);
          const isSelected = selectedField === index;
          const isEditing = editingField === index;
          const error = getFieldError(field.path);
          const warning = getFieldWarning(field.path);

          return (
            <Box key={field.path} flexDirection="column" marginBottom={1}>
              <Box
                paddingX={1}
                borderStyle={isSelected ? 'double' : 'single'}
                borderColor={error ? 'red' : warning ? 'yellow' : isSelected ? 'green' : 'gray'}
              >
                <Box justifyContent="space-between" width="100%">
                  <Box>
                    <Text bold={isSelected}>
                      {field.label}:
                    </Text>
                    {field.description && (
                      <Text dimColor marginLeft={1}>
                        ({field.description})
                      </Text>
                    )}
                  </Box>
                  
                  <Box>
                    {isEditing ? (
                      <TextInput
                        value={editValue}
                        onChange={setEditValue}
                        onSubmit={handleSaveField}
                        focus={true}
                        width={20}
                      />
                    ) : (
                      <Text 
                        color={error ? 'red' : warning ? 'yellow' : 'white'}
                        bold={isSelected}
                      >
                        {formatValue(value, field.type)}
                      </Text>
                    )}
                  </Box>
                </Box>
              </Box>

              {error && (
                <Box marginLeft={2}>
                  <Text color="red">
                    Error: {error}
                  </Text>
                </Box>
              )}

              {warning && (
                <Box marginLeft={2}>
                  <Text color="yellow">
                    Warning: {warning}
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          Use ↑↓ to navigate, Enter to edit, Esc to cancel
        </Text>
      </Box>
    </Box>
  );
}