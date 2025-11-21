function OrderPage() {
    // ... existing code (imports, state, effects, handlers) ...

    // FIX: robust helpers to normalize and format shipper price
    const formatPrice = (val) => {
        if (val === null || val === undefined) return 'N/A';
        const num = Number(val);
        if (Number.isNaN(num)) return String(val);
        return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(num);
    };

    const getShipperPrice = (order) => {
        if (!order) return null;
        // Try multiple possible fields; do not hide 0
        const price = order.shipperPrice ?? order.shippingPrice ?? order.shipping?.price;
        return price !== undefined && price !== null ? price : null;
    };

    // ... existing code (data fetching, derived values) ...

    return (
        <div className="order-page">
            {/* ... existing UI ... */}

            {/* FIX: render shipper price without falsy check, so 0 shows */}
            <div className="order-summary-row">
                <span>Shipper Price:</span>
                <strong>{formatPrice(getShipperPrice(order))}</strong>
            </div>

            {/* If this is inside a table row, replace any usage like:
                {order.shipperPrice && order.shipperPrice}
               with:
                {formatPrice(getShipperPrice(order))}
            */}

            {/* ... existing UI ... */}
        </div>
    );
}