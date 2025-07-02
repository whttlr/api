# Separate Repository Distribution Strategy

## Overview
This strategy allows you to maintain separate repositories for your Electron app and Node.js API while still distributing them as a single application. This approach preserves your current development workflow while solving the distribution challenge.

## Current Architecture
```
Project Structure:
├── electron-app/          # UI Repository (React + Electron)
└── api/                   # API Repository (Node.js + Express)
```

## Distribution Strategy: Build-Time Integration

### Core Concept
- **Development**: Keep repos completely separate
- **Build Process**: Electron app fetches and bundles API during build
- **Distribution**: Single executable with embedded API server
- **Runtime**: Electron manages API as child process

## Implementation Plan

### Phase 1: Electron App Modifications

#### 1.1 Add API Integration Scripts

Create `electron-app/scripts/api-integration.js`:

```javascript
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class ApiIntegrator {
  constructor(options = {}) {
    this.apiRepoPath = options.apiRepoPath || '../api';
    this.buildDir = path.join(__dirname, '..', 'build-resources', 'api');
    this.tempDir = path.join(__dirname, '..', 'temp-api');
  }

  async integrateApi() {
    console.log('🔄 Starting API integration...');
    
    try {
      await this.cleanBuildDir();
      await this.fetchApiCode();
      await this.prepareApiForProduction();
      await this.copyToBuildResources();
      await this.cleanup();
      
      console.log('✅ API integration complete!');
    } catch (error) {
      console.error('❌ API integration failed:', error);
      await this.cleanup();
      throw error;
    }
  }

  async cleanBuildDir() {
    console.log('🧹 Cleaning build directory...');
    await fs.emptyDir(this.buildDir);
  }

  async fetchApiCode() {
    console.log('📥 Fetching API code...');
    
    // Remove existing temp directory
    await fs.remove(this.tempDir);
    
    // Method 1: Local copy (for development)
    if (fs.existsSync(this.apiRepoPath)) {
      await fs.copy(this.apiRepoPath, this.tempDir, {
        filter: (src) => {
          // Exclude unnecessary files
          const excludes = [
            'node_modules', '.git', '.github', 
            'coverage', 'dist', '.env', 
            '*.log', '.DS_Store'
          ];
          return !excludes.some(exclude => src.includes(exclude));
        }
      });
    }
    // Method 2: Git clone (for CI/CD)
    else if (process.env.API_REPO_URL) {
      execSync(`git clone ${process.env.API_REPO_URL} ${this.tempDir}`, {
        stdio: 'inherit'
      });
    }
    // Method 3: Download from GitHub releases
    else {
      throw new Error('API source not found. Set API_REPO_URL or ensure ../api exists');
    }
  }

  async prepareApiForProduction() {
    console.log('🔧 Preparing API for production...');
    
    const apiPackageJson = path.join(this.tempDir, 'package.json');
    const originalPkg = await fs.readJson(apiPackageJson);
    
    // Install production dependencies
    execSync('npm ci --production', {
      cwd: this.tempDir,
      stdio: 'inherit'
    });
    
    // Create production package.json
    const prodPkg = {
      name: originalPkg.name,
      version: originalPkg.version,
      description: originalPkg.description,
      main: originalPkg.main,
      type: originalPkg.type,
      dependencies: originalPkg.dependencies,
      scripts: {
        start: originalPkg.scripts.start
      }
    };
    
    await fs.writeJson(apiPackageJson, prodPkg, { spaces: 2 });
  }

  async copyToBuildResources() {
    console.log('📦 Copying to build resources...');
    await fs.copy(this.tempDir, this.buildDir);
  }

  async cleanup() {
    console.log('🧽 Cleaning up temporary files...');
    await fs.remove(this.tempDir);
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const integrator = new ApiIntegrator();
  integrator.integrateApi().catch(process.exit);
}

export default ApiIntegrator;
```

#### 1.2 API Server Manager

Create `electron-app/src/main/services/embedded-api-server.js`:

```javascript
import { spawn } from 'child_process';
import { app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class EmbeddedApiServer {
  constructor() {
    this.process = null;
    this.port = null;
    this.isReady = false;
    this.baseUrl = null;
  }

  async start() {
    console.log('🚀 Starting embedded API server...');
    
    try {
      // Find available port
      this.port = await this.findAvailablePort(3000);
      
      // Get API server path
      const serverPath = this.getServerPath();
      
      // Set up environment
      const env = {
        ...process.env,
        PORT: this.port,
        NODE_ENV: 'production',
        EMBEDDED_MODE: 'true'
      };
      
      // Start the server process
      this.process = spawn(process.execPath, [serverPath], {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });
      
      // Handle process output
      this.setupProcessHandlers();
      
      // Wait for server to be ready
      await this.waitForServer();
      
      this.baseUrl = `http://localhost:${this.port}`;
      this.isReady = true;
      
      console.log(`✅ API server ready at ${this.baseUrl}`);
      return this.baseUrl;
      
    } catch (error) {
      console.error('❌ Failed to start API server:', error);
      throw error;
    }
  }

  getServerPath() {
    if (app.isPackaged) {
      // Production: API bundled in resources
      return path.join(process.resourcesPath, 'api', 'src', 'server.js');
    } else {
      // Development: Use local API
      return path.join(__dirname, '..', '..', '..', '..', 'api', 'src', 'server.js');
    }
  }

  setupProcessHandlers() {
    this.process.stdout.on('data', (data) => {
      console.log(`[API] ${data.toString().trim()}`);
    });
    
    this.process.stderr.on('data', (data) => {
      console.error(`[API Error] ${data.toString().trim()}`);
    });
    
    this.process.on('exit', (code) => {
      console.log(`[API] Process exited with code ${code}`);
      this.isReady = false;
    });
    
    this.process.on('error', (error) => {
      console.error('[API] Process error:', error);
      this.isReady = false;
    });
  }

  async findAvailablePort(startPort) {
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      
      server.listen(startPort, () => {
        const port = server.address().port;
        server.close(() => resolve(port));
      });
      
      server.on('error', () => {
        if (startPort < 65535) {
          resolve(this.findAvailablePort(startPort + 1));
        } else {
          reject(new Error('No available ports found'));
        }
      });
    });
  }

  async waitForServer(maxAttempts = 30, interval = 1000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`http://localhost:${this.port}/health`, {
          timeout: 2000
        });
        
        if (response.ok) {
          console.log(`✅ API health check passed (attempt ${attempt})`);
          return true;
        }
      } catch (error) {
        console.log(`⏳ Waiting for API server... (attempt ${attempt}/${maxAttempts})`);
      }
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    throw new Error(`API server failed to start after ${maxAttempts} attempts`);
  }

  stop() {
    if (this.process && !this.process.killed) {
      console.log('🛑 Stopping API server...');
      this.process.kill('SIGTERM');
      
      // Force kill after timeout
      setTimeout(() => {
        if (!this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    }
    
    this.process = null;
    this.isReady = false;
    this.baseUrl = null;
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  isServerReady() {
    return this.isReady;
  }
}
```

#### 1.3 Update Main Process

Modify `electron-app/src/main/main.js`:

```javascript
import { app, BrowserWindow, ipcMain } from 'electron';
import { EmbeddedApiServer } from './services/embedded-api-server.js';
import path from 'path';

let mainWindow;
let apiServer;

async function createWindow() {
  // Start embedded API server
  console.log('🔄 Initializing application...');
  
  try {
    apiServer = new EmbeddedApiServer();
    const apiUrl = await apiServer.start();
    
    // Create the browser window
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false, // Don't show until ready
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload', 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true
      }
    });

    // Set up IPC handlers
    setupIpcHandlers();

    // Load the app
    const startUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:5173'
      : `file://${path.join(__dirname, '..', '..', 'dist', 'index.html')}`;
    
    await mainWindow.loadURL(startUrl);
    
    // Send API configuration to renderer
    mainWindow.webContents.send('api-ready', {
      baseUrl: apiUrl
    });
    
    // Show window when ready
    mainWindow.show();
    
    console.log('✅ Application ready!');
    
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    app.quit();
  }
}

function setupIpcHandlers() {
  // API configuration
  ipcMain.handle('get-api-config', () => ({
    baseUrl: apiServer?.getBaseUrl(),
    ready: apiServer?.isServerReady()
  }));
  
  // API health check
  ipcMain.handle('api-health-check', async () => {
    if (!apiServer?.isServerReady()) {
      return { healthy: false, error: 'API server not ready' };
    }
    
    try {
      const response = await fetch(`${apiServer.getBaseUrl()}/health`);
      return { healthy: response.ok };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  });
}

// App event handlers
app.whenReady().then(createWindow);

app.on('before-quit', () => {
  console.log('🔄 Shutting down...');
  apiServer?.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

#### 1.4 API Client for Renderer

Create `electron-app/src/renderer/services/api-client.js`:

```javascript
class ApiClient {
  constructor() {
    this.baseUrl = null;
    this.ready = false;
    this.initPromise = null;
  }

  async initialize() {
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  async _doInitialize() {
    try {
      const config = await window.electronAPI.getApiConfig();
      
      if (!config.ready || !config.baseUrl) {
        throw new Error('API server not ready');
      }
      
      this.baseUrl = config.baseUrl;
      this.ready = true;
      
      console.log('✅ API client initialized:', this.baseUrl);
    } catch (error) {
      console.error('❌ Failed to initialize API client:', error);
      throw error;
    }
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
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  // CNC-specific API methods
  async getConnectionStatus() {
    return this.request('/api/connection/status');
  }

  async connect(port) {
    return this.request('/api/connection/connect', {
      method: 'POST',
      body: JSON.stringify({ port })
    });
  }

  async disconnect() {
    return this.request('/api/connection/disconnect', {
      method: 'POST'
    });
  }

  async getMachineStatus() {
    return this.request('/api/machine/status');
  }

  async sendGcode(commands) {
    return this.request('/api/gcode/execute', {
      method: 'POST',
      body: JSON.stringify({ 
        commands: Array.isArray(commands) ? commands : [commands]
      })
    });
  }

  async listSerialPorts() {
    return this.request('/api/connection/ports');
  }

  async uploadGcodeFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.request('/api/files/upload', {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set Content-Type for FormData
    });
  }

  async healthCheck() {
    try {
      const health = await window.electronAPI.apiHealthCheck();
      return health;
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;
```

### Phase 2: Build System Integration

#### 2.1 Update Package.json Scripts

Modify `electron-app/package.json`:

```json
{
  "scripts": {
    "integrate-api": "node scripts/api-integration.js",
    "build:with-api": "npm run integrate-api && npm run build:all",
    "electron:build": "npm run build:with-api && electron-builder",
    "electron:build:mac": "npm run build:with-api && electron-builder --mac",
    "electron:build:win": "npm run build:with-api && electron-builder --win",
    "electron:build:linux": "npm run build:with-api && electron-builder --linux",
    "dev": "npm run integrate-api && npm run electron:dev"
  }
}
```

#### 2.2 Electron Builder Configuration

Update the `build` section in `electron-app/package.json`:

```json
{
  "build": {
    "appId": "com.whttlr.cnc-controller",
    "productName": "CNC Controller",
    "directories": {
      "buildResources": "build-resources",
      "output": "dist-electron"
    },
    "files": [
      "dist/**/*",
      "dist-electron/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "extraResources": [
      {
        "from": "build-resources/api",
        "to": "api",
        "filter": ["**/*"]
      }
    ],
    "extraMetadata": {
      "main": "dist-electron/main/main.js"
    }
  }
}
```

#### 2.3 Environment Configuration

Create `electron-app/.env.example`:

```bash
# Development API Configuration
API_REPO_PATH=../api
API_REPO_URL=https://github.com/your-org/cnc-api.git

# Production API Configuration  
NODE_ENV=production
```

### Phase 3: Development Workflow

#### 3.1 Development Setup

```bash
# Terminal 1 - API Development
cd api
npm run dev

# Terminal 2 - Electron Development  
cd electron-app
npm run start  # Vite dev server

# Terminal 3 - Electron App
cd electron-app
npm run electron:dev
```

#### 3.2 Build Process

```bash
# Local build with current API
cd electron-app
npm run electron:build

# CI/CD build with API from git
cd electron-app  
API_REPO_URL=https://github.com/your-org/api.git npm run electron:build
```

### Phase 4: CI/CD Integration

#### 4.1 GitHub Actions Workflow

Create `electron-app/.github/workflows/build.yml`:

```yaml
name: Build and Release

on:
  push:
    tags: ['v*']
  workflow_dispatch:

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]
    
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build with API
        env:
          API_REPO_URL: https://github.com/${{ github.repository_owner }}/api.git
        run: npm run electron:build
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-build
          path: dist-electron/
```

### Phase 5: API Modifications

#### 5.1 API Health Endpoint

Add to your `api/src/ui/api/routes/health.js`:

```javascript
import express from 'express';
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    mode: process.env.EMBEDDED_MODE ? 'embedded' : 'standalone'
  });
});

export default router;
```

#### 5.2 Embedded Mode Configuration

Create `api/src/config/embedded.js`:

```javascript
export const embeddedConfig = {
  // Disable certain features in embedded mode
  cors: {
    origin: ['http://localhost:5173', 'file://'],
    credentials: true
  },
  
  // Reduce logging in embedded mode
  logging: {
    level: process.env.EMBEDDED_MODE ? 'error' : 'info'
  },
  
  // Embedded-specific settings
  embedded: {
    enabled: process.env.EMBEDDED_MODE === 'true',
    parentProcess: process.ppid
  }
};
```

## Development Benefits

### ✅ Advantages
- **Separate Development**: Each team can work independently
- **Version Control**: Independent releases and versioning
- **Testing**: Test each component separately
- **CI/CD**: Independent deployment pipelines
- **Single Distribution**: Users get one installer

### ⚠️ Considerations
- **Build Complexity**: More complex build process
- **Dependency Management**: Need to sync API changes
- **Testing**: Need integration testing
- **Documentation**: Must document both repos

## Testing Strategy

### Unit Testing
- **API**: Test independently as before
- **Electron**: Mock API responses for UI testing

### Integration Testing
```javascript
// electron-app/src/__tests__/api-integration.test.js
import { EmbeddedApiServer } from '../main/services/embedded-api-server.js';

describe('API Integration', () => {
  let apiServer;
  
  beforeAll(async () => {
    apiServer = new EmbeddedApiServer();
    await apiServer.start();
  });
  
  afterAll(async () => {
    apiServer.stop();
  });
  
  test('API server starts successfully', () => {
    expect(apiServer.isServerReady()).toBe(true);
    expect(apiServer.getBaseUrl()).toMatch(/http:\/\/localhost:\d+/);
  });
  
  test('Health endpoint responds', async () => {
    const response = await fetch(`${apiServer.getBaseUrl()}/health`);
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.status).toBe('healthy');
  });
});
```

## Deployment Options

### Option A: Manual Sync
- Manually copy API updates to Electron build
- Good for small teams

### Option B: Git Submodules
```bash
cd electron-app
git submodule add https://github.com/your-org/api.git api-backend
git submodule update --remote
```

### Option C: NPM Package
- Publish API as private NPM package
- Install as dependency in Electron app

### Option D: Automated Sync
- GitHub Actions to trigger Electron builds on API changes
- Webhook-based integration

## Conclusion

This strategy allows you to:
- ✅ Keep separate repositories and development workflows
- ✅ Distribute as a single application
- ✅ Maintain code ownership boundaries
- ✅ Scale development teams independently
- ✅ Provide seamless user experience

The build-time integration approach gives you the best of both worlds: development flexibility with distribution simplicity.