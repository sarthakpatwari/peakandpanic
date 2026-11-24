import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import ParticleCanvas from "@/components/home/ParticleCanvas";
import HeroMarkets from "@/components/home/HeroMarkets";
import Offerings from "@/components/home/Offerings";
import ResearchBanner from "@/components/home/ResearchBanner";

export default function HomePage() {
  return (
    <div className="page">
      <Header />
      <main>
        <div className="hero-wrap">
          <ParticleCanvas />
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
          <HeroMarkets />
        </div>
        <Offerings />
        <ResearchBanner />
      </main>
      <Footer />
    </div>
  );
}