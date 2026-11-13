"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "../account-provider";
import {
  recordHistoryVisit,
} from "./exploration-history";
import type { SavedItemContext, SavedItemType } from "./saved-items";

export function HistoryVisit({
  type,
  id,
  context,
}: {
  type: SavedItemType;
  id: string;
  context?: SavedItemContext;
}) {
  const account = useAccount();
  const lastRecordedKey = useRef("");
  const contextKey = JSON.stringify(context ?? {});

  useEffect(() => {
    if (account.status === "loading") return;
    const visitKey = `${type}:${id}:${contextKey}`;
    if (lastRecordedKey.current === visitKey) return;
    lastRecordedKey.current = visitKey;
    recordHistoryVisit({ type, id, context });
  }, [account.status, context, contextKey, id, type]);

  return null;
}
