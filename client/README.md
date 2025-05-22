# Peritus Frontend (Client)

This folder contains the frontend application for Peritus, built with React, Vite, TypeScript, and Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js (version 18.x or later recommended)
- npm (usually comes with Node.js)
- A running instance of the Peritus backend API (see `/server/README.md`)

### Installation

1.  **Navigate to the `client` directory:**
    ```bash
    cd path/to/project/client
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Configuration

1.  **Environment Variables:**
    Create a `.env` file in the `client` directory.
    The primary variable needed is the backend API URL:
    ```dotenv
    VITE_API_BASE_URL=http://localhost:3000/api
    ```
    Replace `http://localhost:3000` with the actual URL where your backend server is running if it's different.

### Running the Development Server

1.  **Start the Vite dev server:**
    ```bash
    npm run dev
    ```
2.  Open your browser and navigate to the URL provided (usually `http://localhost:5173`).

## Building for Production

1.  **Create a production build:**
    ```bash
    npm run build
    ```
    This will create a `dist` folder with optimized static assets ready for deployment.

## Available Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Creates a production build.
- `npm run lint`: Runs the linter (ESLint).
- `npm run preview`: Serves the production build locally for testing.
- `npm test`: Runs Jest tests.

## Project Structure

- `public/`: Static assets.
- `src/`: Source code.
  - `components/`: Reusable React components.
  - `context/`: React Context providers (Auth, Notifications).
  - `hooks/`: Custom React hooks.
  - `pages/`: Page-level components.
  - `services/`: API communication logic (Axios instance).
  - `types/`: TypeScript type definitions.
  - `utils/`: Utility functions.
  - `main.tsx`: Application entry point.
  - `App.tsx`: Main application component with routing.

## Key Libraries

- **React & React DOM**: Core UI library.
- **Vite**: Build tool and dev server.
- **TypeScript**: Static typing.
- **Tailwind CSS**: Utility-first CSS framework.
- **React Router DOM**: Client-side routing.
- **Axios**: HTTP client for API calls.
- **Jest & React Testing Library**: Unit and integration testing.
