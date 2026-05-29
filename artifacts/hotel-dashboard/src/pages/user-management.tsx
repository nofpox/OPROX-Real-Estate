import React from "react";
import { useTranslation } from "react-i18next";

export default function UserManagement() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">Manage system users and permissions.</p>
      </div>
    </div>
  );
}
