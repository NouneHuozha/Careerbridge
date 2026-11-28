import type { ReactNode } from "react";
import { AutomatedCollectionProvider } from "./collection-state";

export default function AutomatedCollectionLayout({ children }: { children: ReactNode }) {
  return <AutomatedCollectionProvider>{children}</AutomatedCollectionProvider>;
}
