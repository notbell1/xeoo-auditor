import React, { useEffect, useRef, useState } from "react";
import {
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Mail,
  User,
  Tag,
  HelpCircle,
  X,
  ChevronDown,
  MessageCircle,
  Bug,
  LockKeyhole,
  Lightbulb,
  MoreHorizontal,
  Check,
} from "lucide-react";
import Swal from "sweetalert2";
import { SEO, Button, Input } from "../../components/common";
import { PublicHeader } from "../../components/navigation/PublicHeader";
import { PublicFooter } from "../../components/navigation/PublicFooter";
import { trackCTA } from "../../lib/analytics";

type CategoryOption = {
  value: string;
  label: string;
  description: string;
  icon: React.ElementType;
};

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    value: "general",
    label: "General Inquiries",
    description: "Questions and general assistance",
    icon: MessageCircle,
  },
  {
    value: "bug_report",
    label: "Bug Report & Issue",
    description: "Report an error or unexpected behavior",
    icon: Bug,
  },
  {
    value: "security_disclosure",
    label: "Security Disclosure",
    description: "Responsible vulnerability reporting",
    icon: LockKeyhole,
  },
  {
    value: "feedback",
    label: "Feedback & Suggestions",
    description: "Ideas to improve XeooAuditor",
    icon: Lightbulb,
  },
  {
    value: "other",
    label: "Other Inquiries",
    description: "Anything that does not fit above",
    icon: MoreHorizontal,
  },
];

export const ContactPage: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [highlightedCategory, setHighlightedCategory] = useState(0);

  const categoryRef = useRef<HTMLDivElement>(null);
  const categoryButtonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedCategory =
    CATEGORY_OPTIONS.find((option) => option.value === category) ??
    CATEGORY_OPTIONS[0];

  const getCategoryLabel = (value: string) => {
    return (
      CATEGORY_OPTIONS.find((option) => option.value === value)?.label ??
      "General Inquiries"
    );
  };

  useEffect(() => {
    if (!categoryOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        categoryRef.current &&
        !categoryRef.current.contains(event.target as Node)
      ) {
        setCategoryOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCategoryOpen(false);
        categoryButtonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [categoryOpen]);

  useEffect(() => {
    if (categoryOpen) {
      optionRefs.current[highlightedCategory]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [categoryOpen, highlightedCategory]);

  const openCategoryDropdown = () => {
    const selectedIndex = CATEGORY_OPTIONS.findIndex(
      (option) => option.value === category,
    );

    setHighlightedCategory(Math.max(0, selectedIndex));
    setCategoryOpen((previous) => !previous);
  };

  const selectCategory = (option: CategoryOption) => {
    setCategory(option.value);
    setCategoryOpen(false);
    categoryButtonRef.current?.focus();
  };

  const handleCategoryKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!categoryOpen) {
          setCategoryOpen(true);
          return;
        }
        setHighlightedCategory(
          (current) => (current + 1) % CATEGORY_OPTIONS.length,
        );
        break;

      case "ArrowUp":
        event.preventDefault();
        if (!categoryOpen) {
          setCategoryOpen(true);
          return;
        }
        setHighlightedCategory(
          (current) =>
            (current - 1 + CATEGORY_OPTIONS.length) % CATEGORY_OPTIONS.length,
        );
        break;

      case "Home":
        if (categoryOpen) {
          event.preventDefault();
          setHighlightedCategory(0);
        }
        break;

      case "End":
        if (categoryOpen) {
          event.preventDefault();
          setHighlightedCategory(CATEGORY_OPTIONS.length - 1);
        }
        break;

      case "Enter":
      case " ":
        event.preventDefault();

        if (!categoryOpen) {
          setCategoryOpen(true);
        } else {
          const option = CATEGORY_OPTIONS[highlightedCategory];
          if (option) selectCategory(option);
        }
        break;

      case "Escape":
        if (categoryOpen) {
          event.preventDefault();
          setCategoryOpen(false);
        }
        break;

      case "Tab":
        setCategoryOpen(false);
        break;
    }
  };

  const handleOpenConfirmation = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    if (honeypot.trim().length > 0) {
      setFormError("Submission rejected by security gateway.");
      return;
    }

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setFormError("Please fill in all required fields before proceeding.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      setFormError("Please enter a valid email address.");
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmedSubmit = async () => {
    setShowConfirmModal(false);
    setIsLoading(true);
    setFormError(null);

    try {
      const response = await fetch("/api/contact/submit.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          category,
          subject: subject.trim(),
          message: message.trim(),
          website_sec_trap: honeypot,
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        setFormSuccess(true);
        setName("");
        setEmail("");
        setCategory("general");
        setSubject("");
        setMessage("");
        setHoneypot("");

        trackCTA("contact_form_submit", "contact_page");

        await Swal.fire({
          icon: "success",
          title: "Message Delivered",
          text:
            data?.data?.message ||
            "Thank you. Your message has been received securely.",
          confirmButtonColor: "#2563eb",
          confirmButtonText: "Done",
          background: "#0f172a",
          color: "#f8fafc",
          customClass: {
            popup:
              "border border-slate-700 rounded-xl shadow-2xl max-w-sm text-xs",
          },
        });
      } else {
        const errorMessage =
          data?.error ||
          data?.message ||
          "Unable to send message. Please review your input.";

        setFormError(errorMessage);

        await Swal.fire({
          icon: response.status === 429 ? "warning" : "error",
          title:
            response.status === 429 ? "Rate Limit Active" : "Submission Failed",
          text: errorMessage,
          confirmButtonColor: "#2563eb",
          confirmButtonText: "Close",
          background: "#0f172a",
          color: "#f8fafc",
          customClass: {
            popup:
              "border border-slate-700 rounded-xl shadow-2xl max-w-sm text-xs",
          },
        });
      }
    } catch {
      setFormError(
        "Network connection failed. Unable to reach the server. Please check your network.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen  flex flex-col bg-[var(--color-background)] text-[var(--color-text-primary)]">
      <SEO
        title="Contact XeooAuditor"
        description="Have questions, bug reports, or responsible security disclosures? Send a secure message directly to our team."
        canonicalPath="/contact"
      />

      <div className="shrink-0">
        <PublicHeader activeSectionId="contact" />
      </div>

      <main className="flex-1 w-full min-w-0 flex flex-col items-center justify-center px-4 py-5 sm:px-6 sm:py-6">
        <div className="w-full max-w-2xl mx-auto">
          <header className="text-center max-w-lg mx-auto mb-4 sm:mb-5">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-[var(--color-text-primary)]">
              Contact{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                XeooAuditor
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed mt-2 max-w-md mx-auto">
              Send an inquiry, reproducible bug report, or responsible security
              vulnerability disclosure.
            </p>
          </header>

          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-5 md:p-6 shadow-xl shadow-black/10 w-full max-w-xl mx-auto">
            <form
              onSubmit={handleOpenConfirmation}
              className="space-y-4"
              noValidate
            >
              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--color-status-fail-bg)] border border-[var(--color-status-fail-border)] text-[var(--color-status-fail-text)] text-xs"
                >
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span className="font-medium break-words">{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div
                  role="status"
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--color-status-pass-bg)] border border-[var(--color-status-pass-border)] text-[var(--color-status-pass-text)] text-xs"
                >
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                  <span className="font-medium">
                    Your message has been securely submitted. Thank you!
                  </span>
                </div>
              )}

              {/* Honeypot: hidden from human users */}
              <div
                aria-hidden="true"
                className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
              >
                <label htmlFor="website_sec_trap">Leave empty</label>
                <input
                  id="website_sec_trap"
                  type="text"
                  name="website_sec_trap"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(event) => setHoneypot(event.target.value)}
                />
              </div>

              {/* Name and email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="min-w-0 space-y-1.5">
                  <label
                    htmlFor="contact_name"
                    className="block text-xs font-semibold text-[var(--color-text-secondary)]"
                  >
                    Full Name <span className="text-red-400">*</span>
                  </label>

                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-text-muted)] pointer-events-none" />

                    <Input
                      id="contact_name"
                      type="text"
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Enter your name"
                      autoComplete="name"
                      className="w-full min-w-0 pl-9 py-2.5 text-sm bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
                    />
                  </div>
                </div>

                <div className="min-w-0 space-y-1.5">
                  <label
                    htmlFor="contact_email"
                    className="block text-xs font-semibold text-[var(--color-text-secondary)]"
                  >
                    Email Address <span className="text-red-400">*</span>
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-text-muted)] pointer-events-none" />

                    <Input
                      id="contact_email"
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@example.com"
                      autoComplete="email"
                      className="w-full min-w-0 pl-9 py-2.5 text-sm bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
                    />
                  </div>
                </div>
              </div>

              {/* Custom category dropdown */}
              <div className="space-y-1.5">
                <label
                  id="contact_category_label"
                  className="block text-xs font-semibold text-[var(--color-text-secondary)]"
                >
                  Inquiry Category <span className="text-red-400">*</span>
                </label>

                <div className="relative" ref={categoryRef}>
                  <button
                    ref={categoryButtonRef}
                    type="button"
                    id="contact_category"
                    aria-labelledby="contact_category_label"
                    aria-haspopup="listbox"
                    aria-expanded={categoryOpen}
                    aria-controls="contact_category_listbox"
                    onClick={openCategoryDropdown}
                    onKeyDown={handleCategoryKeyDown}
                    className={`group flex w-full min-h-[48px] items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:px-4 ${
                      categoryOpen
                        ? "border-slate-400 bg-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700">
                      <selectedCategory.icon className="size-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {selectedCategory.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-600">
                        {selectedCategory.description}
                      </span>
                    </span>

                    <ChevronDown
                      className={`size-4 shrink-0 text-slate-600 transition-transform duration-200 ${
                        categoryOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {categoryOpen && (
                    <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-black/10 animate-in fade-in slide-in-from-top-1 duration-150">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3.5 py-3">
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">
                          Select a category
                        </span>

                        <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700">
                          {CATEGORY_OPTIONS.length} options
                        </span>
                      </div>

                      {/* Options */}
                      <div
                        id="contact_category_listbox"
                        role="listbox"
                        aria-labelledby="contact_category_label"
                        className="max-h-[min(16rem,40dvh)] overflow-y-auto overscroll-contain bg-white p-1.5 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]"
                      >
                        {CATEGORY_OPTIONS.map((option, index) => {
                          const OptionIcon = option.icon;
                          const isSelected = category === option.value;
                          const isHighlighted = highlightedCategory === index;

                          return (
                            <button
                              key={option.value}
                              ref={(element) => {
                                optionRefs.current[index] = element;
                              }}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onMouseEnter={() => setHighlightedCategory(index)}
                              onClick={() => selectCategory(option)}
                              onKeyDown={handleCategoryKeyDown}
                              tabIndex={-1}
                              className={`flex w-full min-w-0 items-center gap-3 rounded-lg border px-2.5 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                                isSelected
                                  ? "border-slate-300 bg-slate-100"
                                  : isHighlighted
                                    ? "border-slate-200 bg-slate-50"
                                    : "border-transparent bg-white"
                              }`}
                            >
                              <span
                                className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${
                                  isSelected
                                    ? "border-slate-300 bg-white text-slate-900"
                                    : "border-slate-200 bg-white text-slate-600"
                                }`}
                              >
                                <OptionIcon className="size-4" />
                              </span>

                              <span className="min-w-0 flex-1">
                                <span
                                  className={`block break-words text-xs font-semibold sm:text-sm ${
                                    isSelected
                                      ? "text-slate-950"
                                      : "text-slate-800"
                                  }`}
                                >
                                  {option.label}
                                </span>

                                <span className="mt-1 block break-words text-[10px] leading-relaxed text-slate-600 sm:text-[11px]">
                                  {option.description}
                                </span>
                              </span>

                              {isSelected && (
                                <Check className="size-4 shrink-0 text-slate-800" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Footer */}
                      <div className="border-t border-slate-200 bg-white px-3.5 py-2.5">
                        <p className="text-[10px] leading-relaxed text-slate-600">
                          Choose the category that best matches your inquiry.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject */}
              <div className="min-w-0 space-y-1.5">
                <label
                  htmlFor="contact_subject"
                  className="block text-xs font-semibold text-[var(--color-text-secondary)]"
                >
                  Subject <span className="text-red-400">*</span>
                </label>

                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-text-muted)] pointer-events-none" />

                  <Input
                    id="contact_subject"
                    type="text"
                    required
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="Brief summary of your inquiry"
                    className="w-full min-w-0 pl-9 py-2.5 text-sm bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
                  />
                </div>
              </div>

              {/* Message */}
              <div className="min-w-0 space-y-1.5">
                <label
                  htmlFor="contact_message"
                  className="block text-xs font-semibold text-[var(--color-text-secondary)]"
                >
                  Message Details <span className="text-red-400">*</span>
                </label>

                <textarea
                  id="contact_message"
                  rows={3}
                  required
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Describe your inquiry or steps to reproduce..."
                  className="block w-full min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] resize-y"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isLoading}
                isLoading={isLoading}
                leftIcon={
                  isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )
                }
                className="w-full min-h-11 justify-center rounded-xl border border-blue-700 bg-blue-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Send Secure Message
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-center">
                <LockKeyhole className="size-3.5 shrink-0 text-[var(--color-text-muted)]" />
                <p className="text-[10px] sm:text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                  Submissions are rate-limited and protected by an automated
                  security gate.
                </p>
              </div>
            </form>
          </section>
        </div>
      </main>

      <div className="shrink-0">
        <PublicFooter />
      </div>

      {/* Confirmation modal */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowConfirmModal(false);
            }
          }}
        >
          <div className="my-auto  max-h-[calc(100dvh-1.5rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-2xl sm:max-w-md sm:p-5">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-2 text-blue-400">
                  <HelpCircle className="size-4" />
                </div>

                <h3
                  id="confirm-modal-title"
                  className="text-sm font-bold text-[var(--color-text-primary)]"
                >
                  Confirm Submission
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                aria-label="Cancel"
                className="shrink-0 rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-blue-500"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="py-4 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Are you sure you want to send this inquiry to the XeooAuditor
              team?
            </p>

            <div className="space-y-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] p-3 text-xs">
              <div className="flex items-start justify-between gap-3">
                <span className="shrink-0 text-[var(--color-text-muted)]">
                  Sender
                </span>
                <span className="break-words text-right font-semibold text-[var(--color-text-primary)]">
                  {name}
                </span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <span className="shrink-0 text-[var(--color-text-muted)]">
                  Email
                </span>
                <span className="break-all text-right font-mono text-[var(--color-text-primary)]">
                  {email}
                </span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <span className="shrink-0 text-[var(--color-text-muted)]">
                  Category
                </span>
                <span className="text-right text-[var(--color-text-primary)]">
                  {getCategoryLabel(category)}
                </span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <span className="shrink-0 text-[var(--color-text-muted)]">
                  Subject
                </span>
                <span className="break-words text-right font-medium text-[var(--color-text-primary)]">
                  {subject}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-col-reverse gap-2 border-t border-[var(--color-border-subtle)] pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
                className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 sm:w-auto"
              >
                Cancel / Edit
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isLoading}
                onClick={handleConfirmedSubmit}
                leftIcon={<Send className="size-3.5" />}
                className="min-h-10 w-full rounded-lg border border-blue-700 bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:w-auto"
              >
                Confirm &amp; Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
