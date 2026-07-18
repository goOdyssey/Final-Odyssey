(function(){
  let internalTranslate = false;
  const LANDING_KEYS = {
    en:{
      tab_voc:'Vocational & Leisure', tab_voc_sub:'Skills, arts & crafts',
      reg_tag:'📝 Exams & competitions', reg_title1:'Your exam. Your country.', reg_title2:'Your prep.',
      reg_body:'Entrance exams, language certifications, olympiads, and competitions — all in one place.',
      nav_tests:'Tests',
      rtab_asia:'🌏 Asia-Pacific', rtab_africa:'🌍 Africa & Middle East', rtab_europe:'🌎 Europe', rtab_americas:'🌎 Americas',
      rtab_language:'🗣️ Language Exams', rtab_olympiad:'🏅 Olympiads & Competitions',
      lb_students:'🎓 Most students', lb_views:'👁️ Most viewed', lb_likes:'❤️ Most liked',
      instr_tag:'🧑‍🏫 Featured instructors', instr_title:'World-class teachers, from every corner 🌐',
      instr_body:'Vetted for expertise. Loved by students. Paid in their local currency.',
      instr_all:'All featured instructors',
      field_jee_mathematics:'JEE Mathematics', field_gaokao_physics:'Gaokao Physics', field_qiyas_prep:'Qiyas Prep',
      field_bac_french:'Baccalauréat French', field_sustainable_farming:'Sustainable Farming',
      field_jlpt_japanese:'JLPT Japanese', field_qiyas_prep_arabic:'Qiyas Prep · Arabic',
      field_organic_chem:'Organic Chemistry', field_culinary:'Culinary Arts'
    },
    az:{
      tab_voc:'Peşə və hobbi bacarıqları', tab_voc_sub:'Praktik bacarıqlar, sənət və yaradıcılıq',
      reg_tag:'📝 İmtahanlar və yarışlar', reg_title1:'Sənin imtahanın. Sənin ölkən.', reg_title2:'Sənin hazırlığın.',
      reg_body:'Qəbul imtahanları, dil sertifikatları, olimpiadalar və yarışlar — hamısı bir yerdə.',
      nav_tests:'Testlər',
      rtab_asia:'🌏 Asiya-Sakit okean', rtab_africa:'🌍 Afrika və Yaxın Şərq', rtab_europe:'🌎 Avropa', rtab_americas:'🌎 Amerika',
      rtab_language:'🗣️ Dil imtahanları', rtab_olympiad:'🏅 Olimpiadalar və yarışlar',
      lb_students:'🎓 Ən çox tələbə', lb_views:'👁️ Ən çox baxış', lb_likes:'❤️ Ən çox bəyənmə',
      instr_tag:'🧑‍🏫 Seçilmiş müəllimlər', instr_title:'Dünyanın hər yerindən yüksək səviyyəli müəllimlər 🌐',
      instr_body:'Ekspertliyinə görə yoxlanılıb. Tələbələr tərəfindən sevilir. Yerli valyutada ödəniş alır.',
      instr_all:'Bütün seçilmiş müəllimlər',
      field_jee_mathematics:'JEE riyaziyyatı', field_gaokao_physics:'Gaokao fizikası', field_qiyas_prep:'Qiyas hazırlığı',
      field_bac_french:'Baccalauréat fransız dili', field_sustainable_farming:'Davamlı kənd təsərrüfatı',
      field_jlpt_japanese:'JLPT yapon dili', field_qiyas_prep_arabic:'Qiyas hazırlığı · ərəb dili',
      field_organic_chem:'Üzvi kimya', field_culinary:'Kulinariya sənəti',
      'Global':'Qlobal','English':'İngilis dili','University':'Universitet','Engineering':'Mühəndislik','Medical':'Tibb',
      'Unified':'Birləşdirilmiş','College':'Kollec','Past papers':'Keçmiş suallar','Mock tests':'Sınaq testləri',
      'Practice sets':'Təcrübə tapşırıqları','All bands':'Bütün ballar','Speaking prep':'Danışıq hazırlığı',
      'Fast-track':'Sürətli hazırlıq','All levels':'Bütün səviyyələr','Problem sets':'Məsələ topluları',
      'Competitive coding':'Yarış proqramlaşdırması','Brain science':'Beyin elmi','Grades 2–10':'2–10-cu siniflər'
    },
    ja:{
      tab_voc:'職業スキルと趣味', tab_voc_sub:'実用スキル・芸術・クラフト',
      reg_tag:'📝 試験とコンテスト', reg_title1:'あなたの試験。あなたの国。', reg_title2:'あなたの対策。',
      reg_body:'入学試験、語学資格、オリンピック、コンテストを一か所で準備できます。',
      nav_tests:'テスト',
      rtab_asia:'🌏 アジア太平洋', rtab_africa:'🌍 アフリカ・中東', rtab_europe:'🌎 ヨーロッパ', rtab_americas:'🌎 アメリカ大陸',
      rtab_language:'🗣️ 語学試験', rtab_olympiad:'🏅 オリンピックとコンテスト',
      lb_students:'🎓 受講者数トップ', lb_views:'👁️ 閲覧数トップ', lb_likes:'❤️ いいね数トップ',
      instr_tag:'🧑‍🏫 注目講師', instr_title:'世界各地の一流講師 🌐',
      instr_body:'専門性を確認済み。学生に支持され、現地通貨で報酬を受け取れます。',
      instr_all:'注目講師一覧',
      field_jee_mathematics:'JEE数学', field_gaokao_physics:'高考物理', field_qiyas_prep:'Qiyas対策',
      field_bac_french:'バカロレア・フランス語', field_sustainable_farming:'持続可能な農業',
      field_jlpt_japanese:'JLPT日本語', field_qiyas_prep_arabic:'Qiyas対策 · アラビア語',
      field_organic_chem:'有機化学', field_culinary:'料理芸術',
      'Global':'グローバル','English':'英語','University':'大学','Engineering':'工学','Medical':'医学',
      'Unified':'統一試験','College':'大学進学','Past papers':'過去問','Mock tests':'模擬試験',
      'Practice sets':'演習セット','All bands':'全バンド対応','Speaking prep':'スピーキング対策',
      'Fast-track':'短期対策','All levels':'全レベル','Problem sets':'問題集',
      'Competitive coding':'競技プログラミング','Brain science':'脳科学','Grades 2–10':'2〜10年生'
    },
    es:{
      reg_tag:'📝 Exámenes y competiciones', reg_title1:'Tu examen. Tu país.', reg_title2:'Tu preparación.',
      reg_body:'Exámenes de ingreso, certificaciones de idiomas, olimpiadas y competiciones — todo en un solo lugar.',
      nav_tests:'Pruebas',
      rtab_asia:'🌏 Asia-Pacífico', rtab_africa:'🌍 África y Oriente Medio', rtab_europe:'🌎 Europa', rtab_americas:'🌎 Américas',
      rtab_language:'🗣️ Exámenes de idiomas', rtab_olympiad:'🏅 Olimpiadas y competiciones'
    },
    de:{reg_title2:'Deine Vorbereitung.', reg_tag:'📝 Prüfungen und Wettbewerbe', reg_title1:'Deine Prüfung. Dein Land.', reg_body:'Aufnahmeprüfungen, Sprachzertifikate, Olympiaden und Wettbewerbe — alles an einem Ort.'},
    fr:{reg_title2:'Votre préparation.', reg_tag:'📝 Examens et concours', reg_title1:'Votre examen. Votre pays.', reg_body:'Examens d’entrée, certifications linguistiques, olympiades et concours — tout au même endroit.'},
    pt:{reg_title2:'Sua preparação.', reg_tag:'📝 Exames e competições', reg_title1:'Seu exame. Seu país.', reg_body:'Vestibulares, certificações de idiomas, olimpíadas e competições — tudo em um só lugar.'},
    ru:{reg_title2:'Ваша подготовка.', reg_tag:'📝 Экзамены и соревнования', reg_title1:'Ваш экзамен. Ваша страна.', reg_body:'Вступительные экзамены, языковые сертификаты, олимпиады и соревнования — всё в одном месте.'},
    ar:{reg_title2:'استعدادك.', reg_tag:'📝 الاختبارات والمسابقات', reg_title1:'اختبارك. بلدك.', reg_body:'اختبارات القبول وشهادات اللغة والأولمبيادات والمسابقات — كلها في مكان واحد.', nav_tests:'الاختبارات'},
    fa:{reg_title2:'آمادگی شما.', reg_tag:'📝 آزمون‌ها و رقابت‌ها', reg_title1:'آزمون شما. کشور شما.', reg_body:'آزمون‌های ورودی، گواهی‌های زبان، المپیادها و رقابت‌ها — همه در یک جا.', nav_tests:'آزمون‌ها'}
  };
  const REG_TITLE_2_FALLBACK = {
    nl:'Jouw voorbereiding.', tr:'Hazırlığın.', ur:'آپ کی تیاری.', pl:'Twoje przygotowanie.', it:'La tua preparazione.',
    id:'Persiapanmu.', ko:'나의 준비.', uk:'Ваша підготовка.', ro:'Pregătirea ta.', ms:'Persediaan anda.',
    zh:'你的备考。'
  };
  Object.keys(REG_TITLE_2_FALLBACK).forEach(code => {
    LANDING_KEYS[code] = Object.assign({}, LANDING_KEYS[code] || {}, {reg_title2:REG_TITLE_2_FALLBACK[code]});
  });
  const EXAM_FLAGS = {
    'JEE Advanced':'🇮🇳','NEET-UG':'🇮🇳','Gaokao':'🇨🇳','Kyōtsū / JLPT':'🇯🇵','CSAT (Suneung)':'🇰🇷',
    'MDCAT / ECAT':'🇵🇰','SBMPTN / UTBK':'🇮🇩','UPCAT':'🇵🇭','HSC / Admission Tests':'🇧🇩',
    'JAMB UTME':'🇳🇬','WAEC WASSCE':'🇬🇭','NSC Matric':'🇿🇦','KCSE':'🇰🇪','Qiyas / Tahsili':'🇸🇦',
    'Thanawiyya Amma':'🇪🇬','Konkur (کنکور)':'🇮🇷','Bac Marocain':'🇲🇦','CSEE / ACSEE':'🇹🇿',
    'Baccalauréat':'🇫🇷','Abitur':'🇩🇪','A-Levels / GCSE':'🇬🇧','Selectividad (EBAU)':'🇪🇸',
    'Maturità / TOLC':'🇮🇹','Matura':'🇵🇱','ЕГЭ (EGE)':'🇷🇺','YKS / TYT-AYT':'🇹🇷',
    'SAT & ACT':'🇺🇸','MCAT':'🇺🇸','ENEM / Vestibular':'🇧🇷','EXANI / CENEVAL':'🇲🇽',
    'LSAT / MCAT CA':'🇨🇦','Ingreso UBA / CBC':'🇦🇷','ICFES Saber 11':'🇨🇴','PAES (ex-PSU)':'🇨🇱',
    'IELTS Academic':'🗣 GL','TOEFL iBT':'🗣 GL','Duolingo English Test':'🗣 GL','CELPIP':'🗣 CA',
    'DELF / DALF':'🗣 FR','TestDaF / Goethe-Zertifikat':'🗣 DE','JLPT':'🗣 JP','HSK (Hanyu Shuiping)':'🗣 CN',
    'DELE / SIELE':'🗣 ES','CELPE-Bras':'🗣 BR','TORFL (ТРКИ)':'🗣 RU','TOPIK':'🗣 KR',
    'IMO':'🏅 OL','IPhO':'🏅 OL','IChO':'🏅 OL','IBO':'🏅 OL','IOI':'🏅 OL','IMC':'🏅 OL',
    'BrainBEE':'🧠 NS','SASMO':'🏅 AS','Vanda Science':'🔬 SC','AMC 8 / 10 / 12':'🏅 AM',
    'Kangaroo Math':'🏅 KM','UKMT / Junior / Senior':'🏅 UK'
  };
  const EXAM_COUNTRIES = {
    'JEE Advanced':'India · Engineering','NEET-UG':'India · Medical','Gaokao':'China · University','Kyōtsū / JLPT':'Japan · Unified',
    'CSAT (Suneung)':'South Korea','MDCAT / ECAT':'Pakistan','SBMPTN / UTBK':'Indonesia · University','UPCAT':'Philippines · University',
    'HSC / Admission Tests':'Bangladesh','JAMB UTME':'Nigeria · University','WAEC WASSCE':'West Africa','NSC Matric':'South Africa',
    'KCSE':'Kenya','Qiyas / Tahsili':'Saudi Arabia','Thanawiyya Amma':'Egypt','Konkur (کنکور)':'Iran · University entrance',
    'Bac Marocain':'Morocco','CSEE / ACSEE':'Tanzania','Baccalauréat':'France','Abitur':'Germany','A-Levels / GCSE':'United Kingdom',
    'Selectividad (EBAU)':'Spain','Maturità / TOLC':'Italy','Matura':'Poland','ЕГЭ (EGE)':'Russia · University','YKS / TYT-AYT':'Turkey · University',
    'SAT & ACT':'USA · College','MCAT':'USA · Medical','ENEM / Vestibular':'Brazil','EXANI / CENEVAL':'Mexico','LSAT / MCAT CA':'Canada',
    'Ingreso UBA / CBC':'Argentina','ICFES Saber 11':'Colombia','PAES (ex-PSU)':'Chile','IELTS Academic':'Global · English · British Council',
    'TOEFL iBT':'Global · English · ETS','Duolingo English Test':'Global · English · Online','CELPIP':'Canada · English · PR & Citizenship',
    'DELF / DALF':'Global · French · Ministry','TestDaF / Goethe-Zertifikat':'Global · German','JLPT':'Global · Japanese · N1–N5',
    'HSK (Hanyu Shuiping)':'Global · Mandarin · HSK 1–6','DELE / SIELE':'Global · Spanish · Cervantes','CELPE-Bras':'Global · Portuguese',
    'TORFL (ТРКИ)':'Global · Russian','TOPIK':'Global · Korean · I & II','IMO':'International · Mathematics Olympiad',
    'IPhO':'International · Physics Olympiad','IChO':'International · Chemistry Olympiad','IBO':'International · Biology Olympiad',
    'IOI':'International · Informatics Olympiad','IMC':'International · Mathematics Competition · University',
    'BrainBEE':'Global · Neuroscience · Grades 9–12','SASMO':'Singapore & Asian · Maths Olympiad',
    'Vanda Science':'Global · Multi-Science Competition','AMC 8 / 10 / 12':'USA / Global · American Maths',
    'Kangaroo Math':'Global · 80+ Countries','UKMT / Junior / Senior':'United Kingdom · Maths Trust'
  };
  const FLAG_PAIR_RE = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g;
  const FAKE_TEXT_RE = /(Reg title|reg_title|placeholder|auto_[a-z0-9_]+|Playfair\s*Display|get\s+in\s+touch)/i;

  function lang(){
    return window.OdysseyI18n?.getLang?.() || localStorage.getItem('odyssey_lang') || 'en';
  }
  function patchDict(){
    const dict = window.OdysseyI18n && window.OdysseyI18n.DICT;
    if(!dict) return;
    Object.keys(LANDING_KEYS).forEach(code => {
      dict[code] = dict[code] || {};
      Object.assign(dict[code], LANDING_KEYS[code]);
    });
  }
  function tr(key){
    const code = lang();
    const dict = window.OdysseyI18n && window.OdysseyI18n.DICT;
    return (dict?.[code]?.[key]) || (LANDING_KEYS[code] && LANDING_KEYS[code][key]) || (dict?.en?.[key]) || (LANDING_KEYS.en && LANDING_KEYS.en[key]) || key;
  }
  function repairDataI18n(){
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if(!key) return;
      const value = tr(key);
      if(!value || value === key) return;
      const visible = el.textContent.trim();
      if(!visible || visible === key || /^reg[_\s-]?title/i.test(visible) || /placeholder/i.test(visible) || /auto_[a-z0-9_]+/.test(visible) || key.startsWith('reg_') || key.startsWith('rtab_') || key.startsWith('field_') || key.startsWith('lb_') || key.startsWith('instr_') || key.startsWith('tab_voc')){
        el.textContent = value;
      }
    });
  }
  function repairLandingKeyedText(){
    document.querySelectorAll('.categories [data-i18n], .regions [data-i18n], .instructors [data-i18n], .testimonials [data-i18n], .cta-section [data-i18n], footer [data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const value = key && tr(key);
      if(value && value !== key) el.textContent = value;
    });
    document.querySelectorAll('.categories [data-i18n-template], .regions [data-i18n-template], .instructors [data-i18n-template]').forEach(el => {
      const key = el.getAttribute('data-i18n-template');
      const template = key && tr(key);
      const count = el.getAttribute('data-i18n-count') || el.dataset.count || '';
      if(template && template !== key) el.textContent = template.replace('{count}', count);
    });
  }
  function translateExamDescriptors(){
    const table = LANDING_KEYS[lang()] || {};
    document.querySelectorAll('.exam-card').forEach(card => {
      const name = card.querySelector('.exam-name')?.textContent?.trim();
      const country = card.querySelector('.exam-country');
      if(!name || !country || !EXAM_COUNTRIES[name]) return;
      let value = EXAM_COUNTRIES[name];
      Object.keys(table).sort((a,b)=>b.length-a.length).forEach(source => {
        if(source.length < 4) return;
        value = value.split(source).join(table[source]);
      });
      country.textContent = value.replace(FLAG_PAIR_RE,'').replace(/\s+·\s*$/,'').replace(/\s{2,}/g,' ').trim();
    });
  }
  function lockExamFlags(){
    document.querySelectorAll('.exam-card').forEach(card => {
      const name = card.querySelector('.exam-name')?.textContent?.trim();
      const flag = card.querySelector('.exam-flag');
      if(flag){
        flag.setAttribute('data-no-auto-i18n','true');
        flag.setAttribute('translate','no');
        flag.style.display = 'inline-flex';
        flag.style.visibility = 'visible';
        flag.style.opacity = '1';
        flag.style.fontSize = FLAG_PAIR_RE.test(EXAM_FLAGS[name] || flag.textContent || '') ? '20px' : '12px';
        if(name && EXAM_FLAGS[name]) flag.textContent = EXAM_FLAGS[name];
      }
      const country = card.querySelector('.exam-country');
      if(country){
        country.textContent = country.textContent.replace(FLAG_PAIR_RE,'').replace(/\s+·\s*$/,'').replace(/\s{2,}/g,' ').trim();
      }
    });
  }
  function removeFakeText(){
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node){
        const parent = node.parentElement;
        if(!parent || /^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION)$/.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return FAKE_TEXT_RE.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const parent = node.parentElement;
      const key = parent && parent.getAttribute('data-i18n');
      if(key) node.nodeValue = tr(key);
    });
  }
  function repairDisciplineLeaks(){
    document.querySelectorAll('.categories .disc-tab [data-i18n], .categories .cat-card [data-i18n]').forEach(el => {
      const current = el.textContent || '';
      const key = el.getAttribute('data-i18n');
      const value = key && tr(key);
      if(FAKE_TEXT_RE.test(current) || current.trim() === key || value && value !== key){
        el.textContent = value && value !== key && !FAKE_TEXT_RE.test(value) ? value : '';
      }
    });
    document.querySelectorAll('.categories .disc-tab, .categories .cat-card').forEach(container => {
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
        acceptNode(node){
          return FAKE_TEXT_RE.test(node.nodeValue || '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      const nodes = [];
      while(walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(node => {
        const parent = node.parentElement;
        const key = parent && parent.getAttribute('data-i18n');
        const value = key && tr(key);
        node.nodeValue = value && value !== key && !FAKE_TEXT_RE.test(value) ? value : '';
      });
    });
  }
  function apply(runBaseTranslations){
    patchDict();
    if(runBaseTranslations && window.OdysseyI18n?.applyTranslations && !internalTranslate){
      internalTranslate = true;
      try{
        window.OdysseyI18n.applyTranslations();
      }finally{
        setTimeout(() => { internalTranslate = false; }, 0);
      }
    }
    repairDataI18n();
    repairLandingKeyedText();
    lockExamFlags();
    translateExamDescriptors();
    lockExamFlags();
    removeFakeText();
    repairDisciplineLeaks();
    if(window.OdysseyPortalTranslate) setTimeout(window.OdysseyPortalTranslate, 20);
  }
  function repairSoon(){
    [30, 140, 360, 800].forEach(delay => setTimeout(() => apply(false), delay));
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => apply(true), 80));
  document.addEventListener('odyssey:languageChanged', () => {
    if(internalTranslate) return;
    repairSoon();
  });
  if(document.readyState !== 'loading') setTimeout(() => apply(true), 80);
})();
