"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();

    if (pathname === "/") {
      // On homepage: smooth scroll into view without changing the URL hash
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // If on another page, navigate to home
      router.push("/");
    }
  };

  return (
    <header className="nav">
      <Link href="/" className="nav__logo" aria-label="Peak and Panic home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/04-horizontal-emerald.png"
          width="2172"
          height="724"
          alt="Peak and Panic"
        />
      </Link>
      <nav className="nav__links">
        <a
          href="#offerings"
          onClick={(e) => handleScroll(e, "offerings")}
          className="nav__link"
          style={{ cursor: "pointer" }}
        >
          Our Offerings
        </a>
        <a
          href="#about"
          onClick={(e) => handleScroll(e, "about")}
          className="nav__link"
          style={{ cursor: "pointer" }}
        >
          About Us
        </a>
      </nav>
    </header>
  );
}