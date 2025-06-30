/**
 * API Parser - Extracts endpoints from Express.js route files
 * 
 * Scans the API route files and extracts endpoint information
 * including HTTP methods, paths, descriptions, and parameters.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class APIParser {
  constructor(basePath) {
    this.basePath = basePath;
    this.endpoints = [];
  }

  /**
   * Parse all route files and extract endpoints
   */
  async parseRoutes() {
    const featuresPath = path.join(this.basePath, 'src/ui/api/features');
    
    try {
      const features = await fs.readdir(featuresPath);
      
      for (const feature of features) {
        const featurePath = path.join(featuresPath, feature);
        const stat = await fs.stat(featurePath);
        
        if (stat.isDirectory()) {
          await this.parseFeature(feature, featurePath);
        }
      }
      
      // Also parse main routes
      await this.parseMainRoutes();
      
    } catch (error) {
      console.error('Error parsing routes:', error.message);
    }
    
    return this.endpoints;
  }

  /**
   * Parse a specific feature directory
   */
  async parseFeature(featureName, featurePath) {
    const routesFile = path.join(featurePath, 'routes.js');
    
    try {
      await fs.access(routesFile);
      const content = await fs.readFile(routesFile, 'utf8');
      const endpoints = this.extractEndpointsFromFile(content, featureName);
      this.endpoints.push(...endpoints);
    } catch (error) {
      // Routes file doesn't exist, skip
    }
  }

  /**
   * Parse main API routes (health, info, etc.)
   */
  async parseMainRoutes() {
    const serverFile = path.join(this.basePath, 'src/ui/api/server.js');
    
    try {
      const content = await fs.readFile(serverFile, 'utf8');
      const endpoints = this.extractEndpointsFromFile(content, 'main');
      this.endpoints.push(...endpoints);
    } catch (error) {
      console.error('Error parsing main routes:', error.message);
    }
  }

  /**
   * Extract endpoint information from route file content
   */
  extractEndpointsFromFile(content, featureName) {
    const endpoints = [];
    
    // Extract route definitions using regex patterns
    const routePatterns = [
      /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*,([^}]+)/gi,
      /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*,([^}]+)/gi
    ];

    routePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const [, method, path, handlerContent] = match;
        
        // Extract description from comments or handler names
        const description = this.extractDescription(handlerContent, content, match.index);
        
        // Create endpoint object
        const endpoint = {
          feature: featureName,
          method: method.toUpperCase(),
          path: this.normalizePath(path),
          description: description || `${featureName} endpoint`,
          tags: [this.capitalizeFirst(featureName)],
          parameters: this.extractParameters(path, handlerContent)
        };

        endpoints.push(endpoint);
      }
    });

    return endpoints;
  }

  /**
   * Extract description from comments or function names
   */
  extractDescription(handlerContent, fullContent, matchIndex) {
    // Look for comments before the route definition
    const beforeRoute = fullContent.substring(Math.max(0, matchIndex - 200), matchIndex);
    
    // Extract JSDoc style comments
    const jsdocMatch = beforeRoute.match(/\/\*\*\s*\n\s*\*\s*([^*\n]+)/);
    if (jsdocMatch) {
      return jsdocMatch[1].trim();
    }
    
    // Extract single line comments
    const commentMatch = beforeRoute.match(/\/\/\s*([^\n]+)/);
    if (commentMatch) {
      return commentMatch[1].trim();
    }
    
    // Extract from handler function names
    const handlerMatch = handlerContent.match(/(\w+Controller|get\w+|post\w+|delete\w+)/);
    if (handlerMatch) {
      return this.humanizeMethodName(handlerMatch[1]);
    }
    
    return null;
  }

  /**
   * Extract parameters from path and handler content
   */
  extractParameters(path, handlerContent) {
    const parameters = [];
    
    // Extract path parameters
    const pathParams = path.match(/:(\w+)/g);
    if (pathParams) {
      pathParams.forEach(param => {
        parameters.push({
          name: param.substring(1),
          in: 'path',
          required: true,
          type: 'string'
        });
      });
    }
    
    // Check if route expects body (POST, PUT, PATCH methods)
    if (handlerContent.includes('req.body') || handlerContent.includes('body')) {
      parameters.push({
        name: 'body',
        in: 'body',
        required: true,
        type: 'object'
      });
    }
    
    return parameters;
  }

  /**
   * Normalize API path for consistency
   */
  normalizePath(path) {
    // Convert Express path params to OpenAPI format
    return path.replace(/:(\w+)/g, '{$1}');
  }

  /**
   * Convert method names to human readable descriptions
   */
  humanizeMethodName(methodName) {
    return methodName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Capitalize first letter
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get endpoint statistics
   */
  getStatistics() {
    const features = [...new Set(this.endpoints.map(e => e.feature))];
    const methods = [...new Set(this.endpoints.map(e => e.method))];
    
    const toolsByFeature = {};
    features.forEach(feature => {
      toolsByFeature[feature] = this.endpoints.filter(e => e.feature === feature).length;
    });
    
    return {
      totalEndpoints: this.endpoints.length,
      totalTools: this.endpoints.length,
      features,
      httpMethods: methods,
      toolsByFeature
    };
  }
}