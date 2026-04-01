import crypto from "crypto";
import { AppError } from "./appError.js";

function getCloudinaryCredentials() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new AppError(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
      500,
    );
  }

  return {
    cloudName,
    apiKey,
    apiSecret,
  };
}

function signParams(params, apiSecret) {
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${serialized}${apiSecret}`)
    .digest("hex");
}

function getUploadFolder(folder) {
  return folder || process.env.CLOUDINARY_FOLDER || "typing-clothing/products";
}

export async function uploadImageDataUri(dataUri, options = {}) {
  if (typeof dataUri !== "string" || !dataUri.startsWith("data:image/")) {
    throw new AppError("Each uploaded file must be an image data URL.", 400);
  }

  const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    folder: getUploadFolder(options.folder),
    timestamp,
  };
  const signature = signParams(paramsToSign, apiSecret);
  const formData = new FormData();

  formData.append("file", dataUri);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", paramsToSign.folder);
  formData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );
  const payload = await response.json();

  if (!response.ok) {
    throw new AppError(payload?.error?.message || "Cloudinary upload failed", 502);
  }

  return {
    url: payload.secure_url,
    publicId: payload.public_id,
  };
}

export async function uploadMultipleImages(dataUris, options = {}) {
  return Promise.all(
    dataUris.map((dataUri) => uploadImageDataUri(dataUri, options)),
  );
}

export async function deleteCloudinaryImage(publicId) {
  if (!publicId) {
    return;
  }

  const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    public_id: publicId,
    timestamp,
  };
  const signature = signParams(paramsToSign, apiSecret);
  const formData = new FormData();

  formData.append("public_id", publicId);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new AppError(payload?.error?.message || "Cloudinary delete failed", 502);
  }
}

export async function deleteCloudinaryImages(publicIds) {
  if (!Array.isArray(publicIds) || publicIds.length === 0) {
    return;
  }

  await Promise.all(publicIds.filter(Boolean).map((publicId) => deleteCloudinaryImage(publicId)));
}
