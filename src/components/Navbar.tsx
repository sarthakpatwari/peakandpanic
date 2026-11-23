import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  return (
    <header className="min-h-[76px] px-6 md:px-12 border-b border-[#6ee7b7]/15 bg-black/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between flex-wrap gap-4">
      <Link href="/" className="relative flex items-center">
        <Image
          src="/images/04-horizontal-emerald.png"
          alt="Peak and Panic"
          width={220}
          height={52}
          priority
          style={{ height: "auto" }}
          className="w-[180px] sm:w-[220px]"
        />
      </Link>
      <nav className="flex items-center flex-wrap gap-5 text-sm sm:text-base font-semibold text-[#a7bbb3]">
        <Link href="/india-markets" className="hover:text-[#6ee7b7] transition-colors">India Markets</Link>
        <Link href="/indian-macros" className="hover:text-[#6ee7b7] transition-colors">Macros Hub</Link>
        <Link href="/fiscal-tracker" className="hover:text-[#6ee7b7] transition-colors">Fiscal</Link>
        <Link href="/growth-tracker" className="hover:text-[#6ee7b7] transition-colors">Growth</Link>
        <Link href="/inflation-tracker" className="hover:text-[#6ee7b7] transition-colors">Inflation</Link>
        <Link href="/rbi-policy-tracker" className="hover:text-[#6ee7b7] transition-colors">RBI Policy</Link>
      </nav>
    </header>
  );
}