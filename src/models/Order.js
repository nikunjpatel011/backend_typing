import mongoose from "mongoose";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  RETURN_STATUSES,
} from "../constants/order.js";
import { baseSchemaOptions } from "../utils/schemaOptions.js";

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: "",
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    size: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: false,
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customer: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      contactNumber: {
        type: String,
        required: true,
        trim: true,
      },
      pinCode: {
        type: String,
        required: true,
        trim: true,
      },
      fullName: {
        type: String,
        required: true,
        trim: true,
      },
      fullAddress: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      state: {
        type: String,
        required: true,
        trim: true,
      },
      zipCode: {
        type: String,
        required: true,
        trim: true,
      },
      country: {
        type: String,
        required: true,
        trim: true,
      },
      phoneNumber: {
        type: String,
        required: true,
        trim: true,
      },
    },
    items: {
      type: [orderItemSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pending",
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    returnRequest: {
      status: {
        type: String,
        enum: RETURN_STATUSES,
        default: "none",
      },
      reason: {
        type: String,
        default: "",
        trim: true,
      },
      requestedAt: {
        type: Date,
        default: null,
      },
      processedAt: {
        type: Date,
        default: null,
      },
      adminNotes: {
        type: String,
        default: "",
        trim: true,
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    shipping: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      default: "razorpay",
      trim: true,
    },
    payment: {
      provider: {
        type: String,
        default: "razorpay",
        trim: true,
      },
      status: {
        type: String,
        enum: PAYMENT_STATUSES,
        default: "paid",
      },
      currency: {
        type: String,
        default: "INR",
        trim: true,
        uppercase: true,
      },
      amount: {
        type: Number,
        min: 0,
        default: 0,
      },
      razorpayOrderId: {
        type: String,
        trim: true,
      },
      razorpayPaymentId: {
        type: String,
        trim: true,
      },
      razorpaySignature: {
        type: String,
        trim: true,
      },
      paidAt: {
        type: Date,
        default: null,
      },
      verifiedAt: {
        type: Date,
        default: null,
      },
    },
    whatsappSharedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  baseSchemaOptions,
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ "payment.razorpayPaymentId": 1 }, { unique: true, sparse: true });
orderSchema.index({ "payment.razorpayOrderId": 1 });

export const Order = mongoose.model("Order", orderSchema);
