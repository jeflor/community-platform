"use client";

import { useState } from "react";
import { createCheckoutSession } from "@/lib/actions/stripe";

interface Product {
  id: string;
  name: string;
  description: string | null;
  pitch: string | null;
  stripe_price_id: string | null;
  product_product_groups: {
    product_group_id: string;
    product_groups: { id: string; name: string };
  }[];
}

interface OffersListProps {
  products: Product[];
  supportEmail: string | null;
}

export function OffersList({ products, supportEmail }: OffersListProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (product: Product) => {
    if (!product.stripe_price_id) {
      setError("This product is not yet configured for purchase.");
      return;
    }

    setLoading(product.id);
    setError(null);

    const result = await createCheckoutSession({
      priceId: product.stripe_price_id,
      successUrl: `${window.location.origin}/dashboard/offers?success=true`,
      cancelUrl: `${window.location.origin}/dashboard/offers?cancelled=true`,
    });

    setLoading(null);

    if (result.error) {
      setError(result.error);
    } else if (result.url) {
      window.location.href = result.url;
    }
  };

  if (products.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-600 mb-4">
          No offers available at this time.
        </p>
        {supportEmail && (
          <p className="text-sm text-gray-500">
            Questions? Contact us at{" "}
            <a href={`mailto:${supportEmail}`} className="text-[#1E3A7A] hover:underline">
              {supportEmail}
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div 
            key={product.id} 
            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                {product.name}
              </h2>

              {product.pitch && (
                <p className="text-gray-700 mb-4 leading-relaxed whitespace-pre-wrap">
                  {product.pitch}
                </p>
              )}

              {product.description && (
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                  {product.description}
                </p>
              )}

              {product.product_product_groups.length > 0 && (
                <div className="mb-5 pt-4 border-t border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Includes access to:
                  </h3>
                  <ul className="space-y-1">
                    {product.product_product_groups.map((ppg) => (
                      <li key={ppg.product_group_id} className="flex items-start text-sm text-gray-700">
                        <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {ppg.product_groups.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {product.stripe_price_id ? (
                <button
                  onClick={() => handleCheckout(product)}
                  disabled={loading === product.id}
                  className="w-full px-6 py-3 bg-[#1E3A7A] text-white font-semibold rounded-lg hover:bg-[#152a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === product.id ? "Processing..." : "Get access"}
                </button>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-3">
                    Contact support to get access
                  </p>
                  {supportEmail && (
                    <a
                      href={`mailto:${supportEmail}`}
                      className="inline-block px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Contact support
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
