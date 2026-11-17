import type { Metadata } from "next";
import SettingsPage from "./settings-page";

export const metadata: Metadata = { title: "Settings | CareerBridge" };

export default function SettingsRoute() {
  return <SettingsPage />;
}
