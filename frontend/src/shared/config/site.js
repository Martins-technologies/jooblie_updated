import itSoftwareImage from '../assets/images/categories/01_it_software.webp';
import officeAdminImage from '../assets/images/categories/02_office_admin.webp';
import restaurantImage from '../assets/images/categories/03_restaurant.webp';
import agricultureImage from '../assets/images/categories/04_agriculture.webp';
import truckingImage from '../assets/images/categories/05_trucking.webp';
import fullStackImage from '../assets/images/jobs/01_full_stack_developer.webp';
import restaurantJobImage from '../assets/images/jobs/02_restaurant_shift_manager.webp';
import farmJobImage from '../assets/images/jobs/03_farm_equipment_operator.webp';
import { resolvePortalConfig } from './portalConfig';

const portal = resolvePortalConfig(import.meta.env);
export const SITE_SLUG = portal.slug;
export const SITE_NAME = portal.name;
export const SITE_DESCRIPTION = portal.description;
export const IS_HEALTH_PORTAL = SITE_SLUG === 'health-care';

export const focusCategories = IS_HEALTH_PORTAL ? [
  { key: 'nursing', label: 'Nursing', icon: 'HeartPulse' },
  { key: 'healthcare-clinical', label: 'Clinical Healthcare', icon: 'HeartPulse' },
  { key: 'allied-health', label: 'Allied Health', icon: 'HeartPulse' },
  { key: 'caregiving-support', label: 'Caregiving & Support', icon: 'HeartPulse' },
] : [
  {
    key: 'it-software',
    aliases: ['it-software', 'it_software', 'it', 'software', 'technology'],
    label: 'IT & Software',
    icon: 'Code2',
    image: itSoftwareImage,
    portalUrl: import.meta.env.VITE_PORTAL_IT_SOFTWARE_URL || '',
  },
  {
    key: 'office-admin',
    aliases: ['office-admin', 'office_admin', 'office', 'admin', 'administration'],
    label: 'Office & Admin',
    icon: 'BriefcaseBusiness',
    image: officeAdminImage,
    portalUrl: import.meta.env.VITE_PORTAL_OFFICE_ADMIN_URL || '',
  },
  {
    key: 'restaurant',
    aliases: ['restaurant', 'hospitality', 'food-service', 'food_service'],
    label: 'Restaurant',
    icon: 'UtensilsCrossed',
    image: restaurantImage,
    portalUrl: import.meta.env.VITE_PORTAL_RESTAURANT_URL || '',
  },
  {
    key: 'agriculture',
    aliases: ['agriculture', 'farming', 'farm'],
    label: 'Agriculture',
    icon: 'Sprout',
    image: agricultureImage,
    portalUrl: import.meta.env.VITE_PORTAL_AGRICULTURE_URL || '',
  },
  {
    key: 'trucking',
    aliases: ['trucking', 'transport', 'transportation', 'driver'],
    label: 'Trucking',
    icon: 'Truck',
    image: truckingImage,
    portalUrl: import.meta.env.VITE_PORTAL_TRUCKING_URL || '',
  },
];

export const categoryFallbackImages = {
  'it-software': itSoftwareImage,
  'office-admin': officeAdminImage,
  restaurant: restaurantImage,
  agriculture: agricultureImage,
  trucking: truckingImage,
};

export const jobIllustrations = {
  'it-software': fullStackImage,
  restaurant: restaurantJobImage,
  agriculture: farmJobImage,
};

export const activeStatusValues = ['active'];
export const inactiveStatusValues = ['pending_review', 'closed', 'expired', 'removed'];

