/** @type {import('ts-jest').JestConfigWithTsJest} */
const config = {
  // Use ts-jest preset for ESM
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "jest-environment-jsdom",
  // Define module file extensions for Jest to look for
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  moduleNameMapper: {
    // Handle CSS imports
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    // Handle image imports
    "\\.(gif|ttf|eot|svg|png)$": "<rootDir>/__mocks__/fileMock.js",
    // Adjust the key to match the relative import path from NotificationPanel
    "^../../services/api$": "<rootDir>/__mocks__/apiMock.ts",
    // Add a mapping for imports from test files themselves (like in QuizCreation.test.tsx)
    "^../services/api$": "<rootDir>/__mocks__/apiMock.ts",
  },
  setupFilesAfterEnv: [
    "<rootDir>/src/setupTests.ts", // Optional setup file
  ],
  // Let the preset handle the transform, ensure tsconfig is correct
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        // Explicitly pass the tsconfig here
        tsconfig: "tsconfig.app.json",
      },
    ],
  },
  // Don't ignore node_modules that need transformation (like those using ESM)
  transformIgnorePatterns: [
    // Might need to adjust if specific node_modules using incompatible syntax
    "/node_modules/",
  ],
  // Explicitly tell Jest this is an ESM project
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  globals: {
    // Define import.meta.env for Jest
    "import.meta": {
      env: {
        VITE_API_BASE_URL: "http://localhost:3000/api",
        // Add other env variables used by your code here
      },
    },
    // ts-jest configuration is often handled by the preset
    // If issues persist, you might need to specify tsconfig here:
    // 'ts-jest': {
    //   tsconfig: 'tsconfig.app.json',
    //   useESM: true,
    // },
  },
};

export default config;
