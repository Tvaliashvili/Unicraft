-- Step 1 of the wheels -> construction equipment rental pivot.
-- Run this once in the Supabase SQL Editor.
-- Repurposes `products` into rental instruments and `orders` into bookings.
-- Existing columns (price, old_price, status, items, etc.) are left in place
-- so index.html / product.html / admin.html keep working until Step 2 updates
-- them to read/write the new columns.

-- ── products -> rental instruments ─────────────────────────────────────────

ALTER TABLE products RENAME COLUMN price TO daily_rate;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS weekly_rate numeric,
  ADD COLUMN IF NOT EXISTS security_deposit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'available';

ALTER TABLE products
  ADD CONSTRAINT products_status_check
  CHECK (status IN ('available', 'rented', 'maintenance'));

-- ── orders -> bookings ──────────────────────────────────────────────────────

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS total_days integer,
  ADD COLUMN IF NOT EXISTS deposit_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_status text NOT NULL DEFAULT 'held';

ALTER TABLE orders
  ADD CONSTRAINT orders_deposit_status_check
  CHECK (deposit_status IN ('held', 'refunded', 'retained'));

-- `status` on orders is reused as booking_status going forward:
-- existing values ('pending', 'new', ...) will be replaced with
-- 'pending' | 'active' | 'returned' | 'overdue' once admin.html is updated
-- in Step 2. No column rename needed, so old order rows stay queryable.
