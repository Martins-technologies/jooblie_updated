import SkeletonContent from '../../shared/components/Skeleton';
import { useState, useEffect } from 'react';
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
        // 🔥 FIX: Ab hum real backend se sari live jobs mangwa rahe hain
        const result = await apiRequest('/public/jobs?limit=1000'); 
        const liveJobs = result?.jobs || result?.items || result?.results || (Array.isArray(result) ? result : []);
        
        // Pehle focusCategories ki tamam keys ka count 0 set karte hain
        const newCounts = Object.fromEntries(focusCategories.map((item) => [item.key, 0]));

        // Live jobs par loop chala kar check karte hain
        liveJobs.forEach((job) => {
          // Backend ki field ka naam categorySlug, category_slug, ya direct categories.slug ho sakta hai
          const slug = job.categorySlug || job.category_slug || job.category || (job.categories && job.categories.slug);
          
          if (slug && Object.prototype.hasOwnProperty.call(newCounts, slug)) {
            // Agar job ki isActive value false nahi hai, tabhi count barhao
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
      
      {/* Loading Spinner during fetch */}
      {loading ? (
        <div className="container" style={{ padding: 32 }}><SkeletonContent variant="cards" rows={6} label="Loading categories..." /></div>
      ) : (
        <PageSection containerClassName="category-grid category-grid--large" stagger>
          {focusCategories.map((category) => (
            <CategoryCard
              key={category.key}
              category={category}
              count={counts[category.key] || 0}
              compact
            />
          ))}
        </PageSection>
      )}
    </>
  );
}