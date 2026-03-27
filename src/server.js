import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { ensureDefaultAdmin } from "./utils/defaultAdmin.js";

dotenv.config();

const port = Number(process.env.PORT) || 5000;

async function startServer() {
  await connectDB();
  await ensureDefaultAdmin();

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
