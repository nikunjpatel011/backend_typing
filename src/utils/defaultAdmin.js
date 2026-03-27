import { Admin } from "../models/Admin.js";

function getDefaultAdminValues() {
  return {
    name: process.env.ADMIN_NAME || "Typing Admin",
    username: (process.env.ADMIN_USERNAME || "admin").toLowerCase(),
    email: (process.env.ADMIN_EMAIL || "admin@typing.local").toLowerCase(),
    password: process.env.ADMIN_PASSWORD || "Admin@123",
  };
}

export async function ensureDefaultAdmin({ forceUpdate = false } = {}) {
  const defaults = getDefaultAdminValues();
  const existingAdmin = await Admin.findOne({
    $or: [{ email: defaults.email }, { username: defaults.username }],
  }).select("+password");

  if (!existingAdmin) {
    const createdAdmin = await Admin.create(defaults);
    return {
      admin: createdAdmin,
      created: true,
      defaults,
    };
  }

  if (forceUpdate) {
    existingAdmin.name = defaults.name;
    existingAdmin.username = defaults.username;
    existingAdmin.email = defaults.email;
    existingAdmin.password = defaults.password;
    await existingAdmin.save();
  }

  return {
    admin: existingAdmin,
    created: false,
    defaults,
  };
}
