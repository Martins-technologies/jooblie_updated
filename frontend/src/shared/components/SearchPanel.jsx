import Select from './Select';
import { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, Building2, Filter, MapPin, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const jobTypes = [
  ['full_time', 'Full Time'],
  ['part_time', 'Part Time'],
  ['contract', 'Contract'],
  ['temporary', 'Temporary'],
  ['internship', 'Internship'],
  ['seasonal', 'Seasonal'],
];

const workplaceOptions = [
  ['Remote', 'Remote'],
  ['Hybrid', 'Hybrid'],
  ['On-site', 'On-site'],
];

export default function SearchPanel({ variant = 'hero', initial = {}, actionPath = '/all-jobs' }) {
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

    navigate(`${actionPath}${search.toString() ? `?${search}` : ''}`);
  };

  const clearFilters = () => {
    setQuery('');
    setLocation('');
    setJobType('');
    setSalary('');
    setWorkplace('');
    setDate('');
    navigate(actionPath);
  };

  const hasActiveFilters = Boolean(query || location || jobType || salary || workplace || date);

  return (
    <form className={`search-panel search-panel--${variant}`} onSubmit={submit} role="search" aria-label="Job search">
      <div className={`search-panel__primary search-panel__primary--${variant}`}>
        <label className="field-shell field-shell--wide">
          <Search size={18} className="field-icon" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Role, job title, or keyword"
            aria-label="Job title, role, or keywords"
          />
        </label>

        <label className="field-shell field-shell--location">
          <MapPin size={18} className="field-icon" aria-hidden="true" />
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Location (city, region, or remote)"
            aria-label="Job location"
          />
        </label>

        {variant === 'hero' && (
          <label className="field-shell field-shell--workplace">
            <Building2 size={18} className="field-icon" aria-hidden="true" />
            <Select
              aria-label="Work arrangement preference"
              value={workplace}
              onChange={(event) => setWorkplace(event.target.value)}
            >
              <option value="">All Work Arrangements</option>
              {workplaceOptions.map(([val, lbl]) => (
                <option key={val} value={val}>
                  {lbl}
                </option>
              ))}
            </Select>
          </label>
        )}

        <button className="button button--primary search-panel__button" type="submit">
          <Search size={16} /> Search Jobs
        </button>
      </div>

      <div className="search-panel__filters">
        <SelectFilter
          icon={<BriefcaseBusiness size={15} />}
          label="Job Type"
          value={jobType}
          onChange={setJobType}
          options={jobTypes}
        />
        <SelectFilter
          label="Salary Range"
          value={salary}
          onChange={setSalary}
          options={[
            ['0-50000', 'Up to 50k'],
            ['50000-100000', '50k–100k'],
            ['100000-150000', '100k–150k'],
            ['150000+', '150k+'],
          ]}
        />
        {variant !== 'hero' && (
          <SelectFilter
            label="Work arrangement"
            value={workplace}
            onChange={setWorkplace}
            options={workplaceOptions}
          />
        )}
        <SelectFilter
          label="Date Posted"
          value={date}
          onChange={setDate}
          options={[
            ['1', 'Past 24 hours'],
            ['3', 'Past 3 days'],
            ['7', 'Past week'],
            ['30', 'Past month'],
          ]}
        />

        <div className="search-panel__filter-actions">
          <button className="filter-link" type="submit">
            Apply filters <Filter size={14} />
          </button>
          {hasActiveFilters && (
            <button className="filter-link filter-link--clear" type="button" onClick={clearFilters}>
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function SelectFilter({ label, value, onChange, options, icon = null }) {
  return (
    <label className="select-shell">
      {icon}
      <Select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{label}</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </Select>
    </label>
  );
}
