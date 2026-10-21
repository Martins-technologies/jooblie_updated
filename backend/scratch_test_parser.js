const sampleResumeText = `
Johnathan Doe
Senior Full Stack Developer
johnathan.doe@example.com | +1(403) 000-0000 | Toronto, ON
linkedin.com/in/johndoe | github.com/johndoe

PROFESSIONAL SUMMARY
Experienced Full Stack Software Engineer with over 6 years of expertise building scalable web applications, REST APIs, and modern responsive user interfaces.

EXPERIENCE

TechNova Solutions — Senior Full Stack Developer
Jan 2022 - Present
• Designed and developed cloud-native microservices using Node.js, Express, and PostgreSQL.
• Built responsive, accessible user interfaces using React, Redux, and Tailwind CSS.
• Improved API response times by 35% through Redis caching and query optimizations.

Apex Digital Inc. — Software Engineer
March 2019 - Dec 2021
• Developed full stack features for e-commerce platforms using TypeScript and Python.
• Collaborated with product designers to implement pixel-perfect user flows.
• Automated CI/CD deployment pipelines using Docker and GitHub Actions.

EDUCATION

University of Waterloo
Bachelor of Science in Computer Science
Sept 2015 - May 2019

SKILLS
JavaScript, TypeScript, React, Node.js, Python, PostgreSQL, Docker, AWS, Git, REST APIs, HTML5, CSS3, GraphQL
`;

const MONTH_MAP = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  january: '01', february: '02', march: '03', april: '04', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
};

function normalizeDate(str) {
  if (!str) return '';
  const s = str.trim().toLowerCase();
  if (s === 'present' || s === 'current' || s === 'now') return '';
  
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Try YYYY-MM
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
  // Try MM/YYYY
  const slashMatch = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) return `${slashMatch[2]}-${slashMatch[1].padStart(2, '0')}-01`;
  
  // Try "Month Year" e.g. "Jan 2022" or "January 2022"
  const myMatch = s.match(/([a-z]+)[,\s]+(\d{4})/i);
  if (myMatch) {
    const month = MONTH_MAP[myMatch[1].toLowerCase()] || '01';
    return `${myMatch[2]}-${month}-01`;
  }

  // Try just Year "2022"
  const yMatch = s.match(/\b(19\d{2}|20\d{2})\b/);
  if (yMatch) return `${yMatch[1]}-01-01`;

  return '';
}

function parseExperience(lines) {
  const items = [];
  let currentItem = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    // Check for date range
    const dateRangeMatch = line.match(/([a-zA-Z]+\s+\d{4}|\d{1,2}\/\d{4}|\b\d{4})\s*(?:–|-|to)\s*(present|current|now|[a-zA-Z]+\s+\d{4}|\d{1,2}\/\d{4}|\b\d{4})/i);
    const isBullet = /^[•*·\-\d+.]/.test(line);

    if (dateRangeMatch && currentItem && !currentItem.startDate) {
      currentItem.startDate = normalizeDate(dateRangeMatch[1]);
      const isCurrent = /present|current|now/i.test(dateRangeMatch[2]);
      currentItem.current = isCurrent;
      currentItem.endDate = isCurrent ? '' : normalizeDate(dateRangeMatch[2]);
      continue;
    }

    const hasDelimiter = (line.includes('—') || line.includes(' - ') || line.includes(' | ') || line.includes(',')) && !isBullet;
    
    if (hasDelimiter && !/^(designed|built|developed|managed|led|created|worked|maintained|assisted|helped|responsible)/i.test(line)) {
      if (currentItem && (currentItem.title || currentItem.company)) {
        items.push(currentItem);
      }
      const parts = line.split(/[—|,-]/).map(p => p.trim()).filter(Boolean);
      let company = parts[0] || 'Company';
      let title = parts[1] || 'Role';
      if (/developer|engineer|manager|lead|analyst|designer|consultant|specialist|officer|associate/i.test(company) && !/developer|engineer|manager/i.test(title)) {
        const temp = company;
        company = title;
        title = temp;
      }
      currentItem = {
        title: title.slice(0, 180),
        company: company.slice(0, 180),
        startDate: '',
        endDate: '',
        current: false,
        description: ''
      };
      continue;
    }

    if (currentItem) {
      if (isBullet) {
        currentItem.description += (currentItem.description ? '\n' : '') + line;
      } else if (!currentItem.startDate && dateRangeMatch) {
        currentItem.startDate = normalizeDate(dateRangeMatch[1]);
        const isCurr = /present|current|now/i.test(dateRangeMatch[2]);
        currentItem.current = isCurr;
        currentItem.endDate = isCurr ? '' : normalizeDate(dateRangeMatch[2]);
      } else {
        currentItem.description += (currentItem.description ? '\n' : '') + line;
      }
    }
  }

  if (currentItem && (currentItem.title || currentItem.company)) {
    items.push(currentItem);
  }

  return items;
}

const lines = sampleResumeText.split(/\r?\n/).slice(10, 24);
console.log('Refined Experience:', parseExperience(lines));
