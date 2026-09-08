import { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, ChevronDown, Filter, MapPin, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const jobTypes = [
  ['full_time', 'Full Time'],
  ['part_time', 'Part Time'],
  ['contract', 'Contract'],
  ['temporary', 'Temporary'],
  ['internship', 'Internship'],
  ['seasonal', 'Seasonal'],
];

export default function SearchPanel({ variant = 'hero', initial = {} }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initial.q || '');
  const [location, setLocation] = useState(initial.location || '');
  const [jobType, setJobType] = useState(initial.type || '');
  const [salary, setSalary] = useState(initial.salary || '');
  const [workplace, setWorkplace] = useState(initial.workplace || '');
  const [date, setDate] = useState(initial.date || '');

  useEffect(() => {
    setQuery(initial.q || '');
    setLocation(initial.location || '');
    setJobType(initial.type || '');
    setSalary(initial.salary || '');
    setWorkplace(initial.workplace || '');
    setDate(initial.date || '');
  }, [initial.q, initial.location, initial.type, initial.salary, initial.workplace, initial.date]);

  const params = useMemo(
    () => ({ query, location, jobType, salary, workplace, date }),
    [query, location, jobType, salary, workplace, date],
  );

  const submit = (event) => {
    event?.preventDefault();
    const search = new URLSearchParams();

    Object.entries({
      q: params.query,
      location: params.location,
      type: params.jobType,
      salary: params.salary,
      workplace: params.workplace,
      date: params.date,
    }).forEach(([key, value]) => {
      if (value) search.set(key, value);
    });

    navigate(`/jobs${search.toString() ? `?${search}` : ''}`);
  };

  return (
    <form className={`search-panel search-panel--${variant}`} onSubmit={submit}>
      <div className="search-panel__primary">
        <label className="field-shell field-shell--wide">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Job title or keywords" aria-label="Job title or keywords" />
        </label>
        <label className="field-shell field-shell--location">
          <MapPin size={18} />
          <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location (e.g., city, remote)" aria-label="Location" />
        </label>
        <button className="button button--primary search-panel__button" type="submit">Search Jobs</button>
      </div>

      <div className="search-panel__filters">
        <SelectFilter icon={<BriefcaseBusiness size={15} />} label="Job Type" value={jobType} onChange={setJobType} options={jobTypes} />
        <SelectFilter label="Salary Range" value={salary} onChange={setSalary} options={[['0-50000', 'Up to 50k'], ['50000-100000', '50k–100k'], ['100000-150000', '100k–150k'], ['150000+', '150k+']]} />
        <SelectFilter label="Remote / On-site" value={workplace} onChange={setWorkplace} options={[['Remote', 'Remote'], ['On-site', 'On-site']]} />
        <SelectFilter label="Date Posted" value={date} onChange={setDate} options={[['1', 'Past 24 hours'], ['3', 'Past 3 days'], ['7', 'Past week'], ['30', 'Past month']]} />
        <button className="filter-link" type="submit">More Filters <Filter size={15} /></button>
      </div>
    </form>
  );
}

function SelectFilter({ label, value, onChange, options, icon = null }) {
  return (
    <label className="select-shell">
      {icon}
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{label}</option>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
      <ChevronDown size={14} />
    </label>
  );
}
