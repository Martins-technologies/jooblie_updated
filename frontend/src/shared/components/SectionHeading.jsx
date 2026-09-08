import Reveal from './Reveal';

export default function SectionHeading({
  title,
  eyebrow,
  action,
  center = false,
  reveal = true,
  className = '',
}) {
  const classes = [
    'section-heading',
    center ? 'section-heading--center' : '',
    className,
  ].filter(Boolean).join(' ');

  const content = (
    <>
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action}
    </>
  );

  if (!reveal) {
    return <div className={classes}>{content}</div>;
  }

  return <Reveal className={classes}>{content}</Reveal>;
}
