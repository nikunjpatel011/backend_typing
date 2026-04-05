import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { baseSchemaOptions } from "../utils/schemaOptions.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    contactNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    pinCode: {
      type: String,
      trim: true,
    },
    profileImage: {
      type: String,
      default: null,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
  },
  baseSchemaOptions,
);

userSchema.pre("save", async function savePassword(next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model("User", userSchema);
