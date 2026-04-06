import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getDashboardSummary = asyncHandler(async (_req, res) => {
  const [
    productCount,
    userCount,
    orderCount,
    returnRequestCount,
    revenueStats,
    recentOrders,
    statusCounts,
  ] = await Promise.all([
      Product.countDocuments(),
      User.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({
        "returnRequest.status": {
          $in: ["requested", "received", "rejected"],
        },
      }),
      Order.aggregate([
        {
          $match: {
            status: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$total" },
          },
        },
      ]),
      Order.find().sort({ createdAt: -1 }).limit(5),
      Order.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

  res.json({
    success: true,
    data: {
      stats: {
        totalProducts: productCount,
        totalUsers: userCount,
        totalOrders: orderCount,
        returnRequests: returnRequestCount,
        totalRevenue: revenueStats[0]?.revenue || 0,
      },
      recentOrders: recentOrders.map((order) => order.toJSON()),
      orderStatusBreakdown: statusCounts.reduce((accumulator, item) => {
        accumulator[item._id] = item.count;
        return accumulator;
      }, {}),
    },
  });
});
