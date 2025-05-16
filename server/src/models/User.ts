import mongoose, { Schema, Document, Model, Types } from "mongoose";
import bcrypt from "bcryptjs";

// Define the interface for the User document
export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: "restaurant" | "staff";
  professionalRole?: string; // Added professional role
  restaurantId?: mongoose.Types.ObjectId; // Optional here, but conditionally required by schema
  comparePassword(candidatePassword: string): Promise<boolean>; // Method signature
  assignedRoleId?: Types.ObjectId; // CHANGED: Single assigned Role ID

  // Add optional timestamp fields managed by Mongoose
  createdAt?: Date;
  updatedAt?: Date;
}

// Define the Mongoose schema
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false, // Hide password by default when querying users
    },
    role: {
      type: String,
      required: true,
      enum: {
        values: ["restaurant", "staff"],
        message: "{VALUE} is not a supported role",
      },
      index: true, // Added index for role filtering
    },
    professionalRole: {
      type: String,
      trim: true,
      required: function (this: IUser) {
        // Only require professionalRole if the role is 'staff'
        return this.role === "staff";
      },
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant", // Reference to a potential Restaurant model
      required: function (this: IUser) {
        // Only require restaurantId if the role is 'staff'
        return this.role === "staff";
      },
      index: true, // Added index for restaurant lookups
    },
    assignedRoleId: {
      type: Schema.Types.ObjectId,
      ref: "Role", // Reference to the Role model
      default: null, // Explicitly null if not assigned
      // Not making it required, as a staff might not have an operational role immediately
    }, // CHANGED: Field definition for single role
  },
  {
    timestamps: true, // Add createdAt and updatedAt timestamps
  }
);

// Add compound index for common staff lookups
userSchema.index({ restaurantId: 1, role: 1 });

// Pre-save hook to hash password
userSchema.pre<IUser>("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    // Pass error to the next middleware
    if (err instanceof Error) {
      return next(err);
    }
    return next(new Error("Password hashing failed"));
  }
});

// Method to compare candidate password with the stored hashed password
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  // 'this.password' is accessible here because select:false doesn't apply to instance methods
  // We need to explicitly select it if we were querying and then calling this
  // but on the document instance itself (like during login check after finding user), it works.
  return bcrypt.compare(candidatePassword, this.password);
};

// Create and export the User model
const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;
