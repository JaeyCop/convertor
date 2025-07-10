import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from '../components/Header';
import Footer from '../components/Footer';
import MuiThemeProvider from '../components/MuiThemeProvider';

export const metadata: Metadata = {
  title: "File Converter",
  description: "A robust file conversion platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <MuiThemeProvider>
          <Header />
          <main style={{ flexGrow: 1, padding: '20px' }}>{children}</main>
          <Footer />
        </MuiThemeProvider>
      </body>
    </html>
  );
}
