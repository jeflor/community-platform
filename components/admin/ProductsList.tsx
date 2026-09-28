"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  createProductGroup,
  updateProductGroup,
  deleteProductGroup,
  toggleProductActive,
  updateProductPosition,
} from "@/lib/actions/products";

interface Product {
  id: string;
  name: string;
  description: string | null;
  pitch: string | null;
  locked_message: string | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  is_active: boolean;
  position: number;
  product_product_groups: {
    product_group_id: string;
    product_groups: { id: string; name: string };
  }[];
}

interface ProductGroup {
  id: string;
  name: string;
  description: string | null;
  access_group_id: string;
  access_groups: { id: string; name: string };
}

interface AccessGroup {
  id: string;
  name: string;
}

interface ProductsListProps {
  products: Product[];
  productGroups: ProductGroup[];
  accessGroups: AccessGroup[];
}

export function ProductsList({
  products,
  productGroups,
  accessGroups,
}: ProductsListProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"products" | "groups">("products");
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [productFormData, setProductFormData] = useState({
    name: "",
    description: "",
    pitch: "",
    lockedMessage: "",
    stripeProductId: "",
    stripePriceId: "",
    isActive: true,
    position: 0,
    groupIds: [] as string[],
  });

  const [groupFormData, setGroupFormData] = useState({
    name: "",
    description: "",
    accessGroupId: "",
  });

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await createProduct(productFormData);
    setProductFormData({
      name: "",
      description: "",
      pitch: "",
      lockedMessage: "",
      stripeProductId: "",
      stripePriceId: "",
      isActive: true,
      position: 0,
      groupIds: [],
    });
    setIsCreatingProduct(false);
    setLoading(false);
    router.refresh();
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductId) return;
    setLoading(true);
    await updateProduct({ productId: editingProductId, ...productFormData });
    setEditingProductId(null);
    setProductFormData({
      name: "",
      description: "",
      pitch: "",
      lockedMessage: "",
      stripeProductId: "",
      stripePriceId: "",
      isActive: true,
      position: 0,
      groupIds: [],
    });
    setLoading(false);
    router.refresh();
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    setLoading(true);
    await deleteProduct(productId);
    setLoading(false);
    router.refresh();
  };

  const handleToggleActive = async (productId: string, isActive: boolean) => {
    setLoading(true);
    await toggleProductActive(productId, !isActive);
    setLoading(false);
    router.refresh();
  };

  const handleMoveProduct = async (productId: string, direction: "up" | "down") => {
    setLoading(true);
    const result = await updateProductPosition(productId, direction);
    if (result.error) {
      alert(result.error);
    }
    setLoading(false);
    router.refresh();
  };

  const startEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setProductFormData({
      name: product.name,
      description: product.description || "",
      pitch: product.pitch || "",
      lockedMessage: product.locked_message || "",
      stripeProductId: product.stripe_product_id || "",
      stripePriceId: product.stripe_price_id || "",
      isActive: product.is_active,
      position: product.position,
      groupIds: product.product_product_groups.map((ppg) => ppg.product_group_id),
    });
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await createProductGroup(groupFormData);
    setGroupFormData({ name: "", description: "", accessGroupId: "" });
    setIsCreatingGroup(false);
    setLoading(false);
    router.refresh();
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroupId) return;
    setLoading(true);
    await updateProductGroup({ productGroupId: editingGroupId, ...groupFormData });
    setEditingGroupId(null);
    setGroupFormData({ name: "", description: "", accessGroupId: "" });
    setLoading(false);
    router.refresh();
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this product group?")) return;
    setLoading(true);
    await deleteProductGroup(groupId);
    setLoading(false);
    router.refresh();
  };

  const startEditGroup = (group: ProductGroup) => {
    setEditingGroupId(group.id);
    setGroupFormData({
      name: group.name,
      description: group.description || "",
      accessGroupId: group.access_group_id,
    });
  };

  const toggleGroupSelection = (groupId: string) => {
    setProductFormData((prev) => ({
      ...prev,
      groupIds: prev.groupIds.includes(groupId)
        ? prev.groupIds.filter((id) => id !== groupId)
        : [...prev.groupIds, groupId],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab("products")}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === "products"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab("groups")}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === "groups"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              Product Groups
            </button>
          </nav>
        </div>
      </div>

      {activeTab === "products" && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <button
              onClick={() => setIsCreatingProduct(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Create Product
            </button>
          </div>

          {isCreatingProduct && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Create New Product
              </h2>
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={productFormData.name}
                      onChange={(e) =>
                        setProductFormData({ ...productFormData, name: e.target.value })
                      }
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Position
                    </label>
                    <input
                      type="number"
                      value={productFormData.position}
                      onChange={(e) =>
                        setProductFormData({
                          ...productFormData,
                          position: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Description
                  </label>
                  <textarea
                    value={productFormData.description}
                    onChange={(e) =>
                      setProductFormData({
                        ...productFormData,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Pitch (sales copy)
                  </label>
                  <textarea
                    value={productFormData.pitch}
                    onChange={(e) =>
                      setProductFormData({ ...productFormData, pitch: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Locked Message
                  </label>
                  <textarea
                    value={productFormData.lockedMessage}
                    onChange={(e) =>
                      setProductFormData({
                        ...productFormData,
                        lockedMessage: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Stripe Product ID
                    </label>
                    <input
                      type="text"
                      value={productFormData.stripeProductId}
                      onChange={(e) =>
                        setProductFormData({
                          ...productFormData,
                          stripeProductId: e.target.value,
                        })
                      }
                      placeholder="prod_..."
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Stripe Price ID
                    </label>
                    <input
                      type="text"
                      value={productFormData.stripePriceId}
                      onChange={(e) =>
                        setProductFormData({
                          ...productFormData,
                          stripePriceId: e.target.value,
                        })
                      }
                      placeholder="price_..."
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Grant Access to Product Groups
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                    {productGroups.map((group) => (
                      <label key={group.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={productFormData.groupIds.includes(group.id)}
                          onChange={() => toggleGroupSelection(group.id)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{group.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={productFormData.isActive}
                    onChange={(e) =>
                      setProductFormData({
                        ...productFormData,
                        isActive: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-900">
                    Active
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingProduct(false);
                      setProductFormData({
                        name: "",
                        description: "",
                        pitch: "",
                        lockedMessage: "",
                        stripeProductId: "",
                        stripePriceId: "",
                        isActive: true,
                        position: 0,
                        groupIds: [],
                      });
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow p-6">
                {editingProductId === product.id ? (
                  <form onSubmit={handleUpdateProduct} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={productFormData.name}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              name: e.target.value,
                            })
                          }
                          required
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Position
                        </label>
                        <input
                          type="number"
                          value={productFormData.position}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              position: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Description
                      </label>
                      <textarea
                        value={productFormData.description}
                        onChange={(e) =>
                          setProductFormData({
                            ...productFormData,
                            description: e.target.value,
                          })
                        }
                        rows={2}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Pitch (sales copy)
                      </label>
                      <textarea
                        value={productFormData.pitch}
                        onChange={(e) =>
                          setProductFormData({
                            ...productFormData,
                            pitch: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Locked Message
                      </label>
                      <textarea
                        value={productFormData.lockedMessage}
                        onChange={(e) =>
                          setProductFormData({
                            ...productFormData,
                            lockedMessage: e.target.value,
                          })
                        }
                        rows={2}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Stripe Product ID
                        </label>
                        <input
                          type="text"
                          value={productFormData.stripeProductId}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              stripeProductId: e.target.value,
                            })
                          }
                          placeholder="prod_..."
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Stripe Price ID
                        </label>
                        <input
                          type="text"
                          value={productFormData.stripePriceId}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              stripePriceId: e.target.value,
                            })
                          }
                          placeholder="price_..."
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Grant Access to Product Groups
                      </label>
                      <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                        {productGroups.map((group) => (
                          <label key={group.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={productFormData.groupIds.includes(group.id)}
                              onChange={() => toggleGroupSelection(group.id)}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm">{group.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`isActive-${product.id}`}
                        checked={productFormData.isActive}
                        onChange={(e) =>
                          setProductFormData({
                            ...productFormData,
                            isActive: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300"
                      />
                      <label
                        htmlFor={`isActive-${product.id}`}
                        className="text-sm font-medium text-gray-900"
                      >
                        Active
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProductId(null);
                          setProductFormData({
                            name: "",
                            description: "",
                            pitch: "",
                            lockedMessage: "",
                            stripeProductId: "",
                            stripePriceId: "",
                            isActive: true,
                            position: 0,
                            groupIds: [],
                          });
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          {product.name}
                          {!product.is_active && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                              Inactive
                            </span>
                          )}
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            Pos: {product.position}
                          </span>
                        </h3>
                        {product.description && (
                          <p className="text-gray-600 text-sm mt-1">
                            {product.description}
                          </p>
                        )}
                        {product.stripe_price_id && (
                          <p className="text-xs text-gray-500 mt-2">
                            Stripe Price: {product.stripe_price_id}
                          </p>
                        )}
                        {product.product_product_groups.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-600">Groups: </span>
                            {product.product_product_groups.map((ppg, idx) => (
                              <span
                                key={ppg.product_group_id}
                                className="text-xs text-blue-600"
                              >
                                {ppg.product_groups.name}
                                {idx < product.product_product_groups.length - 1 && ", "}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 items-start">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleMoveProduct(product.id, "up")}
                            disabled={loading}
                            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition disabled:opacity-50"
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => handleMoveProduct(product.id, "down")}
                            disabled={loading}
                            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition disabled:opacity-50"
                            title="Move down"
                          >
                            ↓
                          </button>
                        </div>
                        <button
                          onClick={() => startEditProduct(product)}
                          className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(product.id, product.is_active)}
                          disabled={loading}
                          className={`px-3 py-1 text-sm rounded transition disabled:opacity-50 ${
                            product.is_active
                              ? "text-orange-600 hover:bg-orange-50"
                              : "text-green-600 hover:bg-green-50"
                          }`}
                        >
                          {product.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          disabled={loading}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "groups" && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <button
              onClick={() => setIsCreatingGroup(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Create Product Group
            </button>
          </div>

          {isCreatingGroup && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Create New Product Group
              </h2>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={groupFormData.name}
                    onChange={(e) =>
                      setGroupFormData({ ...groupFormData, name: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Description
                  </label>
                  <textarea
                    value={groupFormData.description}
                    onChange={(e) =>
                      setGroupFormData({
                        ...groupFormData,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Access Group *
                  </label>
                  <select
                    value={groupFormData.accessGroupId}
                    onChange={(e) =>
                      setGroupFormData({
                        ...groupFormData,
                        accessGroupId: e.target.value,
                      })
                    }
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select an access group</option>
                    {accessGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingGroup(false);
                      setGroupFormData({ name: "", description: "", accessGroupId: "" });
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {productGroups.map((group) => (
              <div key={group.id} className="bg-white rounded-lg shadow p-6">
                {editingGroupId === group.id ? (
                  <form onSubmit={handleUpdateGroup} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={groupFormData.name}
                        onChange={(e) =>
                          setGroupFormData({ ...groupFormData, name: e.target.value })
                        }
                        required
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Description
                      </label>
                      <textarea
                        value={groupFormData.description}
                        onChange={(e) =>
                          setGroupFormData({
                            ...groupFormData,
                            description: e.target.value,
                          })
                        }
                        rows={2}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Access Group *
                      </label>
                      <select
                        value={groupFormData.accessGroupId}
                        onChange={(e) =>
                          setGroupFormData({
                            ...groupFormData,
                            accessGroupId: e.target.value,
                          })
                        }
                        required
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select an access group</option>
                        {accessGroups.map((ag) => (
                          <option key={ag.id} value={ag.id}>
                            {ag.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGroupId(null);
                          setGroupFormData({
                            name: "",
                            description: "",
                            accessGroupId: "",
                          });
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {group.name}
                        </h3>
                        {group.description && (
                          <p className="text-gray-600 text-sm mt-1">
                            {group.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Access Group: {group.access_groups.name}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditGroup(group)}
                          className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          disabled={loading}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
