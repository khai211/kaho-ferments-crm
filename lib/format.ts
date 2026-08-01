const currencyFormatter = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
});

export function formatSGD(amount: number) {
  return currencyFormatter.format(amount);
}
