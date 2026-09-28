import { createClient } from "@/lib/supabase/server";
import { ProductsList } from "@/components/admin/ProductsList";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function ProductsPage() {
  await requireAdmin();
  
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select(`
      *,
      product_product_groups(
        product_group_id,
        product_groups(id, name)
      )
    `)
    .order("position", { ascending: true });

  const { data: productGroups } = await supabase
    .from("product_groups")
    .select("*, access_groups(id, name)")
    .order("name");

  const { data: accessGroups } = await supabase
    .from("access_groups")
    .select("id, name")
    .order("name");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Products</h1>
        <p className="text-gray-600">
          Manage your paid products and product groups. Configure Stripe integration and access controls.
        </p>
      </div>
      <ProductsList
        products={products || []}
        productGroups={productGroups || []}
        accessGroups={accessGroups || []}
      />
    </div>
  );
}
