import crypto from "crypto";
import { AppError } from "./appError.js";

const RAZORPAY_API_BASE_URL = "https://api.razorpay.com/v1";

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!keyId || !keySecret) {
    throw new AppError(
      "Razorpay credentials are not configured on the server",
      500,
    );
  }

  return {
    keyId,
    keySecret,
  };
}

async function razorpayRequest(path, { method = "GET", body } = {}) {
  const { keyId, keySecret } = getRazorpayConfig();
  const response = await fetch(`${RAZORPAY_API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage =
      json?.error?.description ||
      json?.error?.reason ||
      "Razorpay request failed";
    throw new AppError(errorMessage, 502, json?.error || json);
  }

  return json;
}

export function getRazorpayKeyId() {
  return getRazorpayConfig().keyId;
}

export function amountToPaise(amount) {
  return Math.round(Number(amount) * 100);
}

export function amountFromPaise(amount) {
  return Number((Number(amount) / 100).toFixed(2));
}

export async function createRazorpayOrder({ amount, currency = "INR", receipt, notes }) {
  return razorpayRequest("/orders", {
    method: "POST",
    body: {
      amount,
      currency,
      receipt,
      notes,
    },
  });
}

export async function fetchRazorpayPayment(paymentId) {
  return razorpayRequest(`/payments/${paymentId}`);
}

export async function captureRazorpayPayment(paymentId, amount, currency = "INR") {
  return razorpayRequest(`/payments/${paymentId}/capture`, {
    method: "POST",
    body: {
      amount,
      currency,
    },
  });
}

export function verifyRazorpaySignature({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) {
  const { keySecret } = getRazorpayConfig();
  const generatedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  const expected = Buffer.from(generatedSignature);
  const received = Buffer.from(String(razorpaySignature || ""));

  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
}
