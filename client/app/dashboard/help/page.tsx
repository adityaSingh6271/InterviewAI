"use client";

import React from "react";
import HelpCenterView from "../../components/dashboard/HelpCenterView";

interface PageProps {
  params?: Promise<Record<string, string | string[] | undefined>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default function HelpPage(props: PageProps = {}) {
  if (props.params) React.use(props.params);
  if (props.searchParams) React.use(props.searchParams);
  return (
    <div className="w-full">
      <HelpCenterView />
    </div>
  );
}
