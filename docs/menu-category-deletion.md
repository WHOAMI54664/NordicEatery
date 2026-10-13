# Category deletion

Categories are product category IDs plus built-in defaults; localized names/images remain in `site_content`. Admin menu cards and the product editor share the delete control. An owner/admin confirms deletion and selects a destination when products exist. The API validates role, origin, JSON size and IDs before invoking a service-only database function.

In the product editor, each category dropdown row has separate rename and delete buttons. Clicking the name selects the category. Renaming or deleting another category preserves the current product selection; deleting the selected category switches it to the transfer destination. The confirmation dialogs keep unsaved product edits intact.

Apply `supabase-migration-delete-menu-categories.sql` before deploying this interface. It adds category tombstones and a product trigger. In one transaction deletion locks product writes, moves every product (including unavailable ones) if necessary, and records the deleted ID. Products, prices, stock and historical order lines are preserved. Repeating the same request is harmless. An old product form cannot recreate the removed category: the database rejects the stale category ID.

Public menus derive categories from products and therefore stop showing the removed category. Admin defaults and product dropdowns filter tombstones. Localized copy/images and advisory display order are retained for recovery; stale order entries are ignored by the existing menu display code. The same deleted ID cannot currently be re-added through the product editor. Restoring a category requires an explicit database recovery and deliberate selection of products to move back, using a pre-change backup; do not bulk-reverse a destination category.

For rollback, deploy the previous application and retain tombstones/trigger until deciding whether deleted IDs should be allowed again. Do not automatically reverse product transfers. Unit/PGlite tests: `node --import tsx --test tests/menu-category-deletion.test.ts`.
