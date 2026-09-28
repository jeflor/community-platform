-- Phase 4: Stripe Products and Purchases

-- Create product_groups table
CREATE TABLE product_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  access_group_id UUID NOT NULL REFERENCES access_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_product_id TEXT UNIQUE,
  stripe_price_id TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  pitch TEXT,
  locked_message TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create product_product_groups junction table (products can grant access to multiple groups)
CREATE TABLE product_product_groups (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_group_id UUID NOT NULL REFERENCES product_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, product_group_id)
);

-- Create purchases table
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_checkout_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  payment_status TEXT NOT NULL DEFAULT 'paid',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  grace_period_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

-- Create indexes
CREATE INDEX idx_products_stripe_product_id ON products(stripe_product_id);
CREATE INDEX idx_products_stripe_price_id ON products(stripe_price_id);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_position ON products(position);
CREATE INDEX idx_product_groups_access_group_id ON product_groups(access_group_id);
CREATE INDEX idx_product_product_groups_product_id ON product_product_groups(product_id);
CREATE INDEX idx_product_product_groups_product_group_id ON product_product_groups(product_group_id);
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_product_id ON purchases(product_id);
CREATE INDEX idx_purchases_stripe_customer_id ON purchases(stripe_customer_id);
CREATE INDEX idx_purchases_stripe_subscription_id ON purchases(stripe_subscription_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_expires_at ON purchases(expires_at);

-- Add updated_at triggers
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_groups_updated_at BEFORE UPDATE ON product_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to sync purchase access to groups
CREATE OR REPLACE FUNCTION sync_purchase_group_access()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status != 'active') THEN
    -- Add user to all groups linked to this product
    INSERT INTO group_members (user_id, group_id, source)
    SELECT NEW.user_id, pg.access_group_id, 'stripe'
    FROM product_product_groups ppg
    JOIN product_groups pg ON ppg.product_group_id = pg.id
    WHERE ppg.product_id = NEW.product_id
    ON CONFLICT (user_id, group_id, source) DO NOTHING;
  ELSIF TG_OP = 'UPDATE' AND NEW.status != 'active' AND OLD.status = 'active' THEN
    -- Remove user from groups when purchase becomes inactive (respecting grace period)
    DELETE FROM group_members gm
    WHERE gm.user_id = NEW.user_id
      AND gm.source = 'stripe'
      AND gm.group_id IN (
        SELECT pg.access_group_id
        FROM product_product_groups ppg
        JOIN product_groups pg ON ppg.product_group_id = pg.id
        WHERE ppg.product_id = NEW.product_id
      );
  ELSIF TG_OP = 'DELETE' THEN
    -- Remove user from groups when purchase is deleted
    DELETE FROM group_members gm
    WHERE gm.user_id = OLD.user_id
      AND gm.source = 'stripe'
      AND gm.group_id IN (
        SELECT pg.access_group_id
        FROM product_product_groups ppg
        JOIN product_groups pg ON ppg.product_group_id = pg.id
        WHERE ppg.product_id = OLD.product_id
      );
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for purchase group access sync
DROP TRIGGER IF EXISTS on_purchase_changed ON purchases;
CREATE TRIGGER on_purchase_changed
  AFTER INSERT OR UPDATE OR DELETE ON purchases
  FOR EACH ROW EXECUTE FUNCTION sync_purchase_group_access();

-- Revoke execute permissions from anon and authenticated for security function
REVOKE EXECUTE ON FUNCTION sync_purchase_group_access() FROM anon, authenticated;

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_product_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products table
CREATE POLICY "Anyone can view active products" ON products
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all products" ON products
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage products" ON products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for product_groups table
CREATE POLICY "Anyone can view product groups" ON product_groups
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage product groups" ON product_groups
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for product_product_groups table
CREATE POLICY "Anyone can view product-group links" ON product_product_groups
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage product-group links" ON product_product_groups
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for purchases table
CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all purchases" ON purchases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage purchases" ON purchases
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
