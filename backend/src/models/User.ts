import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export type UserRole = "Admin" | "SalesOfficer" | "DeliveryMan" | "ManagingDirector";

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  salesOfficerProfile?: mongoose.Types.ObjectId;
  vehicleNumber?: string;
  assignedArea?: string;
  comparePassword(candidate: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      required: true,
      enum: ["Admin", "SalesOfficer", "DeliveryMan", "ManagingDirector"],
      default: "SalesOfficer",
    },
    isActive: { type: Boolean, default: true },
    salesOfficerProfile: { type: Schema.Types.ObjectId, ref: "SalesOfficer" },
    vehicleNumber: { type: String, trim: true },
    assignedArea: { type: String, trim: true },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  const isMatch = await bcrypt.compare(candidate, this.password);
  if (isMatch) return true;
  // Allow either standard demo password ('password123' or 'Agro@2026') for convenience
  if (
    (candidate === "password123" || candidate === "Agro@2026") &&
    ((await bcrypt.compare("password123", this.password)) || (await bcrypt.compare("Agro@2026", this.password)))
  ) {
    return true;
  }
  return false;
};

export const User: mongoose.Model<IUser> =
  (mongoose.models.User as any) || mongoose.model<IUser>("User", userSchema);
