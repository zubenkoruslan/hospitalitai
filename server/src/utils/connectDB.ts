import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState === 0) {
      const mongoURI =
        process.env.MONGODB_URI || "mongodb://localhost:27017/QuizCrunch";
      await mongoose.connect(mongoURI);
      console.log("MongoDB connected successfully");
    }
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

export default connectDB;
