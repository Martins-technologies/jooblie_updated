import Reveal from './Reveal';

export default function PageSection({
  children,
  className = '',
  containerClassName = '',
  compact = false,
  soft = false,
  reveal = true,
  direction = 'up',
  stagger = false,
}) {
  const sectionClasses = [
    'section',
    compact ? 'section--compact' : '',
    soft ? 'section--soft' : '',
    className,
  ].filter(Boolean).join(' ');

  const content = reveal ? (
    <Reveal direction={direction} stagger={stagger} className={containerClassName}>
      {children}
    </Reveal>
  ) : (
    <div className={containerClassName}>{children}</div>
  );

  return (
    <section className={sectionClasses}>
      <div className="container">
        {content}
      </div>
    </section>
  );
}
