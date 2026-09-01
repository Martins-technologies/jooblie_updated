const employerLogos = ['hex', 'dots', 'rings', 'diamonds', 'star', 'circle'];

function EmployerLogo({ type }) {
  if (type === 'hex') {
    return (
      <svg className="jooblie-employer-icon" viewBox="0 0 40 40" aria-hidden="true">
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M11 5H29L38 20L29 35H11L2 20ZM14.5 12H25.5L31 20L25.5 28H14.5L9 20Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  if (type === 'dots') {
    return (
      <svg className="jooblie-employer-icon jooblie-employer-icon--dots" viewBox="0 0 40 40" aria-hidden="true">
        {[10, 20, 30].flatMap((cy) => [10, 20, 30].map((cx) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.2" fill="currentColor" />
        )))}
      </svg>
    );
  }

  if (type === 'rings') {
    return (
      <svg className="jooblie-employer-icon jooblie-employer-icon--rings" viewBox="0 0 44 40" aria-hidden="true">
        <circle cx="17" cy="20" r="12" fill="none" stroke="currentColor" strokeWidth="3.5" />
        <circle cx="27" cy="20" r="12" fill="none" stroke="currentColor" strokeWidth="3.5" opacity="0.82" />
        <circle cx="22" cy="20" r="12" fill="none" stroke="currentColor" strokeWidth="2.4" opacity="0.52" />
      </svg>
    );
  }

  if (type === 'diamonds') {
    return (
      <svg className="jooblie-employer-icon" viewBox="0 0 40 40" aria-hidden="true">
        <rect x="16" y="5" width="8" height="8" rx="0.7" transform="rotate(45 20 9)" fill="currentColor" />
        <rect x="7" y="16" width="8" height="8" rx="0.7" transform="rotate(45 11 20)" fill="currentColor" />
        <rect x="25" y="16" width="8" height="8" rx="0.7" transform="rotate(45 29 20)" fill="currentColor" />
        <rect x="16" y="27" width="8" height="8" rx="0.7" transform="rotate(45 20 31)" fill="currentColor" />
      </svg>
    );
  }

  if (type === 'star') {
    return (
      <svg className="jooblie-employer-icon" viewBox="0 0 40 40" aria-hidden="true">
        <path fill="currentColor" d="M20 2C21.8 11.8 23.2 16.8 38 20C23.2 23.2 21.8 28.2 20 38C18.2 28.2 16.8 23.2 2 20C16.8 16.8 18.2 11.8 20 2Z" />
      </svg>
    );
  }

  return (
    <svg className="jooblie-employer-icon" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="15" fill="currentColor" />
      <rect x="16" y="16" width="8" height="8" rx="1" transform="rotate(45 20 20)" fill="#ffffff" />
    </svg>
  );
}

export default function TrustedEmployers() {
  return (
    <section className="jooblie-trusted-exact" aria-labelledby="trusted-employers-title">
      <div className="container">
        <div className="jooblie-trusted-exact__title">
          <h2 id="trusted-employers-title">Trusted by Employers</h2>
        </div>
        <div className="jooblie-employer-grid" aria-label="Employer logo placeholders">
          {employerLogos.map((type, index) => (
            <div
              className="jooblie-employer-card"
              key={type}
              style={{ '--trusted-delay': `${index * 65}ms` }}
            >
              <EmployerLogo type={type} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
