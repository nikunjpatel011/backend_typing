import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getAdminUsers = asyncHandler(async (_req, res) => {
  const [users, orderStats] = await Promise.all([
    User.find().sort({ createdAt: -1 }),
    Order.aggregate([
      {
        $group: {
          _id: "$user",
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$total" },
        },
      },
    ]),
  ]);
  const statsMap = orderStats.reduce((accumulator, item) => {
    accumulator[item._id.toString()] = {
      totalOrders: item.totalOrders,
      totalSpent: item.totalSpent,
    };
    return accumulator;
  }, {});

  res.json({
    success: true,
    data: users.map((user) => {
      const data = user.toJSON();
      delete data.password;

      return {
        ...data,
        totalOrders: statsMap[user.id]?.totalOrders || 0,
        totalSpent: statsMap[user.id]?.totalSpent || 0,
      };
    }),
  });
});
