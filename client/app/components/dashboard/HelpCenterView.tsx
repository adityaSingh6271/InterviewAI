"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ticketSchema, TicketFormData } from "../../lib/validations";
import { Search, ChevronDown, ChevronUp, CheckCircle2, HelpCircle } from "lucide-react";
import toast from "react-hot-toast";
import IconButton from "@/components/common/icon-button";
import { useAuth } from "../providers/AuthProvider";

const HELP_FAQS = [
  {
    q: "How does AI evaluation score my interview responses?",
    a: "Your recorded or typed responses are evaluated by the configured LLM against the round's expected keywords and job requirements, producing a score and actionable feedback per question.",
  },
  {
    q: "Can I upload my actual resume for custom analysis?",
    a: "Yes. When creating a job interview workspace, upload a PDF, DOCX, or TXT resume (or paste plain text) to run JD-to-resume matching and identify skill gaps.",
  },
  {
    q: "How does live camera, eye focus, and voice proctoring work?",
    a: "During simulation rounds, you can enable your camera and microphone for live face presence detection, eye-contact estimation, posture tracking, and real-time browser speech-to-text.",
  },
  {
    q: "Where can I review past interview attempts and examiner feedback?",
    a: "Open any interview workspace and expand the Reports or Rounds sections, or visit the Analytics page for aggregated attempt scores and trends.",
  },
];

export default function HelpCenterView() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      category: "Mock Interviews",
      subject: "",
      message: "",
    },
    mode: "onTouched",
  });

  useEffect(() => {
    if (user) {
      reset((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
      }));
    }
  }, [user, reset]);

  const onSubmitTicket = async (_data: TicketFormData) => {
    await new Promise((res) => setTimeout(res, 400));
    setTicketSubmitted(true);
    toast.success("Support ticket submitted successfully! We'll reply within 24 hours.");
    reset({
      name: user?.name || "",
      email: user?.email || "",
      category: "Mock Interviews",
      subject: "",
      message: "",
    });
  };

  const filteredFaqs = HELP_FAQS.filter(
    (faq) =>
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-[26px] md:text-[28px] font-semibold text-slate-900 tracking-tight leading-tight">
          Help & Support Center
        </h1>
        <p className="text-xs sm:text-[13px] text-slate-500 font-normal mt-0.5">
          Explore documentation, FAQs, and submit support tickets directly to our engineering team.
        </p>
      </div>

      {/* FAQ Search Bar */}
      <div className="relative bg-white rounded-xl p-3 border border-slate-200 shadow-xs">
        <Search className="w-4 h-4 text-slate-400 absolute left-4.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search frequently asked questions (e.g. speech telemetry, scoring, resume parsing)..."
          maxLength={100}
          className="w-full pl-10 pr-4 h-10 rounded-lg border border-slate-200 bg-white text-xs sm:text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0C356A]/20 focus:border-[#0C356A] transition-all font-normal"
        />
      </div>

      {/* FAQ Accordion Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 space-y-3">
          <h3 className="text-[15px] sm:text-[16px] font-semibold text-slate-900 mb-2">Frequently Asked Questions</h3>
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:border-[#0C356A]/40 transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between font-medium text-xs sm:text-[13.5px] text-slate-900 hover:text-[#0C356A] transition-colors cursor-pointer"
                >
                  <span className="pr-3">{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#0C356A] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-3.5 sm:px-4 pb-4 text-xs sm:text-[13px] text-slate-600 leading-relaxed border-t border-slate-100 pt-3 font-normal">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Support Ticket Submission Form */}
        <div className="lg:col-span-5 bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-xs hover:border-[#0C356A]/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-5 h-5 text-[#0C356A]" />
              <h3 className="text-base sm:text-[17px] font-bold text-slate-900">Submit Support Ticket</h3>
            </div>
            <p className="text-xs sm:text-[12.5px] text-slate-500 mb-4">
              Need technical support or custom interview rubrics? Reach out below.
            </p>

            {ticketSubmitted ? (
              <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs text-center space-y-2 animate-in fade-in duration-200">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-1">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="text-base font-bold text-emerald-900">Ticket Submitted!</div>
                <p className="text-xs">Our engineering support team will respond to your email within 24 hours.</p>
                <button
                  type="button"
                  onClick={() => setTicketSubmitted(false)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs mt-2 cursor-pointer transition-colors"
                >
                  Submit Another Ticket
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmitTicket)} className="space-y-3.5" noValidate>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    {...register("category")}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-xs sm:text-[13px] font-semibold text-slate-700 focus:ring-2 focus:ring-[#0C356A]/20 focus:border-[#0C356A] focus:outline-none cursor-pointer"
                  >
                    <option value="Mock Interviews">Mock Interviews</option>
                    <option value="Audio / Telemetry">Audio / Telemetry</option>
                    <option value="Billing & Plans">Billing & Plans</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Subject
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description of the issue"
                    maxLength={100}
                    {...register("subject")}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-[13px] focus:outline-none focus:ring-2 ${
                      errors.subject
                        ? "border-red-400 bg-red-50/30 focus:ring-red-200"
                        : "border-slate-200 bg-white focus:border-[#0C356A] focus:ring-[#0C356A]/20"
                    }`}
                  />
                  {errors.subject && (
                    <p className="text-red-600 text-xs font-medium mt-1">
                      {errors.subject.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Detailed Message
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Explain the issue or rubric request in detail..."
                    maxLength={1000}
                    {...register("message")}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-[13px] focus:outline-none focus:ring-2 ${
                      errors.message
                        ? "border-red-400 bg-red-50/30 focus:ring-red-200"
                        : "border-slate-200 bg-white focus:border-[#0C356A] focus:ring-[#0C356A]/20"
                    }`}
                  />
                  {errors.message && (
                    <p className="text-red-600 text-xs font-medium mt-1">
                      {errors.message.message}
                    </p>
                  )}
                </div>

                <IconButton
                  type="submit"
                  action="submit"
                  label="Submit Ticket"
                  isLoading={isSubmitting}
                  loadingText="Submitting Ticket..."
                  className="w-full"
                />
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

