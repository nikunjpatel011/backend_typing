import {
  SHIPPING_COST,
  SHIPPING_THRESHOLD,
  TAX_RATE,
} from "../constants/order.js";

export function calculateOrderTotals(items, discount = 0) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const safeDiscount = Math.max(0, discount);
  const discountedSubtotal = Math.max(0, subtotal - safeDiscount);
  const shipping = discountedSubtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const tax = Number((discountedSubtotal * TAX_RATE).toFixed(2));
  const total = Number((discountedSubtotal + shipping + tax).toFixed(2));

  return {
    subtotal,
    discount: safeDiscount,
    shipping,
    tax,
    total,
  };
}
