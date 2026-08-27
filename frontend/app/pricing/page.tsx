import type { Metadata } from "next";
import { PublicFooter, PublicHeader } from "../public-chrome";
import PricingPlans from "./pricing-plans";

export const metadata: Metadata = {
  title: "价格方案 - AnglePet",
  description: "查看 AnglePet 免费体验与不同强度的宠物陪伴方案。",
};

export default function PricingPage() {
  return (
    <main className="public-document-site pricing-site">
      <PublicHeader active="pricing" />
      <PricingPlans />
      <PublicFooter />
    </main>
  );
}
