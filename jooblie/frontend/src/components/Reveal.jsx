export default function Reveal({
  as: Tag = 'div',
  children,
  className = '',
  direction = 'up',
  stagger = false,
  delay = 0,
  style,
  ...props
}) {
  const revealStyle = {
    ...style,
    '--reveal-delay': `${Math.max(0, Number(delay) || 0)}ms`,
  };

  return (
    <Tag
      className={className}
      data-reveal={direction}
      data-reveal-stagger={stagger ? 'true' : undefined}
      style={revealStyle}
      {...props}
    >
      {children}
    </Tag>
  );
}
