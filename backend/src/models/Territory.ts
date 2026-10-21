import mongoose, { Schema, Document } from "mongoose";

export interface ITerritory extends Document {
  name: string;
  region: string;
  district: string;
  thana?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const territorySchema = new Schema<ITerritory>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    region: { type: String, required: true, trim: true, default: "General" },
    district: { type: String, required: true, trim: true, default: "General" },
    thana: { type: String, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Territory: mongoose.Model<ITerritory> =
  (mongoose.models.Territory as any) || mongoose.model<ITerritory>("Territory", territorySchema);
