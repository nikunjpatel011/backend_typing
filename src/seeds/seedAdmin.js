import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import { ensureDefaultAdmin } from "../utils/defaultAdmin.js";

dotenv.config();

async function run() {
  await connectDB();
  const result = await ensureDefaultAdmin({ forceUpdate: true });

  console.log(
    result.created
      ? "Default admin created successfully"
      : "Default admin updated successfully",
  );
  console.log({
    name: result.defaults.name,
    username: result.defaults.username,
    email: result.defaults.email,
  });

  process.exit(0);
}

run().catch((error) => {
  console.error("Failed to seed admin", error);
  process.exit(1);
});
