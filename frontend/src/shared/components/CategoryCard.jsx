import { ArrowRight, BriefcaseBusiness, Code2, Sprout, Truck, UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router-dom';

const icons = { Code2, BriefcaseBusiness, UtensilsCrossed, Sprout, Truck };

export default function CategoryCard({ category, count = 0, compact = false }) {
  const Icon = icons[category.icon] || BriefcaseBusiness;
  const internal = `/categories/${category.key}`;
  const content = (
    <>
      <div className="category-card__image"><img src={category.image} alt="" /></div>
      <div className="category-card__body">
        <span className="category-card__icon"><Icon size={20} /></span>
        <div>
          <h3>{category.label}</h3>
          <p>{count > 0 ? `${count.toLocaleString()} open ${count === 1 ? 'job' : 'jobs'}` : 'Browse openings'}</p>
        </div>
        {compact && <ArrowRight className="category-card__arrow" size={17} />}
      </div>
    </>
  );

  if (category.portalUrl) {
    return <a className="category-card" href={category.portalUrl} target="_self">{content}</a>;
  }
  return <Link className="category-card" to={internal}>{content}</Link>;
}
