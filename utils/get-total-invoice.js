exports.getTotalInvoice = (invoice) => {
  const items = invoice.detailedOrders
    ? invoice.orders.concat(invoice.addedItems)
    : invoice.addedItems;

  const total =
    items.reduce(
      (acc, item) =>
        (acc += item.total + (item.total * invoice.userData.VATrate) / 100),
      0
    ) + invoice.previousClientBalance;

  return total;
};
