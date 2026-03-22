import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ChartSection from "@/components/ChartSection";
import CategoryCards from "@/components/CategoryCards";
import RightPanel from "@/components/RightPanel";

export default function Dashboard() {
  return (
    <>
      {/* Material Symbols font */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      <Sidebar />

      <main className="ml-[204px] mr-[272px] min-h-screen">
        <Header />
        <div className="p-6 space-y-8">
          <HeroSection />
          <ChartSection />
          <CategoryCards />
        </div>
      </main>

      <RightPanel />
    </>
  );
}
