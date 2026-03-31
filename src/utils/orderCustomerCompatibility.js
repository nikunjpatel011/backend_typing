export function ensureOrderCustomerCompatibility(order) {
  if (!order?.customer) {
    return;
  }

  const customer = order.customer;
  const fallbackName = customer.name?.trim() || customer.fullName?.trim() || "Customer";
  const fallbackPhone =
    customer.contactNumber?.trim() || customer.phoneNumber?.trim() || "0000000000";
  const fallbackZip = customer.pinCode?.trim() || customer.zipCode?.trim() || "000000";

  customer.name = fallbackName;
  customer.contactNumber = fallbackPhone;
  customer.pinCode = fallbackZip;
  customer.fullName = customer.fullName?.trim() || fallbackName;
  customer.fullAddress = customer.fullAddress?.trim() || "Address not available";
  customer.city = customer.city?.trim() || "Not provided";
  customer.state = customer.state?.trim() || "Not provided";
  customer.zipCode = customer.zipCode?.trim() || fallbackZip;
  customer.country = customer.country?.trim() || "India";
  customer.phoneNumber = customer.phoneNumber?.trim() || fallbackPhone;
}
