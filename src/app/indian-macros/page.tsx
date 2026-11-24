import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import Link from "next/link";
import macroJson from "../../../macro-data.json";

interface MacroItem { value?: string; lines?: string[]; source?: string; updatedAt?: string; status?: string }
interface MacroData { items?: Record<string, MacroItem> }
const definitions = [
  { key: "repo", name: "RBI Policy Tracker", href: "/rbi-policy-tracker" },
  { key: "inflation", name: "Inflation Tracker", href: "/inflation-tracker" },
  { key: "growth", name: "Growth Tracker", href: "/growth-tracker" },
  { key: "fiscal", name: "Fiscal & Government", href: "/fiscal-tracker" },
] as const;
const valid = (item?: MacroItem) => Boolean(item && typeof item.value === "string" && item.value.trim() && Array.isArray(item.lines) && item.lines.every((line) => typeof line === "string") && typeof item.source === "string" && typeof item.updatedAt === "string");
const displayDate = (value?: string) => {
  const match = value?.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/); if (!match) return "Update time unavailable";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3] || 1)));
  return new Intl.DateTimeFormat("en-IN", { day: match[3] ? "numeric" : undefined, month: "short", year: "numeric", timeZone: "UTC" }).format(date);
};

export default function IndianMacrosPage() {
  const data = macroJson as MacroData;
  return <div className="page"><Header /><main>
    <section className="intro" aria-labelledby="page-title"><div className="wrap"><div className="intro-copy"><p className="eyebrow">Indian Macros</p><h1 id="page-title">The forces shaping India’s economy.</h1><p>Track monetary policy, inflation, growth and fiscal conditions through the latest published indicators shaping India’s economic outlook.</p></div></div></section>
    <section className="trackers" aria-labelledby="trackers-title"><div className="wrap"><div className="section-heading"><h2 id="trackers-title">Macro trackers</h2><p>A focused view of the indicators that matter most to Indian investors.</p></div><div className="tracker-grid">
      {definitions.map((definition) => {
        const item = data?.items?.[definition.key]; const available = valid(item);
        const content = <><div className="card-top"><h3 className="tracker-name">{definition.name}</h3><span className={`availability ${available ? "availability--ready" : ""}`}>{available ? "Official data" : "Unavailable"}</span></div><p className="macro-value">{available ? item!.value : "Unavailable"}</p><p className="macro-description">{available ? item!.lines!.join(" · ") : "Indicator data unavailable"}</p><div className="card-meta"><span><strong>Official source</strong><span>{available ? item!.source : "Source unavailable"}</span></span><span><strong>Updated</strong><span>{available ? displayDate(item!.updatedAt) : "Update time unavailable"}</span></span></div>{available && <span className="card-action">View tracker <span>→</span></span>}</>;
        return available ? <Link key={definition.key} href={definition.href} className="tracker-card tracker-card--active">{content}</Link> : <article key={definition.key} className="tracker-card tracker-card--disabled">{content}</article>;
      })}
    </div></div></section>
  </main><Footer /></div>;
}
