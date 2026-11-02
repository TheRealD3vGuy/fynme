// Plain-language guide to how the Find Your North site works. Shown on /admin/export and included in the export ZIP.
export const SITE_GUIDE = `FIND YOUR NORTH — HOW THE SITE WORKS
=====================================

OVERVIEW
- Storefront built with TanStack Start (React 19, Vite, Tailwind CSS v4), hosted on Lovable.
- Backend: Lovable Cloud — Postgres database, authentication, file storage, server functions.
- Published at https://fynme.lovable.app. Code can sync two-way with GitHub (Project settings → Git).

STOREFRONT PAGES
- /                Homepage (hero, featured, series, stickers, newsletter) — text & toggles from site_settings
- /discover        All products with search, series filter and sort
- /products/:slug  Product page: sizes, size guide, low-stock notice, recently viewed
- /collections/:slug  Series pages
- /about           About + My Testimony (/testimony redirects here)
- /pages/:slug     Info pages (shipping, returns, size-guide, privacy, terms) — edited in Staff → Pages
- /contact         Contact form → saved to contact_submissions (Staff → Inbox)
- /auth, /account, /reset-password   Customer sign-in, account, password change & reset
- /checkout        Cart review (online payments not live yet)
- Cart is stored in the visitor's browser (localStorage "fyn-cart-v1"); everything else lives in the database.

LIVE UPDATES
- The site listens for database changes (products, variants, collections, settings, menus, pages)
  and refreshes visitors' pages automatically — no reload needed.

STAFF PANEL (/admin, or type the Discover search shortcut)
- Sign in with a staff account. Access is checked on the server (is_staff / has_role functions);
  roles live only in the user_roles table: owner, admin, editor, store_manager, support, viewer.
- Sections: Overview, Orders, Receipt Printer, Inbox, Promo Codes, Products, Inventory, Printify,
  Collections, Homepage, Pages, Menus & Footer, Export & Guide.
- Photos: drag & drop into any photo box. Files go to the private "site-images" storage bucket;
  only staff can upload, and the site uses long-lived signed links to show them.
- Every staff edit is recorded in activity_log.

DATABASE TABLES (main ones)
- products, product_variants (sizes + stock), product_images, collections, categories
- orders, order_items, receipts (R-1001+), discounts (promo codes)
- pages + page_sections (info page content), site_settings (homepage/store text), navigation_items (menus)
- profiles, user_roles, staff_invitations, customer_addresses
- contact_submissions, contact_notes, newsletter_subscribers, inventory_adjustments, media_assets, activity_log
- Row Level Security is on for every table: visitors can read only published content;
  customers see only their own orders; staff can manage everything.

PRINTIFY
- Server functions in src/lib/printify.functions.ts talk to Printify using the PRINTIFY_API_TOKEN
  and PRINTIFY_SHOP_ID secrets. Webhook endpoint: /api/public/printify-webhook.

PAYMENTS
- Not live yet. Plan: Stripe Checkout + a server-verified webhook that marks orders paid.
  Orders are never marked paid from the browser.

FREE SHIPPING
- Threshold set in src/lib/shipping.ts (currently $75 — placeholder).

EXPORT
- Staff → Export & Guide downloads a ZIP of all store data (JSON per table) plus this guide.
- For the full source code, connect GitHub and download the repository from there.
`;
