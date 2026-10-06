import { supabaseAdmin } from "./supabase/admin";

export type SearchResults = {
  requirements: {
    id: string;
    tender_ref: string;
    customer: string;
    status: string;
  }[];
  oems: { id: string; name: string; products: string | null }[];
  orders: { id: string; po_number: string; requirement_id: string }[];
};

export async function searchAll(q: string): Promise<SearchResults> {
  const term = q.trim().replace(/[,()*%]/g, " ").replace(/\s+/g, " ").trim();
  if (term.length < 2) {
    return { requirements: [], oems: [], orders: [] };
  }
  const pattern = `*${term}*`;

  try {
    const db = supabaseAdmin();
    const [r, o, ord] = await Promise.all([
      db
        .from("requirements")
        .select("id,tender_ref,customer,status")
        .or(
          `tender_ref.ilike.${pattern},customer.ilike.${pattern},project.ilike.${pattern}`,
        )
        .limit(20),
      db
        .from("oems")
        .select("id,name,products")
        .or(`name.ilike.${pattern},products.ilike.${pattern}`)
        .limit(20),
      db
        .from("orders")
        .select("id,po_number,requirement_id")
        .ilike("po_number", pattern)
        .limit(20),
    ]);

    return {
      requirements: r.data ?? [],
      oems: o.data ?? [],
      orders: ord.data ?? [],
    };
  } catch {
    return { requirements: [], oems: [], orders: [] };
  }
}
