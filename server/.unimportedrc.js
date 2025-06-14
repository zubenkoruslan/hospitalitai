module.exports = {
  entry: ["src/server.ts"],
  extensions: [".ts", ".js"],
  ignorePatterns: [
    "**/node_modules/**",
    "**/dist/**",
    "**/*.test.ts",
    "**/*.spec.ts",
  ],
  ignoreUnresolved: ["@types/*"],
};
