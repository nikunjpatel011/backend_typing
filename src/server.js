import dotenv from "dotenv";
import { Order } from "./models/Order.js";
import { Review } from "./models/Review.js";
import { User } from "./models/User.js";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { ensureDefaultAdmin } from "./utils/defaultAdmin.js";
import { syncProductReviewStats } from "./utils/reviews.js";

dotenv.config();

const port = Number(process.env.PORT) || 5000;

async function startServer() {
  await connectDB();
  await Order.syncIndexes();
  await User.syncIndexes();
  await Review.syncIndexes();
  const migrationResult = await Review.updateMany(
    { status: "pending" },
    { status: "approved", approvedAt: new Date() },
  );
  const reviewedProductIds = await Review.distinct("product");
  await Promise.all(reviewedProductIds.map((productId) => syncProductReviewStats(productId)));

  if (migrationResult.modifiedCount > 0) {
    console.log(`Published ${migrationResult.modifiedCount} existing pending review(s)`);
  }
  await ensureDefaultAdmin();

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
