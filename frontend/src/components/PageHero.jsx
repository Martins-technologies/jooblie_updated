import Reveal from './Reveal';

export default function PageHero({ eyebrow, title, text, children }) {
  return (
    <section className="page-hero">
      <div className="container">
        <Reveal className="page-hero__inner">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
          {text && <p>{text}</p>}
          {children}
        </Reveal>
      </div>
    </section>
  );
}
