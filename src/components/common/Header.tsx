import Link from "next/link";

export default function Header() {
  return (
    <header className="nav">
      <Link href="/" className="nav__logo" aria-label="Peak and Panic home">
        <img src="/images/04-horizontal-emerald.png" width="2172" height="724" alt="Peak and Panic" />
      </Link>
      <nav className="nav__links" aria-label="Primary navigation">
        <Link href="/#offerings" className="nav__link">Our Offerings</Link>
        <Link href="/#about" className="nav__link">About Us</Link>
      </nav>
    </header>
  );
}
