import express, { Express, Request, Response } from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app: Express = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uri: string =
  process.env.MONGODB_URI || "mongodb://localhost:27017/hospitality-training";
(async () => {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
})();

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).send("Server is running");
});

const PORT: string | number = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
