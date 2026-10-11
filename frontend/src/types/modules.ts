import {
  FileCode,
  Bot,
  Search,
  Send,
  Network,
  Route,
  Link as LinkIcon,
  MapPin,
  Building2,
  FileSearch,
  Unlink,
  ListChecks,
  UserCheck,
  BarChart3,
  Contact,
  MousePointerClick,
  Globe,
  FileQuestion,
  LockKeyhole,
  MonitorSmartphone,
  type LucideIcon,
} from "lucide-react";

export interface AuditModuleMeta {
  id: string;
  name: string;
  category: string;
  icon: LucideIcon;
  description: string;
}

export const AUDIT_MODULES: AuditModuleMeta[] = [
  { id: "A01", name: "Sitemap.xml", category: "SEO", icon: FileCode, description: "XML document crawl mapping" },
  { id: "A02", name: "Robots.txt", category: "SEO", icon: Bot, description: "Crawler directive compliance" },
  { id: "A03", name: "Search Console", category: "SEO", icon: Search, description: "Google index ownership signals" },
  { id: "A04", name: "Submit Sitemap", category: "SEO", icon: Send, description: "Automated search engine submission" },
  { id: "A05", name: "Internal Links", category: "Links", icon: Network, description: "Internal site topology & hops" },
  { id: "A06", name: "Breadcrumbs", category: "Schema", icon: Route, description: "Structured hierarchical trail" },
  { id: "A07", name: "Canonical URL", category: "SEO", icon: LinkIcon, description: "Self-referencing canonical checks" },
  { id: "A08", name: "LocalBusiness Schema", category: "Schema", icon: MapPin, description: "Geographic schema markup" },
  { id: "A09", name: "Organization Schema", category: "Schema", icon: Building2, description: "Entity identity & social markup" },
  { id: "A10", name: "Indexing", category: "SEO", icon: FileSearch, description: "Search engine coverage status" },
  { id: "A11", name: "Broken Links", category: "Links", icon: Unlink, description: "404 dead link detection" },
  { id: "A12", name: "Form Validation", category: "Forms", icon: ListChecks, description: "Client/server input constraints" },
  { id: "A13", name: "Anti-spam Form", category: "Forms", icon: UserCheck, description: "Honeypot & bot defense checks" },
  { id: "A14", name: "Form-submit Tracking", category: "Analytics", icon: BarChart3, description: "Conversion pipeline verification" },
  { id: "A15", name: "Contact Tracking", category: "Analytics", icon: Contact, description: "Multi-channel contact & social engagement tracking" },
  { id: "A16", name: "CTA Tracking", category: "Analytics", icon: MousePointerClick, description: "User action intent telemetry" },
  { id: "A17", name: "Favicon", category: "Config", icon: Globe, description: "SVG vector & touch icon assets" },
  { id: "A18", name: "Custom 404", category: "Config", icon: FileQuestion, description: "Missing page recovery UX" },
  { id: "A19", name: "HTTPS / SSL", category: "Security", icon: LockKeyhole, description: "TLS 1.3 encryption & certificates" },
  { id: "A20", name: "Device Responsive", category: "Testing", icon: MonitorSmartphone, description: "Multi-viewport rendering parity" },
];

