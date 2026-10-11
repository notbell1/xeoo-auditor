import React from "react";
import { Server, LockKeyhole, Lock } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  PageHeader,
} from "../../components/common";

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title="Settings & Operational Limits"
        description="Active runtime policies, engine execution constraints, and architectural boundaries."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Engine Execution Limits */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="size-4 text-[var(--color-brand-primary)]" />
              <CardTitle>Engine Crawler Limits</CardTitle>
            </div>
            <CardDescription>
              Hard boundaries enforced to avoid host resource exhaustion and respect target servers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-text-muted)]">Max Request Timeout</span>
              <span className="font-mono font-bold text-[var(--color-text-primary)]">10 seconds</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-text-muted)]">Max Redirect Hops</span>
              <span className="font-mono font-bold text-[var(--color-text-primary)]">5 hops</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-text-muted)]">Max Response Payload</span>
              <span className="font-mono font-bold text-[var(--color-text-primary)]">2 MB</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-text-muted)]">Traversal Depth Bound</span>
              <span className="font-mono font-bold text-[var(--color-text-primary)]">20 pages max</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[var(--color-text-muted)]">Concurrency Limit</span>
              <span className="font-mono font-bold text-[var(--color-text-primary)]">1 scan / IP</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Security & SSRF Defense */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-[var(--color-brand-primary)]" />
              <CardTitle>Security & SSRF Safeguards</CardTitle>
            </div>
            <CardDescription>
              Connection-time defenses preventing server-side request forgery attacks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-text-muted)]">Permitted Schemes</span>
              <span className="font-mono font-bold text-[var(--color-text-primary)]">http:// & https:// only</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-text-muted)]">Private IP Blacklist</span>
              <span className="font-mono font-bold text-[var(--color-status-pass)]">RFC 1918 Blocked</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-text-muted)]">Cloud Metadata (169.254)</span>
              <span className="font-mono font-bold text-[var(--color-status-pass)]">Blocked</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-text-muted)]">DNS Rebinding Protection</span>
              <span className="font-mono font-bold text-[var(--color-status-pass)]">Resolved at connect</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[var(--color-text-muted)]">TLS Verification</span>
              <span className="font-mono font-bold text-[var(--color-text-primary)]">Strict (Never disabled)</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Privacy Stance */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <LockKeyhole className="size-4 text-[var(--color-brand-primary)]" />
              <CardTitle>Zero-Store Privacy Policy</CardTitle>
            </div>
            <CardDescription>
              Visitor privacy principles guaranteed by architectural constraints.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] space-y-1">
              <span className="font-bold text-[var(--color-text-primary)] block">No Visitor Accounts</span>
              <p className="text-[var(--color-text-muted)] leading-relaxed">
                Audits are generated without user login, sign-up forms, or persistent identity trackers.
              </p>
            </div>

            <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] space-y-1">
              <span className="font-bold text-[var(--color-text-primary)] block">Zero Target Credentials</span>
              <p className="text-[var(--color-text-muted)] leading-relaxed">
                XeooAuditor never accepts, collects, or stores target website passwords or bearer tokens.
              </p>
            </div>

            <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] space-y-1">
              <span className="font-bold text-[var(--color-text-primary)] block">Ephemeral Retention</span>
              <p className="text-[var(--color-text-muted)] leading-relaxed">
                Audit results reside only in temporary session storage and disappear when the tab closes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

