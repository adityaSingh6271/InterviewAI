"use client";

import React from "react";
import ProfileView from "../../components/dashboard/ProfileView";

interface PageProps {
  params?: Promise<Record<string, string | string[] | undefined>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default function ProfilePage(props: PageProps = {}) {
  if (props.params) React.use(props.params);
  if (props.searchParams) React.use(props.searchParams);
  return (
    <div className="w-full">
      <ProfileView />
    </div>
  );
}
