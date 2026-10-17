import SkeletonContent from '../../shared/components/Skeleton';
import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import PageHero from '../../shared/components/PageHero';
import PageSection from '../../shared/components/PageSection';
import CategoryCard from '../../shared/components/CategoryCard';
import { apiRequest } from '../../shared/lib/api';
import { focusCategories } from '../../shared/config/site';

export default function CategoriesPage() {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchAndCountJobs = async () => {
      try {
        const result = await apiRequest('/public/jobs?limit=1000'); 
        const liveJobs = result?.jobs || result?.items || result?.results || (Array.isArray(result) ? result : []);
        
        const newCounts = Object.fromEntries(focusCategories.map((item) => [item.key, 0]));

        liveJobs.forEach((job) => {
          const slug = job.categorySlug || job.category_slug || job.category || (job.categories && job.categories.slug);
          
          if (slug && Object.prototype.hasOwnProperty.call(newCounts, slug)) {
            if (job.isActive !== false && job.is_active !== false) {
              newCounts[slug] += 1;
            }
          }
        });

        if (active) {
          setCounts(newCounts);
        }
      } catch (error) {
        console.error("Failed to load live jobs for categories:", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchAndCountJobs();

    return () => { active = false; };
  }, []);

  return (
    <>
      <PageHero
        eyebrow="Specialist hiring"
        title="Browse job categories"
        text="Choose a specialist area and view its current openings. Job totals come from live backend data."
      />
      
      {loading ? (
        <div className="container" style={{ padding: 32 }}>
          <SkeletonContent variant="cards" rows={6} label="Loading categories..." />
        </div>
      ) : (
        <PageSection>
          <div className="category-grid category-grid--large">
            {focusCategories.map((category) => (
              <CategoryCard
                key={category.key}
                category={category}
                count={counts[category.key] || 0}
                compact
              />
            ))}
          </div>

          <div className="network-trust-banner" style={{ marginTop: '36px' }}>
            <ShieldCheck size={18} className="network-trust-icon" />
            <p>
              Availability depends on openings published by employers. Jooblie supports platform integrity but does not promise placement or endorse every individual listing.
            </p>
          </div>
        </PageSection>
      )}
    </>
  );
}