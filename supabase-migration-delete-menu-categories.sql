-- Deleting a category never deletes products or historical order lines.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS public.deleted_menu_categories (
  id text PRIMARY KEY,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  moved_to text
);
ALTER TABLE public.deleted_menu_categories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.deleted_menu_categories FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.deleted_menu_categories TO authenticated;
GRANT SELECT ON public.deleted_menu_categories TO service_role;
DROP POLICY IF EXISTS deleted_menu_categories_read ON public.deleted_menu_categories;
CREATE POLICY deleted_menu_categories_read ON public.deleted_menu_categories FOR SELECT TO authenticated USING(true);

CREATE OR REPLACE FUNCTION public.reject_deleted_product_category()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM public.deleted_menu_categories WHERE id=NEW.category) THEN
    RAISE EXCEPTION 'categoryDeleted' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.reject_deleted_product_category() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE TRIGGER products_active_category
  BEFORE INSERT OR UPDATE OF category ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.reject_deleted_product_category();

CREATE OR REPLACE FUNCTION public.delete_menu_category(p_source text,p_target text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE moved integer := 0;
BEGIN
  IF p_source IS NULL OR length(p_source)>64 OR p_source='' OR p_target=p_source THEN
    RAISE EXCEPTION 'invalidInput';
  END IF;
  -- Serialize deletion with product writes, including forms opened before deletion.
  LOCK TABLE public.products IN SHARE ROW EXCLUSIVE MODE;
  IF EXISTS(SELECT 1 FROM public.deleted_menu_categories WHERE id=p_source) THEN RETURN 0; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.products WHERE category=p_source)
    AND p_source NOT IN ('maczanka','knysza','fries','sauces','drinks') THEN RAISE EXCEPTION 'categoryNotFound'; END IF;
  IF p_target IS NOT NULL AND (
    EXISTS(SELECT 1 FROM public.deleted_menu_categories WHERE id=p_target) OR
    (p_target NOT IN ('maczanka','knysza','fries','sauces','drinks') AND
      NOT EXISTS(SELECT 1 FROM public.products WHERE category=p_target))
  ) THEN RAISE EXCEPTION 'invalidTarget'; END IF;
  IF EXISTS(SELECT 1 FROM public.products WHERE category=p_source) THEN
    IF p_target IS NULL THEN RAISE EXCEPTION 'targetRequired'; END IF;
    UPDATE public.products SET category=p_target WHERE category=p_source;
    GET DIAGNOSTICS moved=ROW_COUNT;
  END IF;
  INSERT INTO public.deleted_menu_categories(id,moved_to) VALUES(p_source,p_target);
  -- Preserve localized copy/images for rollback; display order ignores absent categories.
  RETURN moved;
END $$;
REVOKE ALL ON FUNCTION public.delete_menu_category(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.delete_menu_category(text,text) TO service_role;
COMMIT;
