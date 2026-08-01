type MergeVarsInput = {
  customer: { name: string | null; birthday_capture_token: string };
  order?: { reference: string };
  items?: { name: string }[];
};

/**
 * Builds the {{merge_tag}} values available in sequence_steps subject/body.
 * `order`/`items` are omitted for the birthday step, which isn't tied to a
 * specific order.
 */
export function buildMergeVars({ customer, order, items = [] }: MergeVarsInput): Record<string, string> {
  const firstName = customer.name?.trim().split(/\s+/)[0] || "there";
  const flavor = items.map((item) => item.name).join(", ") || "your order";
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  return {
    first_name: firstName,
    flavor,
    order_reference: order?.reference ?? "",
    birthday_link: `${baseUrl}/birthday/${customer.birthday_capture_token}`,
  };
}
