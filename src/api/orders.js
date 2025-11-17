export async function getOrderById(id) {
    // ... existing code (fetch call, error handling) ...
    const res = await fetch(`/api/orders/${id}`);
    const data = await res.json();

    // FIX: normalize shipper price so UI has a consistent field
    data.shipperPrice = data.shipperPrice ?? data.shippingPrice ?? data.shipping?.price ?? 0;

    return data;
    // ... existing code ...
}