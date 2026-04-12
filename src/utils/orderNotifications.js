function normalizeOrigin(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return "";
  }

  try {
    const url = new URL(rawValue);
    return `${url.protocol}//${url.host}`;
  } catch {
    return rawValue.replace(/\/+$/, "");
  }
}

function getStoreOrigin() {
  const configuredOrigins = String(
    process.env.PUBLIC_STORE_URL ||
      process.env.CLIENT_URL ||
      process.env.CLIENT_URLS ||
      "",
  )
    .split(",")
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);

  return configuredOrigins[0] || "";
}

function toAbsoluteImageUrl(imageUrl) {
  const normalizedImageUrl = String(imageUrl || "").trim();

  if (!normalizedImageUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(normalizedImageUrl)) {
    return normalizedImageUrl;
  }

  const storeOrigin = getStoreOrigin();

  if (!storeOrigin) {
    return normalizedImageUrl;
  }

  const normalizedPath = normalizedImageUrl.startsWith("/")
    ? normalizedImageUrl
    : `/${normalizedImageUrl}`;

  return new URL(normalizedPath, storeOrigin).toString();
}

function formatPriceINR(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function formatLabel(value) {
  return String(value || "")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function buildOrderWhatsappShareUrl(order) {
  const whatsappNumber = String(
    process.env.ORDER_NOTIFICATION_WHATSAPP_NUMBER || "916357121316",
  )
    .replace(/\D/g, "")
    .trim();

  if (!whatsappNumber) {
    return "";
  }

  const deliveryAddress = [
    order.customer?.fullAddress,
    order.customer?.city,
    order.customer?.state,
    order.customer?.zipCode || order.customer?.pinCode,
    order.customer?.country,
  ]
    .filter(Boolean)
    .join(", ");

  const itemLines = (order.items || []).map((item, index) => {
    const imageUrl = toAbsoluteImageUrl(item.image);
    const parts = [
      `${index + 1}. ${item.name}`,
      `Brand: ${item.brand}`,
      `Size: ${item.size}`,
      `Color: ${item.color}`,
      `Qty: ${item.quantity}`,
      `Line Total: ${formatPriceINR(item.lineTotal || item.price * item.quantity)}`,
    ];

    if (imageUrl) {
      parts.push(`Photo: ${imageUrl}`);
    }

    return parts.join(" | ");
  });

  const messageLines = [
    `New paid order: ${order.orderNumber}`,
    `Payment: ${formatLabel(order.payment?.status || "paid")} via ${formatLabel(
      order.payment?.provider || order.paymentMethod || "Razorpay",
    )}`,
    `Order amount: ${formatPriceINR(order.total)}`,
    `Customer: ${order.customer?.fullName || order.customer?.name || "-"}`,
    `Phone: ${order.customer?.phoneNumber || order.customer?.contactNumber || "-"}`,
    `Address: ${deliveryAddress || "-"}`,
    "Items:",
    ...itemLines,
  ];

  if (order.payment?.razorpayPaymentId) {
    messageLines.push(`Razorpay payment id: ${order.payment.razorpayPaymentId}`);
  }

  if (order.notes?.trim()) {
    messageLines.push(`Order note: ${order.notes.trim()}`);
  }

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    messageLines.join("\n"),
  )}`;
}
