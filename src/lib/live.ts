import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to live database changes and refreshes storefront data
 * so visitors see staff edits without reloading the page.
 */
export function useLiveStoreUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("store-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["products"] });
          queryClient.invalidateQueries({ queryKey: ["related"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_variants" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["products"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "collections" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["collections"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["setting"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "navigation_items" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["nav"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
