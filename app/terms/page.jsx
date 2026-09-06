import { FileText } from "lucide-react";
import Navbar from "@/components/Navbar";
import TermsContent from "@/components/TermsContent";

export const metadata = { title: "Terms & Conditions — AGS Fund" };

export default function TermsPage() {
  return (
    <>
      <Navbar variant="public" />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AGS Family Support Fund</h1>
            <p className="text-sm text-gray-500">Terms & Conditions</p>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <TermsContent />
        </div>
      </main>
    </>
  );
}
