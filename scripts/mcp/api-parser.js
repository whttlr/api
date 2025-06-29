/**
 * API Parser for MCP Documentation Generation
 * 
 * Extracts API endpoint information from Express.js route files
 * with Swagger/OpenAPI documentation to generate MCP tool definitions.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class APIParser {
  constructor() {
    this.apiBasePath = path.join(__dirname, '../../src/ui/api');
    this.featuresPath = path.join(this.apiBasePath, 'features');
    this.endpoints = [];
  }

  /**
   * Parse all API route files and extract endpoint information
   */
  async parseAllRoutes() {
    console.log('🔍 Parsing API routes for MCP documentation...');
    
    // Parse feature-based routes
    const features = await this.getFeatureDirectories();
    
    for (const feature of features) {
      await this.parseFeatureRoutes(feature);
    }

    // Parse main route file
    await this.parseMainRoutes();

    console.log(`✅ Found ${this.endpoints.length} API endpoints`);
    return this.endpoints;
  }

  /**
   * Get list of feature directories
   */
  async getFeatureDirectories() {
    const featuresDir = this.featuresPath;
    if (!fs.existsSync(featuresDir)) {
      return [];
    }

    return fs.readdirSync(featuresDir)
      .filter(item => {
        const itemPath = path.join(featuresDir, item);
        return fs.statSync(itemPath).isDirectory();
      });
  }

  /**
   * Parse routes for a specific feature
   */
  async parseFeatureRoutes(featureName) {
    const routesFile = path.join(this.featuresPath, featureName, 'routes.js');
    
    if (!fs.existsSync(routesFile)) {
      console.log(`⚠️  No routes.js found for feature: ${featureName}`);
      return;
    }

    const content = fs.readFileSync(routesFile, 'utf8');
    const endpoints = this.extractEndpointsFromFile(content, featureName);
    
    console.log(`📋 Found ${endpoints.length} endpoints in ${featureName} feature`);
    this.endpoints.push(...endpoints);
  }

  /**
   * Parse main routes file
   */
  async parseMainRoutes() {
    const mainRoutesFile = path.join(this.apiBasePath, 'routes/index.js');
    
    if (!fs.existsSync(mainRoutesFile)) {
      return;
    }

    const content = fs.readFileSync(mainRoutesFile, 'utf8');
    const endpoints = this.extractEndpointsFromFile(content, 'main');
    
    console.log(`📋 Found ${endpoints.length} endpoints in main routes`);
    this.endpoints.push(...endpoints);
  }

  /**
   * Extract endpoint information from a route file
   */
  extractEndpointsFromFile(content, featureName) {
    const endpoints = [];
    const lines = content.split('\n');
    
    let currentSwaggerDoc = null;
    let currentEndpoint = null;
    let inSwaggerDoc = false;
    let swaggerLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Start of Swagger documentation
      if (line.includes('* @swagger')) {
        inSwaggerDoc = true;
        swaggerLines = [];
        continue;
      }

      // End of Swagger documentation (route definition)
      if (inSwaggerDoc && line.startsWith('router.')) {
        currentSwaggerDoc = this.parseSwaggerDoc(swaggerLines);
        currentEndpoint = this.parseRouteDefinition(line);
        
        if (currentSwaggerDoc && currentEndpoint) {
          endpoints.push({
            ...currentEndpoint,
            ...currentSwaggerDoc,
            feature: featureName,
            sourceFile: `features/${featureName}/routes.js`
          });
        }
        
        inSwaggerDoc = false;
        currentSwaggerDoc = null;
        currentEndpoint = null;
        continue;
      }

      // Collect Swagger documentation lines
      if (inSwaggerDoc && line.startsWith('*')) {
        swaggerLines.push(line.substring(1).trim());
      }
    }

    return endpoints;
  }

  /**
   * Parse Swagger documentation block
   */
  parseSwaggerDoc(swaggerLines) {
    const doc = {
      path: null,
      method: null,
      summary: null,
      description: null,
      tags: [],
      parameters: [],
      requestBody: null,
      responses: {}
    };

    let currentSection = null;
    let currentIndent = 0;

    for (const line of swaggerLines) {
      if (!line) continue;

      const indent = line.search(/\S/);
      const content = line.trim();

      // Path definition
      if (content.startsWith('/api/v1/')) {
        const pathMatch = content.match(/^(\/api\/v1\/[^:]+):/);
        if (pathMatch) {
          doc.path = pathMatch[1];
        }
        continue;
      }

      // HTTP method
      if (['get:', 'post:', 'put:', 'delete:', 'patch:'].includes(content)) {
        doc.method = content.replace(':', '').toUpperCase();
        continue;
      }

      // Summary
      if (content.startsWith('summary:')) {
        doc.summary = content.replace('summary:', '').trim();
        continue;
      }

      // Description
      if (content.startsWith('description:')) {
        doc.description = content.replace('description:', '').trim();
        continue;
      }

      // Tags
      if (content.startsWith('tags:')) {
        const tagsMatch = content.match(/tags:\s*\[([^\]]+)\]/);
        if (tagsMatch) {
          doc.tags = tagsMatch[1].split(',').map(tag => tag.trim());
        }
        continue;
      }

      // Parameters, requestBody, responses would need more complex parsing
      // For now, capturing basic info is sufficient for MCP generation
    }

    return doc;
  }

  /**
   * Parse Express route definition
   */
  parseRouteDefinition(line) {
    const routeMatch = line.match(/router\.(get|post|put|delete|patch)\(['"](.*?)['"].*?\)/);
    
    if (!routeMatch) return null;

    return {
      method: routeMatch[1].toUpperCase(),
      routePath: routeMatch[2],
      rawLine: line
    };
  }

  /**
   * Generate MCP-friendly endpoint data
   */
  generateMCPEndpoints() {
    return this.endpoints.map(endpoint => ({
      name: this.generateMCPToolName(endpoint),
      path: endpoint.path || `/api/v1/${endpoint.feature}${endpoint.routePath}`,
      method: endpoint.method,
      summary: endpoint.summary || `${endpoint.method} ${endpoint.routePath}`,
      description: endpoint.description || endpoint.summary,
      feature: endpoint.feature,
      tags: endpoint.tags || [endpoint.feature],
      parameters: this.extractParameters(endpoint),
      authentication: this.requiresAuthentication(endpoint),
      sourceFile: endpoint.sourceFile
    }));
  }

  /**
   * Generate MCP tool name from endpoint
   */
  generateMCPToolName(endpoint) {
    const feature = endpoint.feature;
    const path = endpoint.routePath || endpoint.path;
    const method = endpoint.method.toLowerCase();
    
    // Convert path to readable name
    let pathName = path
      .replace(/^\//, '')
      .replace(/\//g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '');

    // Handle common patterns
    if (pathName === '') pathName = 'index';
    if (pathName === 'status') pathName = 'get_status';
    if (pathName === 'health') pathName = 'get_health';

    // Combine with method and feature
    if (method === 'get') {
      return `${feature}_${pathName}`;
    } else {
      return `${feature}_${method}_${pathName}`;
    }
  }

  /**
   * Extract parameters from endpoint
   */
  extractParameters(endpoint) {
    const params = [];
    
    // Extract path parameters
    const pathParams = (endpoint.path || endpoint.routePath || '').match(/:(\w+)/g);
    if (pathParams) {
      pathParams.forEach(param => {
        params.push({
          name: param.substring(1),
          type: 'string',
          in: 'path',
          required: true
        });
      });
    }

    // For POST/PUT/PATCH, assume JSON body
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      params.push({
        name: 'body',
        type: 'object',
        in: 'body',
        required: true,
        description: 'Request body data'
      });
    }

    return params;
  }

  /**
   * Determine if endpoint requires authentication
   */
  requiresAuthentication(endpoint) {
    // For now, assume no authentication required
    // This could be enhanced to check for auth middleware
    return false;
  }
}

export default APIParser;