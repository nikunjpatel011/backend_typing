import { buildOrderWhatsappShareUrl } from "./orderNotifications.js";

export function serializeOrderRecord(order) {
  const plainOrder =
    typeof order?.toJSON === "function" ? order.toJSON() : { ...order };
  const whatsappSharedAt = plainOrder.whatsappSharedAt || null;

  return {
    ...plainOrder,
    whatsappSharedAt,
    whatsappShareUrl: whatsappSharedAt ? null : buildOrderWhatsappShareUrl(plainOrder),
  };
}
