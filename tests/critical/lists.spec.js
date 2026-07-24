import { test } from "../fixtures/test";
import { ListPage } from "../pages";

const pages = [
  { name: "campaigns list", path: "/campaign" },
  { name: "whatsapp templates list", path: "/templates/whatsapp-templates" },
  { name: "contacts list", path: "/contacts/all" },
  { name: "segmentation list", path: "/segmentation" },
];

test.describe("core list pages @critical", () => {
  for (const entry of pages) {
    test(`${entry.name} loads`, async ({ page }) => {
      const list = new ListPage(page, entry.path);
      await list.goto();
      await list.expectNotLogin();
      await list.expectLoaded();
    });
  }
});
