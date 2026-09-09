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
        <div style={{ padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <style>{`
            .cat-spinner { width: 40px; height: 40px; border: 4px solid #eef2f9; border-top-color: #2557a7; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
          <div className="cat-spinner"></div>
          <span style={{ color: '#4b5563', fontSize: '1.05rem', fontWeight: '500' }}>Loading live categories...</span>
        </div>
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