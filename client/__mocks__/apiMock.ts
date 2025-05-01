// __mocks__/apiMock.ts
import { jest } from "@jest/globals"; // Import Jest object

// Mock structure for the api service that includes defaults
const apiMock = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  defaults: {
    headers: {
      common: {
        Authorization: "", // Initialize Authorization header
      },
    },
  },
  // Add any other methods your api service exports
};

export default apiMock;
