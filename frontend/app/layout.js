import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "HackHub — Run & join hackathons",
  description: "Makers host hackathons, participants join with a private code and submit projects.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="container page">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
