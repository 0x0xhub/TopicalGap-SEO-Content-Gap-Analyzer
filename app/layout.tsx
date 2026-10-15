import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'TopicalGap - SEO Content Gap Analyzer',
  description: 'Professional SEO content gap analysis & topical architecture platform using 3-month Google Search Console exports with Google Drive, Sheets, and Docs integration.',
  openGraph: {
    title: 'TopicalGap - SEO Content Gap Analyzer',
    description: 'Professional SEO content gap analysis & topical architecture platform using 3-month Google Search Console exports with Google Drive, Sheets, and Docs integration.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TopicalGap - SEO Content Gap Analyzer',
    description: 'Professional SEO content gap analysis & topical architecture platform using 3-month Google Search Console exports with Google Drive, Sheets, and Docs integration.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
