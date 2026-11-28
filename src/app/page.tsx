import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import ParticleCanvas from "@/components/home/ParticleCanvas";
import HeroMarkets from "@/components/home/HeroMarkets";
import Offerings from "@/components/home/Offerings";
import ResearchBanner from "@/components/home/ResearchBanner";
import MacroPulse from "@/components/common/MacroPulse";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ demo?: string | string[] }> }) {
  const params = await searchParams;
  const demo = Object.prototype.hasOwnProperty.call(params, "demo");
  return (
    <div className="page">
      <Header />
      <main>
        <div className="hero-wrap motion-host">
          <ParticleCanvas />
          <MacroPulse variant="global" />
          <section className="hero-copy">
            <h1>
              The world moves markets.
              <br />
              We explain why.
            </h1>
            <p>
              Global economics, Indian markets and fundamental research, built for investors who want to understand what&apos;s happening beneath the headlines.
            </p>
          </section>
          <HeroMarkets demo={demo} />
        </div>
        <Offerings />
        <ResearchBanner />
      </main>
      <Footer />
    </div>
  );
}
