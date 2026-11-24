import Home from "@/components/home";
import { PrivateAccess } from "@/components/private-access";
export default function Page() {
  return (
    <PrivateAccess>
      <Home
        aiEnabled={
          process.env.AI_ENABLED === "true" &&
          (process.env.GEMINI_FREE_TIER_CONFIRMED === "true" ||
            process.env.GEMINI_BILLING_MODE === "paid") &&
          !!process.env.GEMINI_MODEL &&
          !!process.env.GEMINI_API_KEY
        }
      />
    </PrivateAccess>
  );
}
