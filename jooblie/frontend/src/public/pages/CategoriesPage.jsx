import PageHero from '../../shared/components/PageHero';
import PageSection from '../../shared/components/PageSection';
import CategoryCard from '../../shared/components/CategoryCard';
import usePublicData from '../../shared/hooks/usePublicData';
import { focusCategories } from '../../shared/config/site';

export default function CategoriesPage() {
  const { data } = usePublicData();
  const counts = Object.fromEntries(focusCategories.map((item) => [item.key, 0]));

  data.jobs.filter((job) => job.isActive).forEach((job) => {
    if (Object.prototype.hasOwnProperty.call(counts, job.categorySlug)) {
      counts[job.categorySlug] += 1;
    }
  });

  return (
    <>
      <PageHero
        eyebrow="Specialist hiring"
        title="Browse job categories"
        text="Choose a specialist area and view its current openings. Job totals come from live backend data."
      />
      <PageSection containerClassName="category-grid category-grid--large" stagger>
        {focusCategories.map((category) => (
          <CategoryCard
            key={category.key}
            category={category}
            count={counts[category.key]}
            compact
          />
        ))}
      </PageSection>
    </>
  );
}
