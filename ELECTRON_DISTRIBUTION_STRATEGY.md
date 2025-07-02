# Electron + Node.js API Distribution Strategy

## Overview
This document outlines a comprehensive strategy for distributing your Electron app with its Node.js API backend as a single, cohesive application. The solution ensures both components work together seamlessly while maintaining access to system resources like serial ports.

## Current Architecture Analysis

### Electron App (Frontend)
- **Framework**: React-based Electron app
- **Dependencies**: Three.js for 3D visualization, Ant Design for UI
- **Serial Access**: Direct through `serialport` package
- **Build System**: Vite + electron-builder

### API Backend
- **Framework**: Express.js REST API
- **Module System**: ES modules
- **Dependencies**: Core CNC library (@cnc/core)
- **Serial Access**: Through CNC core library
- **Server**: Runs on port 3000 (configurable)

## Distribution Strategy Options

### Option 1: Embedded Node.js Server (Recommended)
Bundle the API server as a child process within the Electron app.

**Pros:**
- Single executable distribution
- Automatic API lifecycle management
- Shared serial port access coordination
- No port conflicts for end users

**Cons:**
- Slightly more complex build process
- Need to handle server process management

### Option 2: Separate Bundled Services
Package both as separate executables in the same installer.

**Pros:**
- Clear separation of concerns
- Independent scaling/updates possible
- Easier debugging

**Cons:**
- More complex installation
- Port management challenges
- Service coordination required

## Recommended Implementation: Embedded Server

### Architecture Design

```
electron-app/
├── src/
│   ├── main/               # Electron main process
│   │   ├── main.js         # Main entry point
│   │   ├── api-manager.js  # API server manager
│   │   └── ipc-handlers.js # IPC communication
│   ├── renderer/           # React UI
│   └── preload/            # Preload scripts
├── api-backend/            # Embedded API
│   └── [copy of API code]
├── build-resources/
│   └── api/               # API build artifacts
└── package.json
```

### Implementation Steps

#### 1. Project Structure Preparation

Create a new structure in your Electron app:

```bash
# In electron-app directory
mkdir -p api-backend
mkdir -p src/main/services
mkdir -p build-resources/api
```

#### 2. API Server Manager

Create `src/main/services/api-manager.js`:

```javascript
import { spawn, fork } from 'child_process';
import { app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class ApiServerManager {
  constructor() {
    this.apiProcess = null;
    this.apiPort = 3000;
    this.isProduction = app.isPackaged;
  }

  async findAvailablePort(startPort = 3000) {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(startPort, () => {
        const port = server.address().port;
        server.close(() => resolve(port));
      });
      server.on('error', () => {
        resolve(this.findAvailablePort(startPort + 1));
      });
    });
  }

  async start() {
    try {
      // Find available port
      this.apiPort = await this.findAvailablePort(3000);
      
      const apiPath = this.isProduction
        ? path.join(process.resourcesPath, 'api', 'server.js')
        : path.join(__dirname, '..', '..', '..', 'api-backend', 'src', 'server.js');

      // Set environment variables for the API
      const env = {
        ...process.env,
        PORT: this.apiPort,
        NODE_ENV: this.isProduction ? 'production' : 'development',
        ELECTRON_RUN_AS_NODE: '1'
      };

      // Start the API server
      if (this.isProduction) {
        this.apiProcess = spawn(process.execPath, [apiPath], {
          env,
          stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });
      } else {
        this.apiProcess = fork(apiPath, [], {
          env,
          silent: false
        });
      }

      // Handle API server output
      this.apiProcess.stdout?.on('data', (data) => {
        console.log(`[API]: ${data.toString()}`);
      });

      this.apiProcess.stderr?.on('data', (data) => {
        console.error(`[API Error]: ${data.toString()}`);
      });

      // Wait for server to be ready
      await this.waitForServer();
      
      console.log(`API server started on port ${this.apiPort}`);
      return this.apiPort;
    } catch (error) {
      console.error('Failed to start API server:', error);
      throw error;
    }
  }

  async waitForServer(maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`http://localhost:${this.apiPort}/health`);
        if (response.ok) return true;
      } catch (e) {
        // Server not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('API server failed to start in time');
  }

  stop() {
    if (this.apiProcess) {
      this.apiProcess.kill();
      this.apiProcess = null;
    }
  }

  getPort() {
    return this.apiPort;
  }

  getBaseUrl() {
    return `http://localhost:${this.apiPort}`;
  }
}

export default ApiServerManager;
```

#### 3. Main Process Integration

Update `src/main/main.js`:

```javascript
import { app, BrowserWindow, ipcMain } from 'electron';
import ApiServerManager from './services/api-manager.js';

let mainWindow;
let apiManager;

async function createWindow() {
  // Start API server before creating window
  apiManager = new ApiServerManager();
  const apiPort = await apiManager.start();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Pass API URL to renderer
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('api-config', {
      baseUrl: apiManager.getBaseUrl()
    });
  });

  // Load your app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  }
}

// IPC handlers for API communication
ipcMain.handle('get-api-config', () => ({
  baseUrl: apiManager.getBaseUrl()
}));

app.whenReady().then(createWindow);

app.on('before-quit', () => {
  apiManager?.stop();
});
```

#### 4. Renderer Integration

Create an API client service for the renderer:

```javascript
// src/renderer/services/api-client.js
class ApiClient {
  constructor() {
    this.baseUrl = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    // Get API config from main process
    const config = await window.electronAPI.getApiConfig();
    this.baseUrl = config.baseUrl;
    this.initialized = true;
  }

  async request(endpoint, options = {}) {
    await this.initialize();
    
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // CNC-specific methods
  async connect(port) {
    return this.request('/connection/connect', {
      method: 'POST',
      body: JSON.stringify({ port })
    });
  }

  async disconnect() {
    return this.request('/connection/disconnect', {
      method: 'POST'
    });
  }

  async sendGcode(commands) {
    return this.request('/gcode/execute', {
      method: 'POST',
      body: JSON.stringify({ commands })
    });
  }

  async getMachineStatus() {
    return this.request('/machine/status');
  }
}

export default new ApiClient();
```

#### 5. Build Configuration

Update `package.json` for the Electron app:

```json
{
  "scripts": {
    "build:api": "node scripts/build-api.js",
    "electron:build": "npm run build:api && npm run build:all && electron-builder",
    "postinstall": "electron-builder install-app-deps && npm run copy-api"
  },
  "build": {
    "extraResources": [
      {
        "from": "build-resources/api",
        "to": "api",
        "filter": ["**/*"]
      }
    ],
    "files": [
      "dist/**/*",
      "dist-electron/**/*",
      "!api-backend/**/*"
    ]
  }
}
```

Create `scripts/build-api.js`:

```javascript
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function buildApi() {
  console.log('Building API for distribution...');
  
  const apiSource = path.join(__dirname, '..', 'api-backend');
  const apiBuild = path.join(__dirname, '..', 'build-resources', 'api');
  
  // Clean build directory
  await fs.emptyDir(apiBuild);
  
  // Copy API files
  await fs.copy(apiSource, apiBuild, {
    filter: (src) => {
      // Exclude unnecessary files
      const exclude = ['node_modules', '.git', 'test', '__tests__', '.env'];
      return !exclude.some(ex => src.includes(ex));
    }
  });
  
  // Install production dependencies
  console.log('Installing API dependencies...');
  execSync('npm install --production', {
    cwd: apiBuild,
    stdio: 'inherit'
  });
  
  // Create a minimal package.json for production
  const pkg = await fs.readJson(path.join(apiSource, 'package.json'));
  const prodPkg = {
    name: pkg.name,
    version: pkg.version,
    main: pkg.main,
    type: pkg.type,
    dependencies: pkg.dependencies
  };
  
  await fs.writeJson(path.join(apiBuild, 'package.json'), prodPkg, { spaces: 2 });
  
  console.log('API build complete!');
}

buildApi().catch(console.error);
```

### Serial Port Coordination

To prevent conflicts between the Electron app and API accessing serial ports:

#### 1. Centralized Serial Management

Create a serial port manager in the main process:

```javascript
// src/main/services/serial-manager.js
import { SerialPort } from 'serialport';

class SerialPortManager {
  constructor() {
    this.activePorts = new Map();
    this.portOwners = new Map();
  }

  async listPorts() {
    return SerialPort.list();
  }

  async acquirePort(port, owner) {
    if (this.portOwners.has(port)) {
      const currentOwner = this.portOwners.get(port);
      if (currentOwner !== owner) {
        throw new Error(`Port ${port} is already in use by ${currentOwner}`);
      }
      return this.activePorts.get(port);
    }

    const serialPort = new SerialPort({
      path: port,
      baudRate: 115200,
      autoOpen: false
    });

    await new Promise((resolve, reject) => {
      serialPort.open((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    this.activePorts.set(port, serialPort);
    this.portOwners.set(port, owner);
    
    return serialPort;
  }

  releasePort(port, owner) {
    if (this.portOwners.get(port) !== owner) {
      throw new Error('Cannot release port owned by another process');
    }

    const serialPort = this.activePorts.get(port);
    if (serialPort) {
      serialPort.close();
      this.activePorts.delete(port);
      this.portOwners.delete(port);
    }
  }
}

export default SerialPortManager;
```

#### 2. IPC Communication for Serial Access

Add IPC handlers in main process:

```javascript
// In main.js
import SerialPortManager from './services/serial-manager.js';

const serialManager = new SerialPortManager();

ipcMain.handle('serial:list', async () => {
  return serialManager.listPorts();
});

ipcMain.handle('serial:acquire', async (event, { port, owner }) => {
  await serialManager.acquirePort(port, owner);
  return true;
});

ipcMain.handle('serial:release', async (event, { port, owner }) => {
  serialManager.releasePort(port, owner);
  return true;
});
```

### Environment Configuration

Create different configs for development and production:

```javascript
// src/main/config/index.js
export const config = {
  development: {
    apiUrl: 'http://localhost:3000',
    useEmbeddedApi: false
  },
  production: {
    apiUrl: null, // Will be set dynamically
    useEmbeddedApi: true
  }
};

export function getConfig() {
  const env = process.env.NODE_ENV || 'production';
  return config[env];
}
```

### Deployment Configuration

#### Windows (NSIS)
```json
{
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "include": "build/installer.nsh"
  }
}
```

#### macOS
```json
{
  "mac": {
    "category": "public.app-category.developer-tools",
    "hardenedRuntime": true,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist",
    "target": [{
      "target": "dmg",
      "arch": ["x64", "arm64"]
    }]
  }
}
```

#### Linux
```json
{
  "linux": {
    "target": "AppImage",
    "category": "Development",
    "executableArgs": ["--no-sandbox"]
  }
}
```

### Testing Strategy

1. **Development Testing**
   - Run API separately: `cd api && npm start`
   - Run Electron: `npm run electron:dev`
   - Use environment variable to disable embedded API

2. **Integration Testing**
   - Test embedded API startup
   - Verify port management
   - Check serial port coordination
   - Test API lifecycle management

3. **Distribution Testing**
   - Build for each platform
   - Test installation process
   - Verify API starts with app
   - Check resource paths

### Security Considerations

1. **API Access Control**
   - Bind API to localhost only
   - Implement API key authentication
   - Use secure IPC communication

2. **Serial Port Security**
   - Validate port paths
   - Implement permission checks
   - Log all serial operations

3. **Process Isolation**
   - Run API in separate process
   - Use context isolation in renderer
   - Minimize exposed APIs

### Troubleshooting Guide

Common issues and solutions:

1. **Port Conflicts**
   - Implement dynamic port allocation
   - Check for existing processes
   - Provide port configuration

2. **API Startup Failures**
   - Add comprehensive logging
   - Implement retry logic
   - Provide fallback options

3. **Serial Port Access**
   - Handle permission errors
   - Provide clear error messages
   - Implement device detection

## Alternative Approaches

### Using Electron Forge
Electron Forge provides better tooling for complex apps:

```bash
npm install --save-dev @electron-forge/cli
npx electron-forge import
```

### Using Electron Builder with Custom Scripts
Leverage electron-builder's extensive hook system for custom build steps.

## Conclusion

This strategy provides a robust solution for distributing your Electron CNC control app with its Node.js API backend. The embedded server approach ensures a seamless user experience while maintaining the flexibility and power of a full REST API.

Key benefits:
- Single installation package
- Automatic API lifecycle management  
- No port configuration for users
- Coordinated serial port access
- Professional distribution for all platforms

Next steps:
1. Set up the project structure
2. Implement the API manager
3. Test the embedded server
4. Configure build process
5. Test on all target platforms