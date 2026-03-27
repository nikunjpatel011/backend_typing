import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import { sampleProducts } from "../data/sampleProducts.js";
import { Product } from "../models/Product.js";
import { ensureDefaultAdmin } from "../utils/defaultAdmin.js";

dotenv.config();

async function run() {
  await connectDB();
  await ensureDefaultAdmin();

  let insertedCount = 0;

  for (const sampleProduct of sampleProducts) {
    const existingProduct = await Product.findOne({
      name: sampleProduct.name,
      brand: sampleProduct.brand,
    });

    if (existingProduct) {
      Object.assign(existingProduct, sampleProduct);
      await existingProduct.save();
    } else {
      await Product.create(sampleProduct);
      insertedCount += 1;
    }
  }

  console.log(`Seed completed. Inserted ${insertedCount} new products.`);
  process.exit(0);
}

run().catch((error) => {
  console.error("Failed to seed data", error);
  process.exit(1);
});
