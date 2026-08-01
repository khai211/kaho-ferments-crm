type MergeVarsInput = {
  customer: { name: string | null; birthday_capture_token: string };
  order?: { reference: string };
  items?: { name: string }[];
  fulfilment?: { date: string | null; time: string | null; location: string | null };
};

function formatPickupDate(date: string | null | undefined): string {
  if (!date) return "";
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-SG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Builds the {{merge_tag}} values available in sequence_steps subject/body.
 * `order`/`items` are omitted for the birthday step, which isn't tied to a
 * specific order. `fulfilment` is only present when the order has a
 * scheduled pickup/delivery slot.
 */
export function buildMergeVars({ customer, order, items = [], fulfilment }: MergeVarsInput): Record<string, string> {
  const firstName = customer.name?.trim().split(/\s+/)[0] || "there";
  const flavor = items.map((item) => item.name).join(", ") || "your order";
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  return {
    first_name: firstName,
    flavor,
    order_reference: order?.reference ?? "",
    birthday_link: `${baseUrl}/birthday/${customer.birthday_capture_token}`,
    pickup_date: formatPickupDate(fulfilment?.date),
    pickup_time: fulfilment?.time ?? "",
    pickup_location: fulfilment?.location ?? "",
  };
}
