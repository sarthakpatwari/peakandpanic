import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-[#6ee7b7]/15 bg-[#020504] py-8 px-6 md:px-12 text-[#a7bbb3] text-sm flex flex-wrap justify-between items-center gap-4">
      <div>© 2026 Peak and Panic</div>
      <div className="flex gap-6 items-center">
        <Link href="/indian-macros" className="hover:text-[#6ee7b7] transition-colors">Indian Macros</Link>
        <Link href="/india-markets" className="hover:text-[#6ee7b7] transition-colors">Markets</Link>
        <a href="https://www.instagram.com/peak_and_panic" target="_blank" rel="noopener noreferrer" className="hover:text-[#6ee7b7] transition-colors">
          Instagram
        </a>
      </div>
    </footer>
  );
}