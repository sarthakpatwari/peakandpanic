import Link from "next/link";
import CardScrollReveal, { RevealMode } from "./CardScrollReveal";

// 💡 CHANGE THIS ONE WORD TO TRY DIFFERENT OPTIONS:
// Try: "blur-fade" | "box-reveal" | "3d-card" | "border-beam" | "none" | "Blur-fade-reveal" | "laser-scan" | "3d-perspective" | "radial-iris" | "curtain-split"
const TEST_MODE: RevealMode = "blur-fade";

interface OfferingItem {
  id: string;
  title: string;
  description: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
}

const OFFERINGS: OfferingItem[] = [
  {
    id: "global-markets",
    title: "The world doesn’t trade in isolation",
    description:
      "Understand the global forces shaping investment markets, from interest rates and inflation to currencies, commodities, geopolitics and global capital flows.",
    href: "/indian-macros",
    imageSrc: "/images/pp-global-markets-emerald.webp",
    imageAlt: "Global markets artwork",
  },
  {
    id: "indian-markets",
    title: "India Beyond the Index",
    description:
      "Track the trends shaping Indian equities, from earnings and valuations to sectors, liquidity, FII flows and the economic forces driving the market.",
    href: "/india-markets",
    imageSrc: "/images/pp-indian-markets-emerald.webp",
    imageAlt: "Indian markets artwork",
  },
  {
    id: "momentum",
    title: "Spot the move before it becomes the story.",
    description:
      "A systematic watchlist tracking stocks showing unusual price, volume and relative-strength signals, helping you identify emerging momentum across Indian markets.",
    href: "/fiscal-tracker",
    imageSrc: "/images/pp-momentum-emerald.webp",
    imageAlt: "Momentum dashboard",
  },
  // 💡 To add a 4th card, just paste a 4th object here!
];

export default function Offerings() {
  return (
    <>
      <h2 className="section-title" id="offerings">
        Four ways to understand Markets
      </h2>
      <p className="offerings-caption">
        Section artwork is illustrative and does not show live market data.
      </p>

      {OFFERINGS.map((item, index) => {
        // Automatically alternates the CSS layout: odd cards have image-left, even cards have image-right
        const isEven = index % 2 === 1;

        return (
          <CardScrollReveal key={item.id} mode={TEST_MODE} delay={0.5}>
            <section className={`offer ${isEven ? "offer--2" : `offer--${index + 1}`}`}>
              <Link
                href={item.href}
                className={isEven ? "offer__link" : "offer__img"}
                aria-label={item.title}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageSrc} alt={item.imageAlt} />
              </Link>
              <div className="offer__copy">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </section>
          </CardScrollReveal>
        );
      })}
    </>
  );
}