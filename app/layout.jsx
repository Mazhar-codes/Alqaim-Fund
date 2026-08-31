import { Inter, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import SupportButton from "@/components/SupportButton";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-urdu",
  display: "swap",
});

export const metadata = {
  title: "Alqaim Fund — Committee & Emergency Support System",
  description: "Interest-free committee fund with emergency support loans.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${notoNastaliqUrdu.variable}`}>
      <body>
        <LanguageProvider>
          <AuthProvider>{children}</AuthProvider>
          <SupportButton />
        </LanguageProvider>
      </body>
    </html>
  );
}
