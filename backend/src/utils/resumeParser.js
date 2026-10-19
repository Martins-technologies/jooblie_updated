import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const MONTH_MAP = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  january: '01', february: '02', march: '03', april: '04', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

const COMMON_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'React.js', 'Node.js', 'Express', 'Python', 'Django', 'Flask',
  'Java', 'Spring Boot', 'C++', 'C#', '.NET', 'PHP', 'Laravel', 'Ruby', 'Ruby on Rails',
  'HTML', 'HTML5', 'CSS', 'CSS3', 'Sass', 'Tailwind CSS', 'Bootstrap', 'Redux', 'Vue.js', 'Angular',
  'Next.js', 'GraphQL', 'REST APIs', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite',
  'Docker', 'Kubernetes', 'AWS', 'Amazon Web Services', 'Azure', 'Google Cloud', 'GCP', 'CI/CD',
  'Git', 'GitHub', 'GitLab', 'Linux', 'Unix', 'Agile', 'Scrum', 'Jira', 'Figma', 'UI/UX',
  'Unit Testing', 'Jest', 'Cypress', 'Data Analysis', 'Machine Learning', 'TensorFlow', 'PyTorch',
  'Project Management', 'Communication', 'Leadership', 'Problem Solving', 'Customer Service',
  'Sales', 'Marketing', 'SEO', 'Content Writing', 'Excel', 'Financial Modeling', 'Accounting'
];

export function normalizeDate(str) {
  if (!str) return '';
  const s = str.trim().toLowerCase();
  if (s === 'present' || s === 'current' || s === 'now') return '';
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
  const slashMatch = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) return `${slashMatch[2]}-${slashMatch[1].padStart(2, '0')}-01`;
  
  const myMatch = s.match(/([a-z]+)[,\s]+(\d{4})/i);
  if (myMatch) {
    const month = MONTH_MAP[myMatch[1].toLowerCase()] || '01';
    return `${myMatch[2]}-${month}-01`;
  }

  const yMatch = s.match(/\b(19\d{2}|20\d{2})\b/);
  if (yMatch) return `${yMatch[1]}-01-01`;

  return '';
}

export async function extractTextFromBuffer({ buffer, filename = '', contentType = '' }) {
  const isDocx = filename.toLowerCase().endsWith('.docx') ||
    contentType.includes('wordprocessingml') ||
    (buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4B); // PK header

  if (isDocx) {
    try {
      const mammoth = (await import('mammoth')).default;
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (err) {
      throw new Error(`Failed to extract text from Word document: ${err.message}`);
    }
  }

  // Treat as PDF by default or fallback
  try {
    // Use the lib path: the package root runs a debug block that reads a test file.
    const pdfParse = require('pdf-parse/lib/pdf-parse.js');
    const parsed = await pdfParse(buffer);
    return parsed?.text || '';
  } catch (pdfErr) {
    // If text fallback
    try {
      const text = buffer.toString('utf8');
      if (text.includes('@') || text.includes('Experience') || text.includes('Education')) {
        return text;
      }
    } catch { /* ignore */ }
    throw new Error(`Could not read resume document: ${pdfErr.message}`);
  }
}

export function parseResumeText(rawText) {
  const text = (rawText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Email extraction
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  const email = emailMatch ? emailMatch[0].toLowerCase() : '';

  // 2. Phone extraction
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/);
  const phone = phoneMatch ? phoneMatch[0].trim().slice(0, 50) : '';

  // 3. Full Name extraction
  let full_name = '';
  for (const line of lines.slice(0, 6)) {
    if (!line.includes('@') && !line.match(/\d{3}/) && !/resume|curriculum|vitae|page|contact|phone|email/i.test(line)) {
      const clean = line.replace(/[|•·,].*$/, '').trim();
      if (clean.length >= 2 && clean.length <= 60 && /^[a-zA-Z\s.'-]+$/.test(clean)) {
        full_name = clean;
        break;
      }
    }
  }

  // 4. Headline / Professional Title
  let headline = '';
  const titleKeywords = /developer|engineer|manager|designer|specialist|analyst|consultant|lead|architect|administrator|officer|coordinator|executive|scientist|director/i;
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const line = lines[i];
    if (line !== full_name && !line.includes('@') && !line.includes(phone) && !/summary|experience|skills|education/i.test(line)) {
      if (titleKeywords.test(line)) {
        headline = line.replace(/[|•·].*$/, '').trim().slice(0, 180);
        break;
      }
    }
  }

  // 5. Location extraction
  let location_city = '';
  let location_province = '';
  const locMatch = text.match(/\b([A-Z][a-zA-Z\s]{2,25}),\s*([A-Z]{2}|[A-Z][a-zA-Z\s]{2,20})\b/);
  if (locMatch) {
    location_city = locMatch[1].trim().slice(0, 100);
    location_province = locMatch[2].trim().slice(0, 100);
  }

  // 6. Section Partitioning
  const sections = {
    summary: [],
    experience: [],
    education: [],
    skills: [],
    other: [],
  };

  let currentSection = 'other';
  for (const line of lines) {
    const lower = line.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    if (/^(professional\s+summary|summary|profile|about\s+me|career\s+objective|objective)$/.test(lower)) {
      currentSection = 'summary';
      continue;
    } else if (/^(experience|work\s+experience|professional\s+experience|employment\s+history|work\s+history|career\s+history)$/.test(lower)) {
      currentSection = 'experience';
      continue;
    } else if (/^(education|academic\s+background|academic\s+history|qualifications|degrees)$/.test(lower)) {
      currentSection = 'education';
      continue;
    } else if (/^(skills|technical\s+skills|core\s+competencies|technologies|tools|key\s+skills)$/.test(lower)) {
      currentSection = 'skills';
      continue;
    } else if (/^(certifications|projects|languages|awards|references)$/.test(lower)) {
      currentSection = 'other';
      continue;
    }

    sections[currentSection].push(line);
  }

  const summary = sections.summary.join(' ').slice(0, 500);

  // 7. Skills extraction
  const skillsSet = new Set();
  const rawSkillsText = sections.skills.join(' ');
  const tokens = rawSkillsText.split(/[,•|·;*\n]/).map(s => s.trim()).filter(Boolean);
  for (const token of tokens) {
    const cleanToken = token.replace(/^[-•*·\d+.]\s*/, '').trim();
    if (cleanToken.length > 1 && cleanToken.length <= 40 && !/skills|competencies|proficiencies|technologies/i.test(cleanToken)) {
      skillsSet.add(cleanToken);
    }
  }

  // Also scan full text for common industry skills to ensure high recall
  for (const skill of COMMON_SKILLS) {
    const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const skillRegex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (skillRegex.test(text)) {
      skillsSet.add(skill);
    }
  }

  const skills = Array.from(skillsSet).slice(0, 30);

  // 8. Work Experience extraction
  const experience = [];
  let currentExp = null;

  for (let i = 0; i < sections.experience.length; i++) {
    const line = sections.experience[i];
    if (!line) continue;

    const dateRangeMatch = line.match(/([a-zA-Z]+\s+\d{4}|\d{1,2}\/\d{4}|\b\d{4})\s*(?:–|-|to)\s*(present|current|now|[a-zA-Z]+\s+\d{4}|\d{1,2}\/\d{4}|\b\d{4})/i);
    const isBullet = /^[•*·\-\d+.]/.test(line);

    if (dateRangeMatch && currentExp && !currentExp.startDate) {
      currentExp.startDate = normalizeDate(dateRangeMatch[1]);
      const isCurrent = /present|current|now/i.test(dateRangeMatch[2]);
      currentExp.current = isCurrent;
      currentExp.endDate = isCurrent ? '' : normalizeDate(dateRangeMatch[2]);
      continue;
    }

    const hasDelimiter = (line.includes('—') || line.includes(' - ') || line.includes(' | ') || line.includes(',')) && !isBullet;
    const isActionSentence = /^(designed|built|developed|managed|led|created|worked|maintained|assisted|helped|responsible|implemented|collaborated|automated)/i.test(line);

    if (hasDelimiter && !isActionSentence) {
      if (currentExp && (currentExp.title || currentExp.company)) {
        experience.push(currentExp);
      }
      const parts = line.split(/[—|,-]/).map(p => p.trim()).filter(Boolean);
      let company = parts[0] || 'Company';
      let title = parts[1] || 'Role';

      if (titleKeywords.test(company) && !titleKeywords.test(title)) {
        const temp = company;
        company = title;
        title = temp;
      }

      currentExp = {
        title: title.slice(0, 180),
        company: company.slice(0, 180),
        startDate: '',
        endDate: '',
        current: false,
        description: '',
      };
      continue;
    }

    if (currentExp) {
      if (isBullet) {
        currentExp.description += (currentExp.description ? '\n' : '') + line;
      } else if (!currentExp.startDate && dateRangeMatch) {
        currentExp.startDate = normalizeDate(dateRangeMatch[1]);
        const isCurr = /present|current|now/i.test(dateRangeMatch[2]);
        currentExp.current = isCurr;
        currentExp.endDate = isCurr ? '' : normalizeDate(dateRangeMatch[2]);
      } else {
        currentExp.description += (currentExp.description ? '\n' : '') + line;
      }
    }
  }

  if (currentExp && (currentExp.title || currentExp.company)) {
    experience.push(currentExp);
  }

  // 9. Education extraction
  const education = [];
  let currentEdu = null;

  for (let i = 0; i < sections.education.length; i++) {
    const line = sections.education[i];
    if (!line) continue;

    const isInst = /university|college|institute|school|academy/i.test(line);
    const isDeg = /bachelor|master|phd|doctor|associate|diploma|certificate|b\.s|b\.a|m\.s|m\.b\.a|btech|mtech/i.test(line);
    const dateRangeMatch = line.match(/([a-zA-Z]+\s+\d{4}|\b\d{4})\s*(?:–|-|to)\s*(present|current|now|[a-zA-Z]+\s+\d{4}|\b\d{4})/i);

    if (isInst || isDeg) {
      if (currentEdu && (currentEdu.degree || currentEdu.institution)) {
        education.push(currentEdu);
      }
      currentEdu = {
        institution: isInst ? line.replace(/[—|,-].*$/, '').trim().slice(0, 180) : '',
        degree: isDeg ? line.trim().slice(0, 180) : '',
        startDate: '',
        endDate: '',
        current: false,
      };

      if (isInst && !isDeg && sections.education[i + 1] && /bachelor|master|degree|diploma|certificate|science|arts/i.test(sections.education[i + 1])) {
        currentEdu.degree = sections.education[i + 1].trim().slice(0, 180);
        i++;
      } else if (isDeg && !isInst && sections.education[i + 1] && /university|college|school|institute/i.test(sections.education[i + 1])) {
        currentEdu.institution = sections.education[i + 1].trim().slice(0, 180);
        i++;
      }
      continue;
    }

    if (dateRangeMatch && currentEdu) {
      currentEdu.startDate = normalizeDate(dateRangeMatch[1]);
      const isCurrent = /present|current|now/i.test(dateRangeMatch[2]);
      currentEdu.current = isCurrent;
      currentEdu.endDate = isCurrent ? '' : normalizeDate(dateRangeMatch[2]);
    }
  }

  if (currentEdu && (currentEdu.degree || currentEdu.institution)) {
    education.push(currentEdu);
  }

  return {
    full_name: full_name || undefined,
    email: email || undefined,
    phone: phone || undefined,
    headline: headline || undefined,
    summary: summary || undefined,
    location_city: location_city || undefined,
    location_province: location_province || undefined,
    skills,
    experience,
    education,
  };
}
