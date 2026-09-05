# Odyssey Phase 1 Current Fix Audit

- Translation dictionaries are sourced from the original 21-language monolithic dictionary and split into one JS dictionary per language.
- Runtime loads only the active language (+ English fallback), without fetch(), so direct file:// opening also works.
- Translation fallback never humanizes technical keys or replaces real page text with placeholders.
- Legacy monolithic runtime and duplicate translation observer scripts are removed.
- Subscription/auth/test marketplace static controls use the single i18n runtime.
- Test marketplace now has Field → Discipline → Subject → Level filters plus search, difficulty, price, format and sorting.
- Visual animation/scroll-reveal system was not intentionally modified.
