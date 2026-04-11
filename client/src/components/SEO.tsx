import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalPath?: string;
  ogType?: string;
  ogImage?: string;
  noindex?: boolean;
}

const BASE_URL = "https://www.taiwanmaami.com";
const DEFAULT_TITLE = "Taiwan Maami™ - Authentic Taiwanese Bubble Tea in Chennai";
const DEFAULT_DESCRIPTION =
  "Taiwan Maami - Chennai's premium Taiwanese bubble tea cafe. Organic whole-leaf boba tea, mochi, Asian street food. Order online for delivery, pickup or dine-in at T Nagar & Velachery.";
const DEFAULT_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/114675165/7xKVuVPoe4TavcqcxPZkpC/og-image/taiwan-maami-og.jpg";

export function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords,
  canonicalPath,
  ogType = "website",
  ogImage = DEFAULT_IMAGE,
  noindex = false,
}: SEOProps) {
  const fullTitle = title ? `${title} | Taiwan Maami™` : DEFAULT_TITLE;
  const canonicalUrl = canonicalPath ? `${BASE_URL}${canonicalPath}` : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:site_name" content="Taiwan Maami™" />
      <meta property="og:locale" content="en_IN" />

      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/jpeg" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@TaiwanMaami" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
