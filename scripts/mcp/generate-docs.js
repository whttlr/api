#!/usr/bin/env node

/**
 * MCP Documentation Generation Script
 * 
 * Orchestrates the parsing of API routes and generation of MCP server documentation.
 * This script is designed to be run during development to keep MCP tools synchronized
 * with API changes.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import APIParser from './api-parser.js';
import MCPToolGenerator from './tool-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MCPDocumentationGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, '../../docs/mcp');
    this.parser = new APIParser();
    this.generator = new MCPToolGenerator();
  }

  /**
   * Main generation process
   */
  async generate() {
    console.log('🚀 Starting MCP documentation generation...');
    console.log(`📁 Output directory: ${this.outputDir}`);

    try {
      // Step 1: Parse API routes
      console.log('\n📖 Step 1: Parsing API routes...');
      const rawEndpoints = await this.parser.parseAllRoutes();
      
      if (rawEndpoints.length === 0) {
        console.log('⚠️  No API endpoints found. Check API route files.');
        return;
      }

      // Step 2: Generate MCP-compatible endpoint data  
      console.log('\n🔄 Step 2: Processing endpoints for MCP...');
      const endpoints = this.parser.generateMCPEndpoints();
      
      // Step 3: Generate MCP server and documentation
      console.log('\n🔧 Step 3: Generating MCP server...');
      const mcpServer = this.generator.generateMCPServer(endpoints);

      // Step 4: Write output files
      console.log('\n💾 Step 4: Writing output files...');
      await this.writeOutputFiles(mcpServer);

      // Step 5: Generate summary report
      console.log('\n📊 Step 5: Generating summary...');
      this.generateSummary(endpoints, mcpServer.tools);

      console.log('\n✅ MCP documentation generation completed successfully!');
      console.log(`📋 Generated ${mcpServer.tools.length} MCP tools`);
      console.log(`📁 Files written to: ${this.outputDir}`);

    } catch (error) {
      console.error('\n❌ Error generating MCP documentation:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  /**
   * Create output directory if it doesn't exist
   */
  ensureOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${this.outputDir}`);
    }
  }

  /**
   * Write all generated files to disk
   */
  async writeOutputFiles(mcpServer) {
    this.ensureOutputDirectory();

    const files = [
      {
        filename: 'server.js',
        content: mcpServer.serverCode,
        description: 'MCP server implementation'
      },
      {
        filename: 'package.json',
        content: JSON.stringify(mcpServer.packageJson, null, 2),
        description: 'Package configuration'
      },
      {
        filename: 'README.md',
        content: mcpServer.readme,
        description: 'Documentation and usage guide'
      },
      {
        filename: 'tools.json',
        content: JSON.stringify(mcpServer.tools, null, 2),
        description: 'MCP tool definitions'
      }
    ];

    for (const file of files) {
      const filePath = path.join(this.outputDir, file.filename);
      fs.writeFileSync(filePath, file.content, 'utf8');
      console.log(`  ✓ ${file.filename} - ${file.description}`);
    }

    // Make server.js executable
    const serverPath = path.join(this.outputDir, 'server.js');
    fs.chmodSync(serverPath, '755');
    console.log('  ✓ Made server.js executable');
  }

  /**
   * Generate and display summary information
   */
  generateSummary(endpoints, tools) {
    const summary = {
      generatedAt: new Date().toISOString(),
      statistics: {
        totalEndpoints: endpoints.length,
        totalTools: tools.length,
        features: [...new Set(endpoints.map(e => e.feature))],
        httpMethods: [...new Set(endpoints.map(e => e.method))]
      },
      toolsByFeature: this.groupToolsByFeature(endpoints),
      files: [
        'server.js - Main MCP server implementation',
        'package.json - NPM package configuration', 
        'README.md - Documentation and usage guide',
        'tools.json - MCP tool definitions in JSON format'
      ]
    };

    // Write summary to file
    const summaryPath = path.join(this.outputDir, 'generation-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    // Display summary
    console.log('\n📊 Generation Summary:');
    console.log(`   • Endpoints processed: ${summary.statistics.totalEndpoints}`);
    console.log(`   • MCP tools generated: ${summary.statistics.totalTools}`);
    console.log(`   • Features: ${summary.statistics.features.join(', ')}`);
    console.log(`   • HTTP methods: ${summary.statistics.httpMethods.join(', ')}`);
    
    console.log('\n📋 Tools by Feature:');
    Object.entries(summary.toolsByFeature).forEach(([feature, count]) => {
      console.log(`   • ${feature}: ${count} tools`);
    });
  }

  /**
   * Group tools by feature for summary
   */
  groupToolsByFeature(endpoints) {
    const groups = {};
    endpoints.forEach(endpoint => {
      const feature = endpoint.feature || 'main';
      groups[feature] = (groups[feature] || 0) + 1;
    });
    return groups;
  }

  /**
   * Validate generated MCP server
   */
  async validateGeneration() {
    const serverPath = path.join(this.outputDir, 'server.js');
    const packagePath = path.join(this.outputDir, 'package.json');
    
    const requiredFiles = [serverPath, packagePath];
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
    
    if (missingFiles.length > 0) {
      throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
    }

    console.log('✅ Validation passed - all required files generated');
  }
}

// Run the generator if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new MCPDocumentationGenerator();
  generator.generate().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default MCPDocumentationGenerator;