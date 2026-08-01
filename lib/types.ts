export type Customer = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  birthday: string | null;
  birthday_capture_token: string;
  birthday_reward_sent_year: number | null;
  order_count: number;
  first_order_at: string | null;
  last_order_at: string | null;
};

export type SequenceStep = {
  id: string;
  step_order: number;
  name: string;
  delay_days: number;
  subject: string;
  body: string;
  is_birthday: boolean;
  active: boolean;
};

/** Payload shape for POST /api/webhooks/mock-store-order — stands in for
 * HitPay's real online-store order webhook until that's wired up for real. */
export type MockOrderPayload = {
  order_reference: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  items: { name: string; qty: number; unit_price: number }[];
  total: number;
  paid_at: string;
};
