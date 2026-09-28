import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OffersList } from "@/components/OffersList";
import { getSupportEmail } from "@/lib/settings/get-support-email";

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; cancelled?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get active products
  const { data: products } = await supabase
    .from("products")
    .select(`
      *,
      product_product_groups(
        product_group_id,
        product_groups(id, name, access_group_id)
      )
    `)
    .eq("is_active", true)
    .order("position", { ascending: true });

  // Get user's purchases
  const { data: purchases } = await supabase
    .from("purchases")
    .select("product_id, status")
    .eq("user_id", user.id)
    .in("status", ["active", "past_due"]);

  const purchasedProductIds = new Set(
    purchases?.map((p) => p.product_id) || []
  );

  // Filter out purchased products
  const unpurchasedProducts = products?.filter(
    (p) => !purchasedProductIds.has(p.id)
  ) || [];

  const supportEmail = await getSupportEmail();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Offers</h1>
      
      {params.success === "true" && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          <p className="font-semibold">Payment successful!</p>
          <p className="text-sm">Your access has been activated. Refresh the page if needed.</p>
        </div>
      )}

      {params.cancelled === "true" && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          <p className="font-semibold">Payment cancelled</p>
          <p className="text-sm">You can complete your purchase anytime.</p>
        </div>
      )}

      <OffersList products={unpurchasedProducts} supportEmail={supportEmail} />
    </div>
  );
}
