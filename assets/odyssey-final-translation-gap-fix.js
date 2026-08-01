(function(){
  const PATCH = {
    uk: {
      reg_tag: '📝 Іспити та конкурси',
      testi1_text: 'Я знайшла єдину підготовку до JAMB, яку повністю викладали мовою йоруба. Це все змінило. Я набрала 312 балів і вступила до Університету Ібадана!'
    },
    pl: {
      share_story_sub: 'Uczniowie mogą podać swoje miasto, kraj, dziedzinę, przedmiot oraz opisać doświadczenie z Odyssey. Historie demonstracyjne są zapisywane w tej przeglądarce.',
      lvl_elementary: '📗 Podstawowy',
      lvl_upper: '📙 Wyższy średniozaawansowany',
      qtab_all: '🌐 Wszystko',
      qtab_k12: '🏫 K-12',
      qtab_entrance: '📝 Egzaminy wstępne',
      sb_under20: 'Poniżej 20 USD',
      sb_20_50: '20-50 USD',
      sb_50plus: '50 USD+',
      sb_rating5: 'Tylko 5,0',
      sb_rating45: '4,5 i więcej',
      sb_rating40: '4,0 i więcej',
      sb_rating30: '3,0 i więcej',
      sb_under5h: 'Poniżej 5 godz.',
      sb_5_20h: '5-20 godz.',
      sb_20_50h: '20-50 godz.',
      sb_50plush: '50+ godz.',
      lang_hindi: 'Hindi',
      lang_mandarin: 'Mandaryński',
      lang_portuguese: 'Portugalski',
      lang_swahili: 'Suahili',
      sb_live_classes: 'Zajęcia na żywo',
      sb_offline: 'Pobieranie offline',
      sort_popular: 'Najpopularniejsze',
      sort_rated: 'Najwyżej oceniane'
    }
  };

  function mergePatch(){
    const i18n = window.OdysseyI18n;
    if (!i18n || !i18n.DICT) return false;
    Object.keys(PATCH).forEach(lang => {
      i18n.DICT[lang] = Object.assign(i18n.DICT[lang] || {}, PATCH[lang]);
    });
    return true;
  }

  function apply(){
    if (mergePatch() && window.OdysseyI18n.applyTranslations) {
      window.OdysseyI18n.applyTranslations();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
  document.addEventListener('odyssey:languageChanged', () => {
    mergePatch();
  });
})();
