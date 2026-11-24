import Link from "next/link";

const offerings = [
  { title: "The world doesn’t trade in isolation", description: "Understand the global forces shaping investment markets, from interest rates and inflation to currencies, commodities, geopolitics and global capital flows.", href: "/indian-macros", image: "/images/pp-global-markets-emerald.webp", alt: "Global markets artwork" },
  { title: "India Beyond the Index", description: "Track the trends shaping Indian equities, from earnings and valuations to sectors, liquidity, FII flows and the economic forces driving the market.", href: "/india-markets", image: "/images/pp-indian-markets-emerald.webp", alt: "Indian markets artwork" },
  { title: "Spot the move before it becomes the story.", description: "A systematic watchlist tracking stocks showing unusual price, volume and relative-strength signals, helping you identify emerging momentum across Indian markets.", href: "/fiscal-tracker", image: "/images/pp-momentum-emerald.webp", alt: "Momentum dashboard" },
];

export default function Offerings() {
  return <><h2 className="section-title" id="offerings">Four ways to understand Markets</h2><p className="offerings-caption">Section artwork is illustrative and does not show live market data.</p>
    {offerings.map((item, index) => <section key={item.title} className={`offer ${index === 1 ? "offer--2" : `offer--${index + 1}`}`}>
      <Link href={item.href} className={index === 1 ? "offer__link" : "offer__img"} aria-label={item.title}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={item.image} alt={item.alt} /></Link>
      <div className="offer__copy"><h3>{item.title}</h3><p>{item.description}</p></div>
    </section>)}
  </>;
}
