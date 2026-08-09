import { About } from "@/components/about";
import { Hero } from "@/components/hero";
import { Services } from "@/components/services";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <About />
        <Services />
      </main>
    </>
  );
}
