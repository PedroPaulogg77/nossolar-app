import type { Page } from "@playwright/test";
import { defaults, initialProperty } from "../../lib/domain";

export async function seedTestProperty(page: Page) {
  const property = initialProperty();
  await page.addInitScript(
    ({ property, preferences }) => {
      if (!localStorage.getItem("nosso-lar-v1"))
        localStorage.setItem(
          "nosso-lar-v1",
          JSON.stringify({ version: 1, properties: [property], preferences }),
        );
    },
    { property, preferences: defaults },
  );
}
