import mongoose, { Schema, Document } from "mongoose";

interface ICounter extends Document {
  name: string;
  year: number;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  name: { type: String, required: true },
  year: { type: Number, required: true },
  seq: { type: Number, default: 0 },
});

counterSchema.index({ name: 1, year: 1 }, { unique: true });

export const Counter: mongoose.Model<ICounter> =
  (mongoose.models.Counter as any) || mongoose.model<ICounter>("Counter", counterSchema);

export const generateSequentialId = async (
  prefix: string,
  counterName: string
): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { name: counterName, year: currentYear },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const seqStr = String(counter.seq).padStart(5, "0");
  return `${prefix}-${currentYear}-${seqStr}`;
};

export const generateSimpleId = async (prefix: string, counterName: string): Promise<string> => {
  const counter = await Counter.findOneAndUpdate(
    { name: counterName, year: 0 },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}-${String(counter.seq).padStart(4, "0")}`;
};

export const getNextEntityCode = async (prefix: string, digits = 4): Promise<string> => {
  const counter = await Counter.findOneAndUpdate(
    { name: prefix.toLowerCase(), year: 0 },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}-${String(counter.seq).padStart(digits, "0")}`;
};
