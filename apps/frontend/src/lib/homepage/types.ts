export type HomepageCardType =
  | "ABOUT_US"
  | "WHY_US"
  | "ABOUT_SITE"
  | "TEXT_MEDIA"
  | "FEATURED_INSTRUCTORS";

export type HomepageInstructorCourse = {
  id: string;
  title: string;
  description?: string | null;
  thumbnailImage?: string | null;
  category?: string | null;
  level?: string | null;
  isPaid?: boolean;
  price?: number | null;
};

export type HomepageInstructorEntry = {
  id: string;
  fullName: string;
  bio?: string | null;
  profileImage?: string | null;
  courses: HomepageInstructorCourse[];
};

export type HomepageCardBase = {
  id: string;
  type: HomepageCardType;
  title: string;
  subtitle?: string;
  body?: string;
};

export type HomepageCard =
  | (HomepageCardBase & {
      type: "ABOUT_US" | "WHY_US" | "ABOUT_SITE" | "TEXT_MEDIA";
      bullets?: string[];
      accentLabel?: string;
    })
  | (HomepageCardBase & {
      type: "FEATURED_INSTRUCTORS";
      instructors: HomepageInstructorEntry[];
    });

export type HomepageRow = {
  id: string;
  columns: 1 | 2;
  slots: Array<HomepageCard | null>;
};

export type HomepageContent = {
  rows: HomepageRow[];
  updatedAt?: string;
};

export type HomepageCatalogInstructor = {
  id: string;
  fullName: string;
  bio?: string | null;
  profileImage?: string | null;
  instructorCourses: HomepageInstructorCourse[];
};
