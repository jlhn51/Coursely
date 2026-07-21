import {ClerkProvider} from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { Toaster } from "@/components/toaster";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const title = "Coursely — Your semester, organized automatically";
const description =
  "Upload your syllabus. Coursely extracts your weekly topics and every deadline, and becomes a course-aware AI study partner for the semester.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    siteName: "Coursely",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
  ],
};

// Runs before hydration; sets the `.dark` class + sidebar state on <html> so
// the first paint matches stored preferences (no flash).
const themeInitScript = `
(function(){try{
  var t=localStorage.getItem('theme');
  var d=window.matchMedia('(prefers-color-scheme: dark)').matches;
  if(t==='dark'||(t!=='light'&&d)){document.documentElement.classList.add('dark')}
  var s=localStorage.getItem('sidebar-collapsed');
  if(s==='1'){document.documentElement.dataset.sidebar='collapsed'}
}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-paper text-ink font-sans">
        <ClerkProvider>
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
          {children}
          <Toaster />
        </ClerkProvider>
      </body>
    </html>
  );
}