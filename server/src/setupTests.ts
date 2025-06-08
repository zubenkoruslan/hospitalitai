// Jest setup file for server-side tests

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_jwt_secret_for_jest";
process.env.MONGODB_URI = "mongodb://localhost:27017/test_db";

// Mock console methods to reduce noise in tests (keeping error and warn for debugging)
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};

// Global test timeout
jest.setTimeout(10000);
