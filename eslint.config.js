// eslint.config.js
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginJsxA11y from "eslint-plugin-jsx-a11y";

export default [
  {
    ignores: ["**/dist/", "**/node_modules/", "client/vite.config.ts"],
  },
  // Base configuration for all relevant files (JS, JSX, TS, TSX, MJS, CJS)
  {
    files: [
      "**/*.js",
      "**/*.jsx",
      "**/*.ts",
      "**/*.tsx",
      "**/*.mjs",
      "**/*.cjs",
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parser: tseslint.parser,
      parserOptions: {
        // No 'project' setting here
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "jsx-a11y": pluginJsxA11y,
    },
    rules: {
      // Start with ESLint's recommended rules for general good practices
      ...tseslint.configs.eslintRecommended.rules,
      // Add React, Hooks, and A11y recommended rules
      ...pluginReact.configs.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      ...pluginJsxA11y.configs.recommended.rules,

      // Project-specific overrides or additions for all files
      "react/react-in-jsx-scope": "off", // Not needed with modern React
      "react/jsx-uses-react": "off", // Not needed with modern React
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
    settings: {
      react: {
        version: "detect", // Automatically detect the React version
      },
    },
  },
  // Configuration for TypeScript files in client/src (type-aware linting)
  {
    files: ["client/src/**/*.ts", "client/src/**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: ["./client/tsconfig.app.json"], // Enable type-aware linting
      },
    },
    rules: {
      // Use recommended type-checked rules from typescript-eslint
      ...tseslint.configs.recommendedTypeChecked.rules,
      // Ensure our specific no-unused-vars config is maintained
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Add any other specific overrides for typed files if needed
      "react/prop-types": "off", // Often not needed with TypeScript
    },
  },
  // Configuration for client/__mocks__/apiMock.ts (lint as TS, but no project/type-aware)
  {
    files: ["client/__mocks__/apiMock.ts"],
    rules: {
      // Use basic recommended TS rules (less reliant on type info)
      ...tseslint.configs.recommended.rules,
      // Ensure our specific no-unused-vars config is maintained
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Disable rules that strictly require type information and might error
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/await-thenable": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      // Add other rules from recommendedTypeChecked that might cause issues here
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/no-duplicate-type-constituents": "off",
      "@typescript-eslint/no-explicit-any": "warn", // Keep as warn from recommended
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/no-unnecessary-boolean-literal-compare": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-unnecessary-qualifier": "off",
      "@typescript-eslint/no-unnecessary-type-arguments": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/prefer-optional-chain": "off",
      "@typescript-eslint/restrict-plus-operands": "off",
      "@typescript-eslint/sort-type-constituents": "off",
      "@typescript-eslint/unbound-method": "off",
    },
  },
  // Configuration specific to test files can be added later if needed
  // For example, to enable Jest globals:
  // {
  //   files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
  //   languageOptions: {
  //     globals: {
  //       ...globals.jest,
  //     },
  //   },
  //   rules: {
  //     // relax some rules for tests if necessary
  //   }
  // }
];
