"use client";

import React from "react";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import MetricsBanner from "./components/MetricsBanner";
import ProblemSection from "./components/ProblemSection";
import WorkflowSection from "./components/WorkflowSection";
import AICapabilitiesSection from "./components/AICapabilitiesSection";
import AnalyticsSection from "./components/AnalyticsSection";
import PricingSection from "./components/PricingSection";
import FinalCTA from "./components/FinalCTA";
import Footer from "./components/Footer";

interface HomePageProps {
  params?: Promise<Record<string, string | string[] | undefined>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default function Home(props: HomePageProps = {}) {
  if (props.params) React.use(props.params);
  if (props.searchParams) React.use(props.searchParams);
  return (
    <div className="w-full flex flex-col min-h-screen bg-white text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* ─── Sticky Minimal Navbar ─── */}
      <div className="sticky top-0 z-40 backdrop-blur-md bg-white/90 border-b border-slate-200/80">
        <Navbar />
      </div>

      {/* ─── 1. Hero Section (Headline + CTA + Authentic Product Mockup) ─── */}
      <HeroSection />

      {/* ─── 2. Social Proof & Candidate Telemetry Highlights ─── */}
      <MetricsBanner />

      {/* ─── 3. Problem Section (Generic Prep Trap vs Precision Intelligence) ─── */}
      <ProblemSection />

      {/* ─── 4. Solution & 5-Step Execution Pipeline ─── */}
      <WorkflowSection />

      {/* ─── 5. Concrete AI Capabilities & Features ─── */}
      <AICapabilitiesSection />

      {/* ─── 6. Analytics & Diagnostic Feedback Preview ─── */}
      <AnalyticsSection />

      {/* ─── 7. Simple, Transparent Pricing ─── */}
      <PricingSection />

      {/* ─── 8. Final Conversion CTA ─── */}
      <FinalCTA />

      {/* ─── 9. Clean Modern Footer with Aditya Singh Attribution ─── */}
      <Footer />
    </div>
  );
}
