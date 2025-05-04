# Savvy

Savvy is a comprehensive MERN stack application designed for restaurant staff training and management.
It features automated quiz generation based on menu items, staff management, quiz assignments, and performance tracking.

## Project Structure

This repository contains two main folders:

- `/client`: Contains the React (Vite + TypeScript) frontend application.
- `/server`: Contains the Node.js/Express backend API and MongoDB models/services.

Each folder has its own `README.md` with specific instructions for setup and running.

## Key Features

- **Role-Based Access:** Separate interfaces for Restaurant Managers and Staff.
- **Menu Management:** Add, edit, and delete menus and menu items.
- **Automated Quiz Generation:** Create quizzes automatically based on selected menus.
- **Manual Quiz Creation/Editing:** Fine-tune generated quizzes or build them from scratch.
- **Staff Management:** Add and manage staff accounts.
- **Quiz Assignment:** (Now handled by Activation) Activate quizzes to make them available to all staff.
- **Quiz Taking:** Staff can take available quizzes.
- **Results Tracking:** View individual staff quiz results and overall performance metrics.
- **Authentication:** Secure login using JWT.

## Getting Started

1.  **Prerequisites:**

    - Node.js (v18 or later recommended)
    - npm (usually comes with Node.js)
    - MongoDB (running locally or connection string for Atlas/other provider)

2.  **Setup Backend:**

    - Navigate to the `/server` directory.
    - Follow the instructions in `server/README.md` (install dependencies, set up `.env`).
    - Start the backend server.

3.  **Setup Frontend:**

    - Navigate to the `/client` directory.
    - Follow the instructions in `client/README.md` (install dependencies, set up `.env` if needed).
    - Start the frontend development server.

4.  **Access Application:** Open your browser and navigate to the frontend URL (typically `http://localhost:5173`).

## Contributing

[Details about contributing, code style, branches, etc. - if applicable]

## License

[Specify your project's license, e.g., MIT]
