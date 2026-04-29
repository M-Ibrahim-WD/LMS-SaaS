export type HomepageCardType =
  | "ABOUT_US"
  | "WHY_US"
  | "ABOUT_SITE"
  | "TEXT_MEDIA"
  | "HEADING"
  | "TEXT"
  | "BUTTON"
  | "IMAGE_BLOCK"
  | "VIDEO"
  | "ICON"
  | "FEATURED_INSTRUCTORS"
  | "SPACER"
  | "DIVIDER"
  | "LIST"
  | "CARD"
  | "COURSE_LIST"
  | "INSTRUCTOR_LIST";

export type HomepageTextTag = "H1" | "H2" | "H3" | "H4" | "H5" | "H6" | "P";
export type HomepageResponsiveVisibility = {
  desktop?: boolean;
  tablet?: boolean;
  mobile?: boolean;
};
export type HomepageRowOrder = "FIRST_SLOT_FIRST" | "SECOND_SLOT_FIRST";
export type HomepageRowBackgroundStyle = "plain" | "soft" | "highlight";
export type HomepagePaddingPreset = "compact" | "comfortable" | "spacious";
export type HomepageGapPreset = "tight" | "normal" | "loose";
export type HomepageCardBackgroundStyle = "surface" | "muted" | "highlight";
export type HomepageRadiusPreset = "soft" | "rounded" | "pill";
export type HomepageSpacingPreset = "compact" | "comfortable" | "spacious";
export type HomepageImageHeightPreset = "compact" | "medium" | "tall";
export type HomepageButtonVariant = "primary" | "secondary" | "ghost";
export type HomepageAlign = "left" | "center";
export type HomepageVideoAspectRatio = "16:9" | "4:3" | "1:1";
export type HomepageSizePreset = "none" | "small" | "medium" | "large";
export type HomepageBorderPreset = "none" | "soft" | "strong";
export type HomepageWidthPreset = "auto" | "full" | "narrow";
export type HomepageImageFit = "cover" | "contain";
export type HomepageImagePosition = "center" | "top" | "bottom";
export type HomepageColumnAlign = "start" | "center" | "end";
export type HomepageStyleUnit = "px" | "%";
export type HomepageBorderStyle = "solid" | "dashed" | "dotted";
export type HomepageContainerDirection = "row" | "column";
export type HomepageContainerWrap = "nowrap" | "wrap";
export type HomepageContainerJustify = "start" | "center" | "end" | "between";
export type HomepageContainerAlign = "stretch" | "start" | "center" | "end";
export type HomepageLengthUnit = "px" | "%";

export type HomepageBoxSpacing = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  unit: HomepageStyleUnit;
  linked?: boolean;
};

export type HomepageBackground = {
  color?: string;
};

export type HomepageBorder = {
  enabled?: boolean;
  width?: number;
  color?: string;
  style?: HomepageBorderStyle;
  radius?: number;
  unit?: HomepageStyleUnit;
};

export type HomepageElementSpacing = {
  padding?: HomepageBoxSpacing;
  margin?: HomepageBoxSpacing;
};

export type HomepageButtonStyle = {
  backgroundColor?: string;
  textColor?: string;
  hoverBackgroundColor?: string;
  hoverTextColor?: string;
  border?: HomepageBorder;
};

export type HomepageLengthValue = {
  value?: number;
  unit?: HomepageLengthUnit;
};

export type HomepageContainerResponsive = {
  direction?: HomepageContainerDirection;
  width?: HomepageLengthValue;
  maxWidth?: HomepageLengthValue;
  minHeight?: HomepageLengthValue;
};

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
  builderLabel?: string;
  hidden?: boolean;
  visibility?: HomepageResponsiveVisibility;
  title: string;
  subtitle?: string;
  body?: string;
  backgroundStyle?: HomepageCardBackgroundStyle;
  backgroundColor?: string;
  textColor?: string;
  radiusPreset?: HomepageRadiusPreset;
  spacingPreset?: HomepageSpacingPreset;
  marginPreset?: HomepageSizePreset;
  widthPreset?: HomepageWidthPreset;
  borderPreset?: HomepageBorderPreset;
  spacing?: HomepageElementSpacing;
  background?: HomepageBackground;
  border?: HomepageBorder;
  buttonStyle?: HomepageButtonStyle;
};

export type HomepageCard =
  | (HomepageCardBase & {
      type: "ABOUT_US" | "WHY_US" | "ABOUT_SITE" | "TEXT_MEDIA";
      bullets?: string[];
      accentLabel?: string;
    })
  | (HomepageCardBase & {
      type: "HEADING";
      textTag: Exclude<HomepageTextTag, "P">;
      content: string;
      textAlign?: HomepageAlign;
    })
  | (HomepageCardBase & {
      type: "TEXT";
      content: string;
      textAlign?: HomepageAlign;
    })
  | (HomepageCardBase & {
      type: "BUTTON";
      label: string;
      href: string;
      variant?: HomepageButtonVariant;
      textAlign?: HomepageAlign;
    })
  | (HomepageCardBase & {
      type: "IMAGE_BLOCK";
      imageUrl: string;
      altText?: string;
      caption?: string;
      imageHeightPreset?: HomepageImageHeightPreset;
      imageFit?: HomepageImageFit;
      imagePosition?: HomepageImagePosition;
    })
  | (HomepageCardBase & {
      type: "VIDEO";
      videoUrl: string;
      caption?: string;
      aspectRatio?: HomepageVideoAspectRatio;
    })
  | (HomepageCardBase & {
      type: "ICON";
      iconSymbol: string;
      content: string;
      textAlign?: HomepageAlign;
    })
  | (HomepageCardBase & {
      type: "SPACER";
      heightPreset?: HomepageSizePreset;
    })
  | (HomepageCardBase & {
      type: "DIVIDER";
      dividerStyle?: "solid" | "dashed";
    })
  | (HomepageCardBase & {
      type: "LIST";
      items: string[];
    })
  | (HomepageCardBase & {
      type: "CARD";
      buttonLabel?: string;
      buttonHref?: string;
    })
  | (HomepageCardBase & {
      type: "COURSE_LIST";
      items: HomepageInstructorCourse[];
    })
  | (HomepageCardBase & {
      type: "INSTRUCTOR_LIST";
      instructors: HomepageInstructorEntry[];
    })
  | (HomepageCardBase & {
      type: "FEATURED_INSTRUCTORS";
      instructors: HomepageInstructorEntry[];
    });

export type HomepageColumn = {
  id: string;
  builderLabel?: string;
  hidden?: boolean;
  visibility?: HomepageResponsiveVisibility;
  backgroundColor?: string;
  paddingPreset?: HomepagePaddingPreset;
  gapPreset?: HomepageGapPreset;
  verticalAlign?: HomepageColumnAlign;
  horizontalAlign?: HomepageColumnAlign;
  spacing?: HomepageElementSpacing;
  background?: HomepageBackground;
  border?: HomepageBorder;
  widgets: HomepageCard[];
};

export type HomepageRow = {
  id: string;
  builderLabel?: string;
  columns: 1 | 2;
  hidden?: boolean;
  visibility?: HomepageResponsiveVisibility;
  mobileOrder?: HomepageRowOrder;
  tabletOrder?: HomepageRowOrder;
  backgroundStyle?: HomepageRowBackgroundStyle;
  backgroundColor?: string;
  backgroundImage?: string;
  paddingPreset?: HomepagePaddingPreset;
  marginPreset?: HomepageSizePreset;
  minHeightPreset?: HomepageSizePreset;
  borderPreset?: HomepageBorderPreset;
  radiusPreset?: HomepageRadiusPreset;
  gapPreset?: HomepageGapPreset;
  spacing?: HomepageElementSpacing;
  background?: HomepageBackground;
  border?: HomepageBorder;
  slots?: Array<HomepageCard | null>;
  columnsData?: HomepageColumn[];
};

export type HomepageContainer = {
  id: string;
  type: "CONTAINER";
  builderLabel?: string;
  hidden?: boolean;
  visibility?: HomepageResponsiveVisibility;
  direction?: HomepageContainerDirection;
  wrap?: HomepageContainerWrap;
  justify?: HomepageContainerJustify;
  align?: HomepageContainerAlign;
  gap?: number;
  spacing?: HomepageElementSpacing;
  background?: HomepageBackground;
  backgroundImage?: string;
  border?: HomepageBorder;
  width?: HomepageLengthValue;
  maxWidth?: HomepageLengthValue;
  minHeight?: HomepageLengthValue;
  height?: HomepageLengthValue;
  responsive?: {
    desktop?: HomepageContainerResponsive;
    tablet?: HomepageContainerResponsive;
    mobile?: HomepageContainerResponsive;
  };
  children: HomepageElement[];
};

export type HomepageElement = HomepageContainer | HomepageCard;

export type HomepageContent = {
  rows: HomepageRow[];
  containers?: HomepageContainer[];
  updatedAt?: string;
};

export type HomepageCatalogInstructor = {
  id: string;
  fullName: string;
  bio?: string | null;
  profileImage?: string | null;
  instructorCourses: HomepageInstructorCourse[];
};
