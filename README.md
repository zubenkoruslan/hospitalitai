# HospitalityAI

HospitalityAI is a comprehensive training and knowledge management platform designed specifically for restaurants and food service businesses. It empowers restaurant owners and managers to create custom quizzes and training materials for their staff, ensuring consistent product knowledge and service standards.

## 🍽️ Overview

The application serves two distinct user groups:

- **Restaurant Owners/Managers**: Create and manage menus, items, quizzes, and track staff performance
- **Staff Members**: Complete assigned training, take quizzes, and demonstrate their menu knowledge

## 🚀 Key Features

- **Menu & Item Management**: Add, edit, and organize menu items with ingredients, allergens, and dietary information
- **Automated Quiz Generation**: Create quizzes from your menu items with AI-assisted question generation
- **Staff Management**: Add and manage staff members, assign quizzes, and track progress
- **Real-time Notifications**: System alerts for new quizzes, completed training, and other important events
- **Performance Analytics**: Track quiz results and identify knowledge gaps
- **Mobile Responsive**: Works seamlessly on desktop and mobile devices

## 💻 Tech Stack

### Frontend

- **React**: UI library for building the single-page application
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Context API**: State management
- **React Router**: Navigation
- **Axios**: API client

### Backend

- **Node.js**: JavaScript runtime
- **Express**: Web framework
- **TypeScript**: Type-safe JavaScript
- **MongoDB**: NoSQL database
- **Mongoose**: MongoDB object modeling
- **JWT**: Authentication
- **bcrypt**: Password hashing

## 🛠️ Installation

### Prerequisites

- Node.js (v14+)
- MongoDB
- Git

### Setup Instructions

1. **Clone the repository**

   ```
   git clone https://github.com/yourusername/hospitalityai.git
   cd hospitalityai
   ```

2. **Install dependencies**

   ```
   npm install        # Install server dependencies
   cd client
   npm install        # Install client dependencies
   cd ..
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory and add:

   ```
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRE=30d
   ```

4. **Run the application in development mode**
   ```
   npm run dev        # Runs both server and client
   ```

## 🔑 Usage

- **Restaurant Owner**:

  1. Register as a restaurant owner
  2. Add your menu and menu items
  3. Create quizzes or have them auto-generated
  4. Add staff members
  5. Assign quizzes and monitor results

- **Staff Member**:
  1. Register as staff and connect to your restaurant
  2. Take assigned quizzes
  3. View your performance metrics
  4. Receive notifications about new training materials

## 📂 Project Structure

```
hospitalityai/
├── client/                   # React frontend
│   ├── public/               # Static assets
│   └── src/
│       ├── components/       # Reusable UI components
│       ├── context/          # React context providers
│       ├── pages/            # Application pages
│       └── services/         # API services
│
└── server/                   # Node.js backend
    ├── src/
    │   ├── middleware/       # Express middleware
    │   ├── models/           # Mongoose data models
    │   ├── routes/           # API endpoints
    │   ├── services/         # Business logic
    │   └── server.ts         # Server entry point
    └── tests/                # Server tests
```

## 🔒 Authentication

The application uses JWT (JSON Web Tokens) for authentication. Tokens are stored in local storage and included with each API request. There are two user roles:

- `restaurant`: Restaurant owners/managers with full access
- `staff`: Staff members with limited access

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👏 Acknowledgements

- MongoDB for database
- Express for backend framework
- React for frontend framework
- Node.js for runtime environment
