// app/page.tsx
import { redirect } from "next/navigation";
import LandingHero from "@/components/landing/LandingHero";

export default function Home() {
  return <LandingHero />;
  //redirect("/auth");
}
