"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function playNotificationTone() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    void ctx.close();
  } catch {
    /* ignore — autoplay may be blocked */
  }
}

/** Realtime staff notifications with optional sound on new items. */
export function StaffNotificationListener({
  userId,
  orgId,
}: {
  userId: string;
  orgId: string;
}) {
  const router = useRouter();
  const initial = useRef(true);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`staff-notify-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { organization_id?: string };
          if (row.organization_id && row.organization_id !== orgId) return;
          if (initial.current) return;
          playNotificationTone();
          router.refresh();
        }
      )
      .subscribe();

    initial.current = false;

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, orgId, router]);

  return null;
}
