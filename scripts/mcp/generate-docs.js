#!/usr/bin/env node

/**
 * MCP Documentation Generator
 * 
 * Generates MCP (Model Context Protocol) documentation from API routes.
 * Parses Express.js API endpoints and creates complete MCP server implementation.
 */

import { APIParser } from './api-parser.js';
import { ToolGenerator } from './tool-generator.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🔧 MCP Documentation Generator');
  console.log('📝 Generating MCP documentation from API routes...');

  try {
    // Get the project root (3 levels up from scripts/mcp/)
    const projectRoot = path.resolve(__dirname, '../../');
    
    // Parse API routes
    console.log('🔍 Parsing API routes...');
    const parser = new APIParser(projectRoot);
    const endpoints = await parser.parseRoutes();
    
    console.log(`📊 Found ${endpoints.length} API endpoints`);
    
    if (endpoints.length === 0) {
      console.log('⚠️  No endpoints found. Check API route files exist.');
      process.exit(1);
    }

    // Generate MCP tools and server
    console.log('🛠️  Generating MCP tools...');
    const generator = new ToolGenerator(endpoints, {
      outputDir: path.join(projectRoot, 'docs/mcp')
    });
    
    const result = await generator.generateAll();
    
    console.log('✅ MCP documentation generated successfully!');
    console.log(`📁 Output directory: ${result.outputDir}`);
    console.log(`🔧 Generated ${result.tools.length} MCP tools`);
    
    // Display statistics
    const stats = parser.getStatistics();
    console.log('\n📈 Generation Statistics:');
    console.log(`   Total endpoints: ${stats.totalEndpoints}`);
    console.log(`   Features: ${stats.features.join(', ')}`);
    console.log(`   HTTP methods: ${stats.httpMethods.join(', ')}`);
    console.log('\n📦 Generated files:');
    console.log('   • server.js - MCP server implementation');
    console.log('   • tools.json - Tool definitions');
    console.log('   • README.md - Documentation');
    console.log('   • package.json - NPM configuration');
    console.log('   • generation-summary.json - Statistics');
    
    console.log('\n🚀 To use the MCP server:');
    console.log(`   cd ${result.outputDir}`);
    console.log('   npm install');
    console.log('   npm start');

  } catch (error) {
    console.error('❌ Generation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const force = args.includes('--force') || args.includes('-f');

if (force) {
  console.log('🔄 Force regeneration requested');
  main();
} else {
  // Check if docs already exist
  const docsPath = path.join(process.cwd(), 'docs', 'mcp');
  import('fs').then(fs => {
    if (fs.existsSync(docsPath)) {
      console.log('✅ MCP documentation already exists in docs/mcp/');
      console.log('💡 Use --force flag to regenerate: npm run generate:mcp -- --force');
      console.log('📊 Current files maintained, no changes made');
    } else {
      console.log('📋 No existing MCP docs found, generating fresh documentation...');
      main();
    }
  });
}