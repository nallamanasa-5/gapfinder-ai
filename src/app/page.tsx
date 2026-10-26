
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function checkLogin() {
      const { data } = await supabase.auth.getSession();

      if (!active) return;

      if (data.session) {
        router.replace("/dashboard");
      } else {
        router.replace("/auth");
      }
    }

    checkLogin();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        fontFamily: "Arial, sans-serif",
        color: "#176b57",
      }}
    >
      Loading GapFinder AI...
    </main>
  );
}
