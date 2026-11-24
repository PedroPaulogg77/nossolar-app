import Home from "@/components/home";
import { PrivateAccess } from "@/components/private-access";
export default function Page() {
  const groqEnabled =
    process.env.AI_ENABLED === "true" && !!process.env.GROQ_API_KEY;
  const geminiEnabled =
    process.env.AI_ENABLED === "true" &&
    (process.env.GEMINI_FREE_TIER_CONFIRMED === "true" ||
      process.env.GEMINI_BILLING_MODE === "paid") &&
    !!process.env.GEMINI_MODEL &&
    !!process.env.GEMINI_API_KEY;
  return (
    <PrivateAccess>
      <Home
        aiEnabled={groqEnabled || geminiEnabled}
        aiProvider={groqEnabled ? "Groq" : "Gemini"}
      />
    </PrivateAccess>
  );
}
