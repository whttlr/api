# Repository Separation Plan: API, CLI, and Shared Core

## Executive Summary

This document outlines a plan to separate the current monolithic CNC G-code sender into three distinct repositories:
1. **cnc-core** - Shared business logic and CNC control functionality
2. **cnc-api** - REST API server (current repo)
3. **cnc-cli** - Command-line interface (new repo)

## Current State Analysis

### Existing Structure
```
api/ (current repo)
├── src/
│   ├── cnc/              # Core CNC logic (to be extracted)
│   ├── lib/              # Shared services (to be extracted)
│   ├── ui/
│   │   ├── api/          # API server (stays)
│   │   ├── cli/          # CLI interface (to be moved)
│   │   └── ink/          # Interactive CLI (to be moved)
│   └── utils/            # Utilities (to be extracted)
├── locales/              # i18n files (to be shared)
└── scripts/              # Various scripts (split as needed)
```

### Identified Shared Components
- **CNC Control**: GcodeSender, ConnectionManager, CommandExecutor
- **Services**: Logger, Status, Diagnostics, Presets
- **Utilities**: Helpers, parsers, validators
- **Configuration**: Machine settings, tool definitions
- **Internationalization**: Message translations

## Proposed Architecture

### 1. cnc-core (Shared Library)
```
cnc-core/
├── src/
│   ├── cnc/              # Core CNC functionality
│   │   ├── connection/
│   │   ├── commands/
│   │   ├── queries/
│   │   ├── files/
│   │   ├── diagnostics/
│   │   └── alarms/
│   ├── services/         # Shared services
│   │   ├── logger/
│   │   ├── status/
│   │   ├── presets/
│   │   └── reporting/
│   ├── utils/            # Utilities
│   ├── types/            # TypeScript definitions
│   └── index.js          # Main exports
├── locales/              # Shared i18n messages
├── __tests__/            # Core tests
├── package.json
└── README.md
```

### 2. cnc-api (REST API Server)
```
cnc-api/ (current repo, refactored)
├── src/
│   ├── features/         # API feature modules
│   ├── shared/           # API-specific shared code
│   ├── config/           # API configuration
│   └── server.js         # Main server
├── locales/              # API-specific i18n
├── __tests__/            # API tests
├── package.json          # Depends on cnc-core
└── README.md
```

### 3. cnc-cli (Command-line Interface)
```
cnc-cli/ (new repo)
├── src/
│   ├── commands/         # CLI commands
│   │   ├── connect.js
│   │   ├── execute.js
│   │   ├── diagnose.js
│   │   └── interactive.js
│   ├── ink/              # Interactive UI components
│   │   ├── components/
│   │   ├── screens/
│   │   └── app.js
│   ├── utils/            # CLI-specific utilities
│   └── index.js          # Main CLI entry
├── locales/              # CLI-specific i18n
├── __tests__/            # CLI tests
├── package.json          # Depends on cnc-core
└── README.md
```

## Implementation Phases

### Phase 1: Create cnc-core Repository (Week 1-2)

1. **Setup Repository**
   ```bash
   # Create new repo
   git init cnc-core
   cd cnc-core
   npm init
   ```

2. **Extract Core Components**
   - Move `src/cnc/*` to `cnc-core/src/cnc/`
   - Move `src/lib/*` to `cnc-core/src/services/`
   - Move shared utilities to `cnc-core/src/utils/`
   - Move shared locales to `cnc-core/locales/`

3. **Create Export Interface**
   ```javascript
   // cnc-core/src/index.js
   export { GcodeSender } from './cnc/GcodeSender.js';
   export { ConnectionManager } from './cnc/connection/ConnectionManager.js';
   export { CommandExecutor } from './cnc/commands/CommandExecutor.js';
   // ... other exports
   ```

4. **Setup Package Configuration**
   ```json
   {
     "name": "@cnc/core",
     "version": "1.0.0",
     "type": "module",
     "main": "src/index.js",
     "exports": {
       ".": "./src/index.js",
       "./locales/*": "./locales/*"
     }
   }
   ```

5. **Move Tests**
   - Extract relevant tests from current repo
   - Update import paths
   - Ensure all tests pass

### Phase 2: Refactor API Repository (Week 2-3)

1. **Remove Extracted Code**
   - Delete moved directories
   - Update all import statements

2. **Add cnc-core Dependency**
   ```json
   {
     "dependencies": {
       "@cnc/core": "file:../cnc-core"  // Initially use local link
     }
   }
   ```

3. **Update Imports**
   ```javascript
   // Before
   import { GcodeSender } from '../../cnc/GcodeSender.js';
   
   // After
   import { GcodeSender } from '@cnc/core';
   ```

4. **Remove CLI Code**
   - Delete `src/ui/cli/`
   - Delete `src/ui/ink/`
   - Remove CLI-related scripts from package.json

5. **Update Configuration**
   - Keep only API-specific configuration
   - Reference shared config from cnc-core

### Phase 3: Create CLI Repository (Week 3-4)

1. **Setup Repository**
   ```bash
   cd cnc-cli  # Your empty repo
   npm init
   ```

2. **Move CLI Components**
   - Move `src/ui/cli/*` from API repo
   - Move `src/ui/ink/*` from API repo
   - Move CLI-specific scripts

3. **Add Dependencies**
   ```json
   {
     "dependencies": {
       "@cnc/core": "file:../cnc-core",
       "ink": "^4.0.0",
       "commander": "^11.0.0"
     }
   }
   ```

4. **Create CLI Structure**
   ```javascript
   // cnc-cli/src/index.js
   #!/usr/bin/env node
   import { program } from 'commander';
   import { ConnectionManager, GcodeSender } from '@cnc/core';
   
   program
     .version('1.0.0')
     .description('CNC G-code Sender CLI');
   ```

5. **Setup Executable**
   ```json
   {
     "bin": {
       "cnc": "./src/index.js"
     }
   }
   ```

### Phase 4: Dependency Management (Week 4)

1. **Local Development Setup**
   ```bash
   # Link packages for development
   cd cnc-core && npm link
   cd ../cnc-api && npm link @cnc/core
   cd ../cnc-cli && npm link @cnc/core
   ```

2. **CI/CD Configuration**
   - Setup GitHub Actions for each repo
   - Configure automated testing
   - Setup npm publishing for cnc-core

3. **Version Management**
   - Use semantic versioning
   - Coordinate releases between repos
   - Document compatibility matrix

### Phase 5: Testing & Documentation (Week 5)

1. **Integration Testing**
   - Test API with cnc-core
   - Test CLI with cnc-core
   - End-to-end testing

2. **Documentation Updates**
   - Update README files
   - Create migration guide
   - Document development setup

3. **Example Workflows**
   ```bash
   # Development workflow
   git clone cnc-core cnc-api cnc-cli
   cd cnc-core && npm install && npm link
   cd ../cnc-api && npm install && npm link @cnc/core
   cd ../cnc-cli && npm install && npm link @cnc/core
   ```

## Benefits of Separation

### 1. Independent Development
- API and CLI can evolve separately
- Different teams can work on different repos
- Cleaner git history

### 2. Deployment Flexibility
- Deploy API without CLI changes
- Update CLI without API deployment
- Version core library independently

### 3. Better Testing
- Focused test suites
- Faster CI/CD pipelines
- Clearer test boundaries

### 4. Reusability
- Core library can be used by other projects
- Easy to create new UIs (web, mobile)
- Share functionality across products

### 5. Maintenance
- Smaller, focused codebases
- Clear responsibility boundaries
- Easier onboarding

## Migration Checklist

### Pre-Migration
- [ ] Backup current repository
- [ ] Document all dependencies
- [ ] Identify all shared code
- [ ] Plan import path updates
- [ ] Create migration branch

### cnc-core Setup
- [ ] Initialize repository
- [ ] Move core CNC logic
- [ ] Move shared services
- [ ] Move shared utilities
- [ ] Setup exports
- [ ] Move and update tests
- [ ] Configure npm package
- [ ] Test as dependency

### API Refactoring
- [ ] Remove moved code
- [ ] Add cnc-core dependency
- [ ] Update all imports
- [ ] Remove CLI code
- [ ] Update configuration
- [ ] Fix broken tests
- [ ] Update documentation

### CLI Creation
- [ ] Setup repository structure
- [ ] Move CLI code
- [ ] Move Ink components
- [ ] Add dependencies
- [ ] Create entry point
- [ ] Setup executable
- [ ] Move CLI tests
- [ ] Test all commands

### Post-Migration
- [ ] Setup CI/CD for all repos
- [ ] Update deployment scripts
- [ ] Create development guide
- [ ] Update user documentation
- [ ] Plan first releases

## Example Implementation

### cnc-core Usage
```javascript
// In cnc-api
import { GcodeSender, ConnectionManager } from '@cnc/core';

const connectionManager = new ConnectionManager();
const gcodeSender = new GcodeSender(connectionManager);

// In cnc-cli
import { GcodeSender, Logger } from '@cnc/core';
import { createInterface } from './ui/interface.js';

const logger = new Logger({ mode: 'cli' });
const ui = createInterface(gcodeSender, logger);
```

### Shared Configuration
```javascript
// cnc-core/src/config/defaults.js
export const defaultMachineConfig = {
  limits: { x: 400, y: 400, z: 100 },
  speeds: { rapid: 5000, feed: 3000 },
  // ...
};

// Used by both API and CLI
import { defaultMachineConfig } from '@cnc/core/config';
```

## Potential Challenges

### 1. Circular Dependencies
- **Solution**: Careful interface design
- Use dependency injection
- Clear layer boundaries

### 2. Shared State
- **Solution**: State management in core
- Event-based communication
- Clear ownership rules

### 3. Configuration Management
- **Solution**: Core provides defaults
- Apps override as needed
- Environment-specific configs

### 4. Development Complexity
- **Solution**: Good tooling setup
- Clear development guide
- Automated setup scripts

## Success Criteria

1. **Functional**: All existing features work
2. **Performance**: No degradation
3. **Development**: Easy local setup
4. **Testing**: All tests pass
5. **Documentation**: Clear and complete
6. **Deployment**: Smooth CI/CD

## Timeline

- **Week 1-2**: Create cnc-core, extract shared code
- **Week 2-3**: Refactor API repository
- **Week 3-4**: Create CLI repository
- **Week 4**: Setup dependencies and CI/CD
- **Week 5**: Testing and documentation
- **Week 6**: Migration and deployment

## Next Steps

1. Review and approve plan
2. Create cnc-core repository
3. Begin extraction process
4. Weekly progress reviews
5. Adjust plan as needed

This separation will create a more maintainable, scalable architecture that supports future growth while maintaining the current functionality.