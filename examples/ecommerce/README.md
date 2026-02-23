# Pulse Example: E-Commerce

Online store with product catalog, shopping cart, and checkout flow.

## Features Demonstrated

- Product listing with category filtering and search
- Shopping cart state management with persistence
- Product detail modal dialog
- Checkout form with order summary
- Toast notification system
- Responsive grid layout

## Getting Started

```bash
cd examples/ecommerce
npm run dev
```

Open http://localhost:3000

## Key Files

| File | Description |
|------|-------------|
| `src/App.pulse` | Main store layout |
| `src/components/Header.pulse` | Navigation with cart badge |
| `src/components/ProductCard.pulse` | Product grid card |
| `src/components/CartSidebar.pulse` | Shopping cart drawer |
| `src/components/ProductModal.pulse` | Product detail overlay |

## Framework APIs Used

- `pulse()` - Reactive state (products, cart, notifications)
- `computed()` - Cart total, filtered products
- `el()` - CSS selector DOM creation
- `@if` / `@each` directives
- localStorage persistence

## Learn More

- [API Reference](https://pulse-js.fr/api-reference)
- [Core Concepts](https://pulse-js.fr/core-concepts)
