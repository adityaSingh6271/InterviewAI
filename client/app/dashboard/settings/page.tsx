"use client";

import React from "react";
import SettingsView from "../../components/dashboard/SettingsView";

interface PageProps {
  params?: Promise<Record<string, string | string[] | undefined>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default function SettingsPage(props: PageProps = {}) {
  if (props.params) React.use(props.params);
  if (props.searchParams) React.use(props.searchParams);
  return (
    <div className="w-full">
      <SettingsView />
    </div>
  );
}
