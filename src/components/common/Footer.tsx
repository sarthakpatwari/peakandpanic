import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer" id="about">
      <Link href="/indian-macros">Indian Macros</Link>
      <Link href="/india-markets">India Markets</Link>
      <Link href="/#offerings">Our Offerings</Link>
      <a
        href="https://www.instagram.com/peak_and_panic"
        target="_blank"
        rel="noopener noreferrer"
        className="f4"
      >
        Instagram
      </a>
      <div className="copy">© 2026 Peak and Panic</div>
    </footer>
  );
}
