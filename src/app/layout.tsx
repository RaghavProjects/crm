import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Defence Contract CRM",
  description: "Requirements, OEM sourcing, quotations and fulfilment",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="bg-page text-ink font-sans antialiased">{children}</body>
    </html>
  );
}
