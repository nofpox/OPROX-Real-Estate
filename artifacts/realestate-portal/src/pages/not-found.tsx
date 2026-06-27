import { Link } from "wouter";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <div className="text-8xl font-bold text-[#0f2040] mb-4">404</div>
        <h1 className="text-2xl font-bold text-[#0f2040] mb-3">الصفحة غير موجودة | Page Not Found</h1>
        <p className="text-gray-500 mb-8">عذراً، الصفحة التي تبحث عنها غير موجودة | Sorry, the page you're looking for doesn't exist.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/" className="inline-flex items-center gap-2 bg-[#0f2040] hover:bg-[#1a3060] text-white font-bold px-6 py-3 rounded-lg transition-colors">
            <Home className="w-5 h-5" />الرئيسية | Home
          </Link>
          <Link href="/search" className="inline-flex items-center gap-2 border-2 border-[#0f2040] text-[#0f2040] hover:bg-[#0f2040] hover:text-white font-bold px-6 py-3 rounded-lg transition-colors">
            <Search className="w-5 h-5" />بحث | Search
          </Link>
        </div>
      </div>
    </div>
  );
}
