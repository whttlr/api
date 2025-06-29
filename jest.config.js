export default {
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'utils/**/*.js',
    'src/**/*.js',
    '!src/scripts/**/*.js', // Exclude standalone scripts
    '!**/node_modules/**'
  ],
  testEnvironment: 'node',
  transform: {}
};