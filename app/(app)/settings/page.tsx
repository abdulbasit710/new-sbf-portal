"use client";

import DynamicPortalDashboard from "@/components/notion/DynamicPortalDashboard";
import ProfileImageManager from "@/components/profile/ProfileImageManager";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <ProfileImageManager />
      <DynamicPortalDashboard view="identity" />
    </div>
  );
}
