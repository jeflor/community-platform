"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  pitch: z.string().optional(),
  lockedMessage: z.string().optional(),
  stripeProductId: z.string().optional(),
  stripePriceId: z.string().optional(),
  isActive: z.boolean().default(true),
  position: z.number().int().default(0),
  groupIds: z.array(z.string().uuid()).default([]),
});

const updateProductSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  pitch: z.string().optional(),
  lockedMessage: z.string().optional(),
  stripeProductId: z.string().optional(),
  stripePriceId: z.string().optional(),
  isActive: z.boolean(),
  position: z.number().int(),
  groupIds: z.array(z.string().uuid()).default([]),
});

const createProductGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  accessGroupId: z.string().uuid(),
});

const updateProductGroupSchema = z.object({
  productGroupId: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  accessGroupId: z.string().uuid(),
});

async function checkAdmin() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { error: "Not authenticated", supabase: null, userId: null };
  }

  const adminClient = createAdminClient();
  const { data: user } = await adminClient
    .from("users")
    .select("role")
    .eq("id", authUser.id)
    .single();

  if (user?.role !== "admin") {
    return { error: "Not authorized", supabase: null, userId: null };
  }

  return { supabase, userId: authUser.id, error: null };
}

export async function createProduct(data: z.infer<typeof createProductSchema>) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const validation = createProductSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const { groupIds, ...productData } = validation.data;

  const { data: product, error: productError } = await supabase!
    .from("products")
    .insert({
      name: productData.name,
      description: productData.description,
      pitch: productData.pitch,
      locked_message: productData.lockedMessage,
      stripe_product_id: productData.stripeProductId,
      stripe_price_id: productData.stripePriceId,
      is_active: productData.isActive,
      position: productData.position,
    })
    .select()
    .single();

  if (productError) {
    return { error: productError.message };
  }

  // Link product to product groups
  if (groupIds.length > 0) {
    const { error: linkError } = await supabase!
      .from("product_product_groups")
      .insert(
        groupIds.map((groupId) => ({
          product_id: product.id,
          product_group_id: groupId,
        }))
      );

    if (linkError) {
      return { error: linkError.message };
    }
  }

  revalidatePath("/dashboard/products");
  return { success: true, product };
}

export async function updateProduct(data: z.infer<typeof updateProductSchema>) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const validation = updateProductSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const { productId, groupIds, ...productData } = validation.data;

  const { error: productError } = await supabase!
    .from("products")
    .update({
      name: productData.name,
      description: productData.description,
      pitch: productData.pitch,
      locked_message: productData.lockedMessage,
      stripe_product_id: productData.stripeProductId,
      stripe_price_id: productData.stripePriceId,
      is_active: productData.isActive,
      position: productData.position,
    })
    .eq("id", productId);

  if (productError) {
    return { error: productError.message };
  }

  // Update product group links
  // First delete existing links
  await supabase!
    .from("product_product_groups")
    .delete()
    .eq("product_id", productId);

  // Then insert new links
  if (groupIds.length > 0) {
    const { error: linkError } = await supabase!
      .from("product_product_groups")
      .insert(
        groupIds.map((groupId) => ({
          product_id: productId,
          product_group_id: groupId,
        }))
      );

    if (linkError) {
      return { error: linkError.message };
    }
  }

  revalidatePath("/dashboard/products");
  return { success: true };
}

export async function deleteProduct(productId: string) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const { error } = await supabase!
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/products");
  return { success: true };
}

export async function createProductGroup(
  data: z.infer<typeof createProductGroupSchema>
) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const validation = createProductGroupSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const { error } = await supabase!
    .from("product_groups")
    .insert({
      name: validation.data.name,
      description: validation.data.description,
      access_group_id: validation.data.accessGroupId,
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/products");
  return { success: true };
}

export async function updateProductGroup(
  data: z.infer<typeof updateProductGroupSchema>
) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const validation = updateProductGroupSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const { error } = await supabase!
    .from("product_groups")
    .update({
      name: validation.data.name,
      description: validation.data.description,
      access_group_id: validation.data.accessGroupId,
    })
    .eq("id", validation.data.productGroupId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/products");
  return { success: true };
}

export async function deleteProductGroup(productGroupId: string) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const { error } = await supabase!
    .from("product_groups")
    .delete()
    .eq("id", productGroupId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/products");
  return { success: true };
}

export async function toggleProductActive(productId: string, isActive: boolean) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const { error } = await supabase!
    .from("products")
    .update({ is_active: isActive })
    .eq("id", productId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/products");
  return { success: true };
}

export async function updateProductPosition(
  productId: string,
  direction: "up" | "down"
) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const { data: currentProduct } = await supabase!
    .from("products")
    .select("position")
    .eq("id", productId)
    .single();

  if (!currentProduct) {
    return { error: "Product not found" };
  }

  const currentPosition = currentProduct.position;
  const newPosition = direction === "up" ? currentPosition - 1 : currentPosition + 1;

  if (newPosition < 0) {
    return { error: "Cannot move product further up" };
  }

  const { data: adjacentProduct } = await supabase!
    .from("products")
    .select("id, position")
    .eq("position", newPosition)
    .single();

  if (adjacentProduct) {
    await supabase!
      .from("products")
      .update({ position: currentPosition })
      .eq("id", adjacentProduct.id);
  }

  const { error } = await supabase!
    .from("products")
    .update({ position: newPosition })
    .eq("id", productId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/products");
  return { success: true };
}
