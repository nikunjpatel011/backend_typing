import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadMultipleImages } from "../utils/cloudinary.js";

export const uploadProductImages = asyncHandler(async (req, res) => {
  const uploadedImages = await uploadMultipleImages(req.body.images);

  res.status(201).json({
    success: true,
    message: "Images uploaded successfully",
    data: {
      urls: uploadedImages.map((image) => image.url),
      publicIds: uploadedImages.map((image) => image.publicId),
    },
  });
});
