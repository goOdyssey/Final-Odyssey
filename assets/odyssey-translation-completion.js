(function(){
  const RTL = new Set(['ar','fa','ur']);
  const FOOTER_ALIASES = {
    footer_practice_tests: 'footer_practice',
    footer_accreditations_certificates: 'footer_accred_certs',
    footer_institutional_plans: 'footer_institutional',
    footer_course_builder_tour: 'footer_course_builder',
    footer_partnership_enquiries: 'footer_partnership',
    footer_press_media: 'footer_press',
    footer_terms_service: 'footer_tos',
    footer_privacy_policy: 'footer_privacy',
    footer_cookie_policy: 'footer_privacy_policy',
    footer_refund_policy: 'terms_refund_title',
    footer_trust_safety: 'footer_support'
  };

  const COMMON_PHRASES = {
    en: {
      'Home':'Home','Courses':'Courses','Tests':'Tests','About':'About','Contact':'Contact','Log in':'Log in','Sign up':'Sign up',
      'Dashboard':'Dashboard','Overview':'Overview','Users':'Users','Instructors':'Instructors','Payments':'Payments','Messages':'Messages',
      'Certificates':'Certificates','Deployment':'Deployment','Audit logs':'Audit logs','Search':'Search','Subject':'Subject','Difficulty':'Difficulty',
      'Price':'Price','Format':'Format','Previous':'Previous','Next':'Next','Security':'Security','Your data':'Your data'
    },
    ar: {
      'Home':'الرئيسية','Courses':'الدورات','Tests':'الاختبارات','About':'من نحن','Contact':'اتصل بنا','Log in':'تسجيل الدخول','Sign up':'إنشاء حساب',
      'Dashboard':'لوحة التحكم','Overview':'نظرة عامة','Users':'المستخدمون','Instructors':'المدرسون','Payments':'المدفوعات','Messages':'الرسائل',
      'Certificates':'الشهادات','Deployment':'النشر','Audit logs':'سجلات التدقيق','Search':'بحث','Subject':'الموضوع','Difficulty':'الصعوبة',
      'Price':'السعر','Format':'الصيغة','Previous':'السابق','Next':'التالي','Security':'الأمان','Your data':'بياناتك'
    },
    fa: {
      'Home':'خانه','Courses':'دوره‌ها','Tests':'آزمون‌ها','About':'درباره ما','Contact':'تماس','Log in':'ورود','Sign up':'ثبت‌نام',
      'Dashboard':'داشبورد','Overview':'نمای کلی','Users':'کاربران','Instructors':'مدرسان','Payments':'پرداخت‌ها','Messages':'پیام‌ها',
      'Certificates':'گواهینامه‌ها','Deployment':'استقرار','Audit logs':'گزارش‌های ممیزی','Search':'جست‌وجو','Subject':'موضوع','Difficulty':'دشواری',
      'Price':'قیمت','Format':'فرمت','Previous':'قبلی','Next':'بعدی','Security':'امنیت','Your data':'داده‌های شما'
    },
    fr: {
      'Home':'Accueil','Courses':'Cours','Tests':'Tests','About':'À propos','Contact':'Contact','Log in':'Connexion','Sign up':'Inscription',
      'Dashboard':'Tableau de bord','Overview':'Vue d’ensemble','Users':'Utilisateurs','Instructors':'Enseignants','Payments':'Paiements','Messages':'Messages',
      'Certificates':'Certificats','Deployment':'Déploiement','Audit logs':'Journaux d’audit','Search':'Rechercher','Subject':'Sujet','Difficulty':'Difficulté',
      'Price':'Prix','Format':'Format','Previous':'Précédent','Next':'Suivant','Security':'Sécurité','Your data':'Vos données'
    },
    de: {
      'Home':'Startseite','Courses':'Kurse','Tests':'Tests','About':'Über uns','Contact':'Kontakt','Log in':'Anmelden','Sign up':'Registrieren',
      'Dashboard':'Dashboard','Overview':'Übersicht','Users':'Nutzer','Instructors':'Lehrkräfte','Payments':'Zahlungen','Messages':'Nachrichten',
      'Certificates':'Zertifikate','Deployment':'Bereitstellung','Audit logs':'Audit-Protokolle','Search':'Suchen','Subject':'Fach','Difficulty':'Schwierigkeit',
      'Price':'Preis','Format':'Format','Previous':'Zurück','Next':'Weiter','Security':'Sicherheit','Your data':'Ihre Daten'
    },
    ru: {
      'Home':'Главная','Courses':'Курсы','Tests':'Тесты','About':'О нас','Contact':'Контакты','Log in':'Войти','Sign up':'Регистрация',
      'Dashboard':'Панель','Overview':'Обзор','Users':'Пользователи','Instructors':'Преподаватели','Payments':'Платежи','Messages':'Сообщения',
      'Certificates':'Сертификаты','Deployment':'Развертывание','Audit logs':'Журналы аудита','Search':'Поиск','Subject':'Предмет','Difficulty':'Сложность',
      'Price':'Цена','Format':'Формат','Previous':'Назад','Next':'Далее','Security':'Безопасность','Your data':'Ваши данные'
    },
    pt: {
      'Home':'Início','Courses':'Cursos','Tests':'Testes','About':'Sobre','Contact':'Contato','Log in':'Entrar','Sign up':'Cadastrar',
      'Dashboard':'Painel','Overview':'Visão geral','Users':'Usuários','Instructors':'Instrutores','Payments':'Pagamentos','Messages':'Mensagens',
      'Certificates':'Certificados','Deployment':'Implantação','Audit logs':'Logs de auditoria','Search':'Pesquisar','Subject':'Assunto','Difficulty':'Dificuldade',
      'Price':'Preço','Format':'Formato','Previous':'Anterior','Next':'Próximo','Security':'Segurança','Your data':'Seus dados'
    },
    zh: {
      'Home':'首页','Courses':'课程','Tests':'测试','About':'关于','Contact':'联系','Log in':'登录','Sign up':'注册',
      'Dashboard':'仪表盘','Overview':'概览','Users':'用户','Instructors':'讲师','Payments':'支付','Messages':'消息',
      'Certificates':'证书','Deployment':'部署','Audit logs':'审计日志','Search':'搜索','Subject':'科目','Difficulty':'难度',
      'Price':'价格','Format':'格式','Previous':'上一页','Next':'下一页','Security':'安全','Your data':'你的数据'
    },
    ja: {
      'Home':'ホーム','Courses':'コース','Tests':'テスト','About':'概要','Contact':'お問い合わせ','Log in':'ログイン','Sign up':'登録',
      'Dashboard':'ダッシュボード','Overview':'概要','Users':'ユーザー','Instructors':'講師','Payments':'支払い','Messages':'メッセージ',
      'Certificates':'証明書','Deployment':'デプロイ','Audit logs':'監査ログ','Search':'検索','Subject':'科目','Difficulty':'難易度',
      'Price':'価格','Format':'形式','Previous':'前へ','Next':'次へ','Security':'セキュリティ','Your data':'あなたのデータ'
    },
    tr: {
      'Home':'Ana sayfa','Courses':'Kurslar','Tests':'Testler','About':'Hakkında','Contact':'İletişim','Log in':'Giriş yap','Sign up':'Kaydol',
      'Dashboard':'Pano','Overview':'Genel bakış','Users':'Kullanıcılar','Instructors':'Eğitmenler','Payments':'Ödemeler','Messages':'Mesajlar',
      'Certificates':'Sertifikalar','Deployment':'Yayınlama','Audit logs':'Denetim kayıtları','Search':'Ara','Subject':'Konu','Difficulty':'Zorluk',
      'Price':'Fiyat','Format':'Format','Previous':'Önceki','Next':'Sonraki','Security':'Güvenlik','Your data':'Verileriniz'
    },
    es: {}
  };

  const SAME_AS_EN = ['nl','az','ur','pl','it','id','ko','uk','ro','ms'];
  SAME_AS_EN.forEach(code => { COMMON_PHRASES[code] = COMMON_PHRASES[code] || {}; });

  const EXTRA_BASIC = {
    es: {'Home':'Inicio','Courses':'Cursos','Tests':'Pruebas','About':'Acerca de','Contact':'Contacto','Log in':'Iniciar sesión','Sign up':'Registrarse','Dashboard':'Panel','Overview':'Resumen','Users':'Usuarios','Instructors':'Instructores','Payments':'Pagos','Messages':'Mensajes','Certificates':'Certificados','Deployment':'Despliegue','Audit logs':'Registros de auditoría','Search':'Buscar','Subject':'Tema','Difficulty':'Dificultad','Price':'Precio','Format':'Formato','Previous':'Anterior','Next':'Siguiente','Security':'Seguridad','Your data':'Tus datos'},
    nl: {'Home':'Home','Courses':'Cursussen','Tests':'Toetsen','About':'Over ons','Contact':'Contact','Log in':'Inloggen','Sign up':'Registreren','Dashboard':'Dashboard','Overview':'Overzicht','Users':'Gebruikers','Instructors':'Docenten','Payments':'Betalingen','Messages':'Berichten','Certificates':'Certificaten','Deployment':'Implementatie','Audit logs':'Auditlogboeken','Search':'Zoeken','Subject':'Onderwerp','Difficulty':'Moeilijkheid','Price':'Prijs','Format':'Indeling','Previous':'Vorige','Next':'Volgende','Security':'Beveiliging','Your data':'Uw gegevens'},
    az: {'Home':'Ana səhifə','Courses':'Kurslar','Tests':'Testlər','About':'Haqqında','Contact':'Əlaqə','Log in':'Daxil ol','Sign up':'Qeydiyyat','Dashboard':'İdarə paneli','Overview':'İcmal','Users':'İstifadəçilər','Instructors':'Təlimçilər','Payments':'Ödənişlər','Messages':'Mesajlar','Certificates':'Sertifikatlar','Deployment':'Yerləşdirmə','Audit logs':'Audit qeydləri','Search':'Axtar','Subject':'Mövzu','Difficulty':'Çətinlik','Price':'Qiymət','Format':'Format','Previous':'Əvvəlki','Next':'Növbəti','Security':'Təhlükəsizlik','Your data':'Məlumatlarınız'},
    ur: {'Home':'صفحہ اول','Courses':'کورسز','Tests':'ٹیسٹ','About':'تعارف','Contact':'رابطہ','Log in':'لاگ ان','Sign up':'سائن اپ','Dashboard':'ڈیش بورڈ','Overview':'جائزہ','Users':'صارفین','Instructors':'اساتذہ','Payments':'ادائیگیاں','Messages':'پیغامات','Certificates':'سرٹیفکیٹس','Deployment':'تعیناتی','Audit logs':'آڈٹ لاگز','Search':'تلاش','Subject':'مضمون','Difficulty':'مشکل','Price':'قیمت','Format':'فارمیٹ','Previous':'پچھلا','Next':'اگلا','Security':'سیکیورٹی','Your data':'آپ کا ڈیٹا'},
    pl: {'Home':'Strona główna','Courses':'Kursy','Tests':'Testy','About':'O nas','Contact':'Kontakt','Log in':'Zaloguj','Sign up':'Zarejestruj','Dashboard':'Panel','Overview':'Przegląd','Users':'Użytkownicy','Instructors':'Instruktorzy','Payments':'Płatności','Messages':'Wiadomości','Certificates':'Certyfikaty','Deployment':'Wdrożenie','Audit logs':'Dzienniki audytu','Search':'Szukaj','Subject':'Temat','Difficulty':'Trudność','Price':'Cena','Format':'Format','Previous':'Poprzedni','Next':'Następny','Security':'Bezpieczeństwo','Your data':'Twoje dane'},
    it: {'Home':'Home','Courses':'Corsi','Tests':'Test','About':'Chi siamo','Contact':'Contatto','Log in':'Accedi','Sign up':'Registrati','Dashboard':'Dashboard','Overview':'Panoramica','Users':'Utenti','Instructors':'Docenti','Payments':'Pagamenti','Messages':'Messaggi','Certificates':'Certificati','Deployment':'Distribuzione','Audit logs':'Log di audit','Search':'Cerca','Subject':'Argomento','Difficulty':'Difficoltà','Price':'Prezzo','Format':'Formato','Previous':'Precedente','Next':'Successivo','Security':'Sicurezza','Your data':'I tuoi dati'},
    id: {'Home':'Beranda','Courses':'Kursus','Tests':'Tes','About':'Tentang','Contact':'Kontak','Log in':'Masuk','Sign up':'Daftar','Dashboard':'Dasbor','Overview':'Ringkasan','Users':'Pengguna','Instructors':'Instruktur','Payments':'Pembayaran','Messages':'Pesan','Certificates':'Sertifikat','Deployment':'Penerapan','Audit logs':'Log audit','Search':'Cari','Subject':'Subjek','Difficulty':'Kesulitan','Price':'Harga','Format':'Format','Previous':'Sebelumnya','Next':'Berikutnya','Security':'Keamanan','Your data':'Data Anda'},
    ko: {'Home':'홈','Courses':'강좌','Tests':'시험','About':'소개','Contact':'문의','Log in':'로그인','Sign up':'가입','Dashboard':'대시보드','Overview':'개요','Users':'사용자','Instructors':'강사','Payments':'결제','Messages':'메시지','Certificates':'수료증','Deployment':'배포','Audit logs':'감사 로그','Search':'검색','Subject':'과목','Difficulty':'난이도','Price':'가격','Format':'형식','Previous':'이전','Next':'다음','Security':'보안','Your data':'내 데이터'},
    uk: {'Home':'Головна','Courses':'Курси','Tests':'Тести','About':'Про нас','Contact':'Контакти','Log in':'Увійти','Sign up':'Зареєструватися','Dashboard':'Панель','Overview':'Огляд','Users':'Користувачі','Instructors':'Викладачі','Payments':'Платежі','Messages':'Повідомлення','Certificates':'Сертифікати','Deployment':'Розгортання','Audit logs':'Журнали аудиту','Search':'Пошук','Subject':'Тема','Difficulty':'Складність','Price':'Ціна','Format':'Формат','Previous':'Назад','Next':'Далі','Security':'Безпека','Your data':'Ваші дані'},
    ro: {'Home':'Acasă','Courses':'Cursuri','Tests':'Teste','About':'Despre','Contact':'Contact','Log in':'Autentificare','Sign up':'Înregistrare','Dashboard':'Tablou de bord','Overview':'Prezentare','Users':'Utilizatori','Instructors':'Instructori','Payments':'Plăți','Messages':'Mesaje','Certificates':'Certificate','Deployment':'Implementare','Audit logs':'Jurnale audit','Search':'Caută','Subject':'Subiect','Difficulty':'Dificultate','Price':'Preț','Format':'Format','Previous':'Anterior','Next':'Următor','Security':'Securitate','Your data':'Datele tale'},
    ms: {'Home':'Laman utama','Courses':'Kursus','Tests':'Ujian','About':'Tentang','Contact':'Hubungi','Log in':'Log masuk','Sign up':'Daftar','Dashboard':'Papan pemuka','Overview':'Gambaran','Users':'Pengguna','Instructors':'Pengajar','Payments':'Pembayaran','Messages':'Mesej','Certificates':'Sijil','Deployment':'Pelaksanaan','Audit logs':'Log audit','Search':'Cari','Subject':'Subjek','Difficulty':'Kesukaran','Price':'Harga','Format':'Format','Previous':'Sebelumnya','Next':'Seterusnya','Security':'Keselamatan','Your data':'Data anda'}
  };

  Object.keys(EXTRA_BASIC).forEach(code => Object.assign(COMMON_PHRASES[code] || (COMMON_PHRASES[code] = {}), EXTRA_BASIC[code]));

  const PORTAL_KEYS = [
    'Notification Center','Notifications & privacy','Homework board','Connect catalog','Connect with the course catalog','Browse everything',
    'Billing & certificates','Payment method','No card stored in this demo.','Download my data','Request deletion','Cancel deletion','Checking deletion status...',
    'Weekly progress digest','Live class reminders','Keep profile private','Learning analytics cookies','Functional preference cookies','Notification preferences saved.',
    'Course studio','Revenue pulse','Student questions','Scheduled exams','Payout settings','Messages and notifications','Delivery attempts','Privacy requests',
    'Deployment readiness','Provider status','Platform signals','Background workers','Administrator security','Incident center','Checking worker heartbeat...',
    'Checking administrator MFA status...','Open incident','No messages yet','No delivery attempts','No privacy requests','No exams yet','No private files yet',
    'No marketplace tests yet','course updates suggested'
  ];
  const PORTAL_PACKS = {
    ar:['مركز الإشعارات','الإشعارات والخصوصية','لوحة الواجبات','ربط الكتالوج','الاتصال بكتالوج الدورات','تصفح الكل','الفوترة والشهادات','طريقة الدفع','لا توجد بطاقة محفوظة في هذا العرض.','تنزيل بياناتي','طلب الحذف','إلغاء الحذف','جارٍ فحص حالة الحذف...','ملخص التقدم الأسبوعي','تذكيرات الحصص المباشرة','إبقاء الملف الشخصي خاصاً','ملفات تعريف ارتباط تحليلات التعلم','ملفات تعريف ارتباط التفضيلات الوظيفية','تم حفظ تفضيلات الإشعارات.','استوديو الدورة','نبض الإيرادات','أسئلة الطلاب','الاختبارات المجدولة','إعدادات الدفع','الرسائل والإشعارات','محاولات التسليم','طلبات الخصوصية','جاهزية النشر','حالة المزود','إشارات المنصة','العاملون في الخلفية','أمان المسؤول','مركز الحوادث','جارٍ فحص نبض العامل...','جارٍ فحص حالة MFA للمسؤول...','فتح حادث','لا توجد رسائل بعد','لا توجد محاولات تسليم','لا توجد طلبات خصوصية','لا توجد اختبارات بعد','لا توجد ملفات خاصة بعد','لا توجد اختبارات سوق بعد','تحديثات دورة مقترحة'],
    fa:['مرکز اعلان‌ها','اعلان‌ها و حریم خصوصی','تابلوی تکالیف','اتصال به کاتالوگ','اتصال به کاتالوگ دوره‌ها','مرور همه موارد','صورت‌حساب و گواهینامه‌ها','روش پرداخت','در این نسخه نمایشی کارتی ذخیره نشده است.','دانلود داده‌های من','درخواست حذف','لغو حذف','در حال بررسی وضعیت حذف...','خلاصه پیشرفت هفتگی','یادآوری کلاس زنده','خصوصی نگه داشتن پروفایل','کوکی‌های تحلیل یادگیری','کوکی‌های ترجیح عملکردی','تنظیمات اعلان ذخیره شد.','استودیوی دوره','نبض درآمد','پرسش‌های دانشجویان','آزمون‌های برنامه‌ریزی‌شده','تنظیمات پرداخت','پیام‌ها و اعلان‌ها','تلاش‌های تحویل','درخواست‌های حریم خصوصی','آمادگی استقرار','وضعیت ارائه‌دهنده','سیگنال‌های پلتفرم','پردازش‌های پس‌زمینه','امنیت مدیر','مرکز رخداد','در حال بررسی ضربان پردازشگر...','در حال بررسی وضعیت MFA مدیر...','باز کردن رخداد','هنوز پیامی نیست','تلاش تحویلی وجود ندارد','درخواست حریم خصوصی وجود ندارد','هنوز آزمونی نیست','هنوز فایل خصوصی نیست','هنوز آزمون بازاری نیست','به‌روزرسانی دوره پیشنهاد شده'],
    fr:['Centre de notifications','Notifications et confidentialité','Tableau des devoirs','Connecter le catalogue','Se connecter au catalogue des cours','Tout parcourir','Facturation et certificats','Moyen de paiement','Aucune carte enregistrée dans cette démo.','Télécharger mes données','Demander la suppression','Annuler la suppression','Vérification de l’état de suppression...','Résumé hebdomadaire des progrès','Rappels de cours en direct','Garder le profil privé','Cookies d’analyse d’apprentissage','Cookies de préférences fonctionnelles','Préférences de notification enregistrées.','Studio de cours','Pouls des revenus','Questions des étudiants','Examens planifiés','Paramètres de paiement','Messages et notifications','Tentatives de livraison','Demandes de confidentialité','Préparation au déploiement','État du fournisseur','Signaux de la plateforme','Tâches en arrière-plan','Sécurité administrateur','Centre d’incidents','Vérification du signal des tâches...','Vérification du statut MFA administrateur...','Ouvrir un incident','Aucun message pour le moment','Aucune tentative de livraison','Aucune demande de confidentialité','Aucun examen pour le moment','Aucun fichier privé pour le moment','Aucun test de marché pour le moment','mises à jour de cours suggérées'],
    de:['Benachrichtigungszentrum','Benachrichtigungen und Datenschutz','Aufgabenboard','Katalog verbinden','Mit dem Kurskatalog verbinden','Alles durchsuchen','Abrechnung und Zertifikate','Zahlungsmethode','In dieser Demo ist keine Karte gespeichert.','Meine Daten herunterladen','Löschung anfordern','Löschung abbrechen','Löschstatus wird geprüft...','Wöchentliche Fortschrittsübersicht','Live-Kurs-Erinnerungen','Profil privat halten','Lernanalyse-Cookies','Funktionale Präferenz-Cookies','Benachrichtigungseinstellungen gespeichert.','Kursstudio','Umsatzsignal','Fragen der Lernenden','Geplante Prüfungen','Auszahlungseinstellungen','Nachrichten und Benachrichtigungen','Zustellversuche','Datenschutzanfragen','Bereitstellungsvorbereitung','Anbieterstatus','Plattformsignale','Hintergrundprozesse','Administratorsicherheit','Incident Center','Worker-Heartbeat wird geprüft...','Administrator-MFA wird geprüft...','Incident öffnen','Noch keine Nachrichten','Keine Zustellversuche','Keine Datenschutzanfragen','Noch keine Prüfungen','Noch keine privaten Dateien','Noch keine Marktplatztests','vorgeschlagene Kursaktualisierungen'],
    es:['Centro de notificaciones','Notificaciones y privacidad','Tablero de tareas','Conectar catálogo','Conectar con el catálogo de cursos','Ver todo','Facturación y certificados','Método de pago','No hay tarjeta guardada en esta demo.','Descargar mis datos','Solicitar eliminación','Cancelar eliminación','Comprobando estado de eliminación...','Resumen semanal de progreso','Recordatorios de clases en vivo','Mantener perfil privado','Cookies de analítica de aprendizaje','Cookies funcionales de preferencias','Preferencias de notificación guardadas.','Estudio del curso','Pulso de ingresos','Preguntas de estudiantes','Exámenes programados','Configuración de pagos','Mensajes y notificaciones','Intentos de entrega','Solicitudes de privacidad','Preparación de despliegue','Estado del proveedor','Señales de la plataforma','Procesos en segundo plano','Seguridad del administrador','Centro de incidentes','Comprobando actividad del proceso...','Comprobando MFA del administrador...','Abrir incidente','Aún no hay mensajes','No hay intentos de entrega','No hay solicitudes de privacidad','Aún no hay exámenes','Aún no hay archivos privados','Aún no hay pruebas de mercado','actualizaciones de curso sugeridas'],
    ru:['Центр уведомлений','Уведомления и конфиденциальность','Доска заданий','Подключить каталог','Подключиться к каталогу курсов','Просмотреть всё','Оплата и сертификаты','Способ оплаты','В этой демо-версии карта не сохранена.','Скачать мои данные','Запросить удаление','Отменить удаление','Проверка статуса удаления...','Еженедельная сводка прогресса','Напоминания о живых занятиях','Сделать профиль закрытым','Cookie аналитики обучения','Функциональные cookie настроек','Настройки уведомлений сохранены.','Студия курса','Пульс доходов','Вопросы студентов','Запланированные экзамены','Настройки выплат','Сообщения и уведомления','Попытки доставки','Запросы конфиденциальности','Готовность к развертыванию','Статус провайдера','Сигналы платформы','Фоновые процессы','Безопасность администратора','Центр инцидентов','Проверка heartbeat процесса...','Проверка MFA администратора...','Открыть инцидент','Сообщений пока нет','Попыток доставки нет','Запросов конфиденциальности нет','Экзаменов пока нет','Личных файлов пока нет','Маркетплейс-тестов пока нет','предложенные обновления курса'],
    pt:['Central de notificações','Notificações e privacidade','Quadro de tarefas','Conectar catálogo','Conectar ao catálogo de cursos','Ver tudo','Cobrança e certificados','Método de pagamento','Nenhum cartão salvo nesta demonstração.','Baixar meus dados','Solicitar exclusão','Cancelar exclusão','Verificando status de exclusão...','Resumo semanal de progresso','Lembretes de aulas ao vivo','Manter perfil privado','Cookies de análise de aprendizagem','Cookies funcionais de preferências','Preferências de notificação salvas.','Estúdio do curso','Pulso de receita','Perguntas dos alunos','Exames agendados','Configurações de pagamento','Mensagens e notificações','Tentativas de entrega','Solicitações de privacidade','Prontidão de implantação','Status do provedor','Sinais da plataforma','Processos em segundo plano','Segurança do administrador','Central de incidentes','Verificando heartbeat do processo...','Verificando MFA do administrador...','Abrir incidente','Ainda sem mensagens','Sem tentativas de entrega','Sem solicitações de privacidade','Ainda sem exames','Ainda sem arquivos privados','Ainda sem testes de marketplace','atualizações de curso sugeridas'],
    zh:['通知中心','通知与隐私','作业面板','连接目录','连接课程目录','浏览全部','账单与证书','支付方式','此演示未保存银行卡。','下载我的数据','请求删除','取消删除','正在检查删除状态...','每周进度摘要','直播课程提醒','保持资料私密','学习分析 Cookie','功能偏好 Cookie','通知偏好已保存。','课程工作室','收入脉搏','学生问题','已安排考试','付款设置','消息和通知','投递尝试','隐私请求','部署就绪','服务商状态','平台信号','后台任务','管理员安全','事件中心','正在检查任务心跳...','正在检查管理员 MFA 状态...','打开事件','暂无消息','暂无投递尝试','暂无隐私请求','暂无考试','暂无私密文件','暂无市场测试','建议的课程更新'],
    ja:['通知センター','通知とプライバシー','宿題ボード','カタログを接続','コースカタログに接続','すべて閲覧','請求と証明書','支払い方法','このデモにはカードが保存されていません。','自分のデータをダウンロード','削除をリクエスト','削除をキャンセル','削除状態を確認中...','週間進捗ダイジェスト','ライブ授業リマインダー','プロフィールを非公開にする','学習分析 Cookie','機能設定 Cookie','通知設定を保存しました。','コーススタジオ','収益の動き','学生からの質問','予定済み試験','支払い設定','メッセージと通知','配信試行','プライバシーリクエスト','デプロイ準備','プロバイダー状態','プラットフォーム信号','バックグラウンド処理','管理者セキュリティ','インシデントセンター','ワーカーの状態を確認中...','管理者 MFA 状態を確認中...','インシデントを開く','まだメッセージはありません','配信試行はありません','プライバシーリクエストはありません','まだ試験はありません','まだ非公開ファイルはありません','まだマーケットテストはありません','推奨コース更新'],
    tr:['Bildirim Merkezi','Bildirimler ve gizlilik','Ödev panosu','Kataloğa bağlan','Kurs kataloğuna bağlan','Tümünü görüntüle','Faturalama ve sertifikalar','Ödeme yöntemi','Bu demoda kayıtlı kart yok.','Verilerimi indir','Silme iste','Silmeyi iptal et','Silme durumu kontrol ediliyor...','Haftalık ilerleme özeti','Canlı ders hatırlatmaları','Profili gizli tut','Öğrenme analitiği çerezleri','İşlevsel tercih çerezleri','Bildirim tercihleri kaydedildi.','Kurs stüdyosu','Gelir nabzı','Öğrenci soruları','Planlanmış sınavlar','Ödeme ayarları','Mesajlar ve bildirimler','Teslim denemeleri','Gizlilik talepleri','Yayın hazırlığı','Sağlayıcı durumu','Platform sinyalleri','Arka plan işlemleri','Yönetici güvenliği','Olay merkezi','İşlem kalp atışı kontrol ediliyor...','Yönetici MFA durumu kontrol ediliyor...','Olay aç','Henüz mesaj yok','Teslim denemesi yok','Gizlilik talebi yok','Henüz sınav yok','Henüz özel dosya yok','Henüz pazar testi yok','önerilen kurs güncellemeleri']
  };

  const PORTAL_GENERIC = {
    nl: {'Notification Center':'Meldingscentrum','Notifications & privacy':'Meldingen en privacy','Homework board':'Huiswerkbord','Connect catalog':'Catalogus verbinden','Connect with the course catalog':'Verbinden met de cursuscatalogus','Browse everything':'Alles bekijken','Billing & certificates':'Facturatie en certificaten','Payment method':'Betaalmethode','No card stored in this demo.':'Geen kaart opgeslagen in deze demo.','Download my data':'Mijn gegevens downloaden','Request deletion':'Verwijdering aanvragen','Cancel deletion':'Verwijdering annuleren','Checking deletion status...':'Verwijderstatus controleren...','Weekly progress digest':'Wekelijkse voortgangssamenvatting','Live class reminders':'Herinneringen voor live lessen','Keep profile private':'Profiel privé houden','Messages and notifications':'Berichten en meldingen','Delivery attempts':'Bezorgpogingen','Privacy requests':'Privacyverzoeken','Deployment readiness':'Implementatiegereedheid','Provider status':'Providerstatus','Platform signals':'Platformsignalen','Background workers':'Achtergrondprocessen','Administrator security':'Beheerdersbeveiliging','Incident center':'Incidentcentrum','Open incident':'Incident openen'},
    az: {'Notification Center':'Bildiriş mərkəzi','Notifications & privacy':'Bildirişlər və məxfilik','Homework board':'Tapşırıq lövhəsi','Connect catalog':'Kataloqa qoşul','Connect with the course catalog':'Kurs kataloquna qoşul','Browse everything':'Hamısına bax','Billing & certificates':'Hesablaşma və sertifikatlar','Payment method':'Ödəniş üsulu','No card stored in this demo.':'Bu demoda kart saxlanılmayıb.','Download my data':'Məlumatlarımı endir','Request deletion':'Silinmə tələb et','Cancel deletion':'Silinməni ləğv et','Checking deletion status...':'Silinmə statusu yoxlanılır...','Weekly progress digest':'Həftəlik irəliləyiş xülasəsi','Live class reminders':'Canlı dərs xatırlatmaları','Keep profile private':'Profili gizli saxla','Messages and notifications':'Mesajlar və bildirişlər','Delivery attempts':'Çatdırılma cəhdləri','Privacy requests':'Məxfilik sorğuları','Deployment readiness':'Yerləşdirməyə hazırlıq','Provider status':'Təchizatçı statusu','Platform signals':'Platforma siqnalları','Background workers':'Fon prosesləri','Administrator security':'Administrator təhlükəsizliyi','Incident center':'Hadisə mərkəzi','Open incident':'Hadisə aç'},
    ur: {'Notification Center':'اطلاعاتی مرکز','Notifications & privacy':'اطلاعات اور رازداری','Homework board':'ہوم ورک بورڈ','Connect catalog':'کیٹلاگ سے جوڑیں','Connect with the course catalog':'کورس کیٹلاگ سے جوڑیں','Browse everything':'سب دیکھیں','Billing & certificates':'بلنگ اور سرٹیفکیٹس','Payment method':'ادائیگی کا طریقہ','No card stored in this demo.':'اس ڈیمو میں کوئی کارڈ محفوظ نہیں۔','Download my data':'میرا ڈیٹا ڈاؤن لوڈ کریں','Request deletion':'حذف کی درخواست','Cancel deletion':'حذف منسوخ کریں','Checking deletion status...':'حذف کی حالت چیک ہو رہی ہے...','Weekly progress digest':'ہفتہ وار پیشرفت خلاصہ','Live class reminders':'براہ راست کلاس یاد دہانیاں','Keep profile private':'پروفائل نجی رکھیں','Messages and notifications':'پیغامات اور اطلاعات','Delivery attempts':'ترسیل کی کوششیں','Privacy requests':'رازداری کی درخواستیں','Deployment readiness':'تعیناتی کی تیاری','Provider status':'فراہم کنندہ کی حیثیت','Platform signals':'پلیٹ فارم اشارے','Background workers':'پس منظر عمل','Administrator security':'منتظم سیکیورٹی','Incident center':'واقعہ مرکز','Open incident':'واقعہ کھولیں'},
    pl: {'Notification Center':'Centrum powiadomień','Notifications & privacy':'Powiadomienia i prywatność','Homework board':'Tablica zadań','Connect catalog':'Połącz katalog','Connect with the course catalog':'Połącz z katalogiem kursów','Browse everything':'Przeglądaj wszystko','Billing & certificates':'Rozliczenia i certyfikaty','Payment method':'Metoda płatności','No card stored in this demo.':'W tej wersji demo nie zapisano karty.','Download my data':'Pobierz moje dane','Request deletion':'Poproś o usunięcie','Cancel deletion':'Anuluj usunięcie','Checking deletion status...':'Sprawdzanie statusu usunięcia...','Weekly progress digest':'Tygodniowy skrót postępów','Live class reminders':'Przypomnienia o zajęciach live','Keep profile private':'Zachowaj profil prywatny','Messages and notifications':'Wiadomości i powiadomienia','Delivery attempts':'Próby dostarczenia','Privacy requests':'Żądania prywatności','Deployment readiness':'Gotowość wdrożenia','Provider status':'Status dostawcy','Platform signals':'Sygnały platformy','Background workers':'Procesy w tle','Administrator security':'Bezpieczeństwo administratora','Incident center':'Centrum incydentów','Open incident':'Otwórz incydent'},
    it: {'Notification Center':'Centro notifiche','Notifications & privacy':'Notifiche e privacy','Homework board':'Bacheca compiti','Connect catalog':'Collega catalogo','Connect with the course catalog':'Collegati al catalogo corsi','Browse everything':'Sfoglia tutto','Billing & certificates':'Fatturazione e certificati','Payment method':'Metodo di pagamento','No card stored in this demo.':'Nessuna carta salvata in questa demo.','Download my data':'Scarica i miei dati','Request deletion':'Richiedi eliminazione','Cancel deletion':'Annulla eliminazione','Checking deletion status...':'Controllo stato eliminazione...','Weekly progress digest':'Riepilogo settimanale dei progressi','Live class reminders':'Promemoria lezioni live','Keep profile private':'Mantieni privato il profilo','Messages and notifications':'Messaggi e notifiche','Delivery attempts':'Tentativi di consegna','Privacy requests':'Richieste privacy','Deployment readiness':'Prontezza distribuzione','Provider status':'Stato provider','Platform signals':'Segnali piattaforma','Background workers':'Processi in background','Administrator security':'Sicurezza amministratore','Incident center':'Centro incidenti','Open incident':'Apri incidente'},
    id: {'Notification Center':'Pusat notifikasi','Notifications & privacy':'Notifikasi dan privasi','Homework board':'Papan tugas','Connect catalog':'Hubungkan katalog','Connect with the course catalog':'Hubungkan dengan katalog kursus','Browse everything':'Jelajahi semua','Billing & certificates':'Tagihan dan sertifikat','Payment method':'Metode pembayaran','No card stored in this demo.':'Tidak ada kartu tersimpan di demo ini.','Download my data':'Unduh data saya','Request deletion':'Minta penghapusan','Cancel deletion':'Batalkan penghapusan','Checking deletion status...':'Memeriksa status penghapusan...','Weekly progress digest':'Ringkasan progres mingguan','Live class reminders':'Pengingat kelas langsung','Keep profile private':'Jaga profil tetap privat','Messages and notifications':'Pesan dan notifikasi','Delivery attempts':'Percobaan pengiriman','Privacy requests':'Permintaan privasi','Deployment readiness':'Kesiapan penerapan','Provider status':'Status penyedia','Platform signals':'Sinyal platform','Background workers':'Proses latar belakang','Administrator security':'Keamanan administrator','Incident center':'Pusat insiden','Open incident':'Buka insiden'},
    ko: {'Notification Center':'알림 센터','Notifications & privacy':'알림 및 개인정보','Homework board':'과제 보드','Connect catalog':'카탈로그 연결','Connect with the course catalog':'강좌 카탈로그에 연결','Browse everything':'전체 보기','Billing & certificates':'결제 및 수료증','Payment method':'결제 방법','No card stored in this demo.':'이 데모에는 저장된 카드가 없습니다.','Download my data':'내 데이터 다운로드','Request deletion':'삭제 요청','Cancel deletion':'삭제 취소','Checking deletion status...':'삭제 상태 확인 중...','Weekly progress digest':'주간 진행 요약','Live class reminders':'실시간 수업 알림','Keep profile private':'프로필 비공개 유지','Messages and notifications':'메시지 및 알림','Delivery attempts':'전송 시도','Privacy requests':'개인정보 요청','Deployment readiness':'배포 준비','Provider status':'제공자 상태','Platform signals':'플랫폼 신호','Background workers':'백그라운드 작업','Administrator security':'관리자 보안','Incident center':'인시던트 센터','Open incident':'인시던트 열기'},
    uk: {'Notification Center':'Центр сповіщень','Notifications & privacy':'Сповіщення і приватність','Homework board':'Дошка завдань','Connect catalog':'Підключити каталог','Connect with the course catalog':'Підключитися до каталогу курсів','Browse everything':'Переглянути все','Billing & certificates':'Оплата і сертифікати','Payment method':'Спосіб оплати','No card stored in this demo.':'У цій демо-версії картку не збережено.','Download my data':'Завантажити мої дані','Request deletion':'Запросити видалення','Cancel deletion':'Скасувати видалення','Checking deletion status...':'Перевірка стану видалення...','Weekly progress digest':'Щотижневий підсумок прогресу','Live class reminders':'Нагадування про живі заняття','Keep profile private':'Тримати профіль приватним','Messages and notifications':'Повідомлення та сповіщення','Delivery attempts':'Спроби доставки','Privacy requests':'Запити приватності','Deployment readiness':'Готовність розгортання','Provider status':'Стан провайдера','Platform signals':'Сигнали платформи','Background workers':'Фонові процеси','Administrator security':'Безпека адміністратора','Incident center':'Центр інцидентів','Open incident':'Відкрити інцидент'},
    ro: {'Notification Center':'Centru notificări','Notifications & privacy':'Notificări și confidențialitate','Homework board':'Panou teme','Connect catalog':'Conectează catalogul','Connect with the course catalog':'Conectează-te la catalogul de cursuri','Browse everything':'Răsfoiește tot','Billing & certificates':'Facturare și certificate','Payment method':'Metodă de plată','No card stored in this demo.':'Nu există card salvat în această demonstrație.','Download my data':'Descarcă datele mele','Request deletion':'Solicită ștergerea','Cancel deletion':'Anulează ștergerea','Checking deletion status...':'Se verifică starea ștergerii...','Weekly progress digest':'Rezumat săptămânal al progresului','Live class reminders':'Mementouri pentru cursuri live','Keep profile private':'Păstrează profilul privat','Messages and notifications':'Mesaje și notificări','Delivery attempts':'Încercări de livrare','Privacy requests':'Solicitări de confidențialitate','Deployment readiness':'Pregătire pentru implementare','Provider status':'Stare furnizor','Platform signals':'Semnale platformă','Background workers':'Procese de fundal','Administrator security':'Securitate administrator','Incident center':'Centru incidente','Open incident':'Deschide incident'},
    ms: {'Notification Center':'Pusat pemberitahuan','Notifications & privacy':'Pemberitahuan dan privasi','Homework board':'Papan kerja rumah','Connect catalog':'Sambung katalog','Connect with the course catalog':'Sambung ke katalog kursus','Browse everything':'Lihat semua','Billing & certificates':'Bil dan sijil','Payment method':'Kaedah pembayaran','No card stored in this demo.':'Tiada kad disimpan dalam demo ini.','Download my data':'Muat turun data saya','Request deletion':'Minta pemadaman','Cancel deletion':'Batalkan pemadaman','Checking deletion status...':'Menyemak status pemadaman...','Weekly progress digest':'Ringkasan kemajuan mingguan','Live class reminders':'Peringatan kelas langsung','Keep profile private':'Kekalkan profil peribadi','Messages and notifications':'Mesej dan pemberitahuan','Delivery attempts':'Percubaan penghantaran','Privacy requests':'Permintaan privasi','Deployment readiness':'Kesediaan pelaksanaan','Provider status':'Status penyedia','Platform signals':'Isyarat platform','Background workers':'Proses latar belakang','Administrator security':'Keselamatan pentadbir','Incident center':'Pusat insiden','Open incident':'Buka insiden'}
  };
  Object.keys(PORTAL_GENERIC).forEach(code => {
    PORTAL_PACKS[code] = PORTAL_KEYS.map(key => PORTAL_GENERIC[code][key] || key);
  });
  Object.keys(PORTAL_PACKS).forEach(code => {
    const table = COMMON_PHRASES[code] || (COMMON_PHRASES[code] = {});
    PORTAL_KEYS.forEach((key,index) => {
      if(PORTAL_PACKS[code][index]) table[key] = PORTAL_PACKS[code][index];
    });
  });

  function norm(value){
    return String(value || '').replace(/\s+/g,' ').trim();
  }

  function lang(){
    return window.OdysseyI18n && typeof window.OdysseyI18n.getLang === 'function'
      ? window.OdysseyI18n.getLang()
      : (localStorage.getItem('odyssey_lang') || 'en');
  }

  let internalRefresh = false;

  function patchDictionary(){
    const dict = window.OdysseyI18n && window.OdysseyI18n.DICT;
    if(!dict || dict.__odysseyCompletionPatched) return false;
    Object.keys(dict).forEach(code => {
      const table = dict[code] || {};
      Object.keys(FOOTER_ALIASES).forEach(to => {
        const from = FOOTER_ALIASES[to];
        if(table[to] === undefined && table[from] !== undefined) table[to] = table[from];
      });
      if(!table.dir) table.dir = RTL.has(code) ? 'rtl' : 'ltr';
      const phrases = COMMON_PHRASES[code] || {};
      Object.keys(phrases).forEach(text => {
        const key = 'phrase_' + text.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
        if(table[key] === undefined) table[key] = phrases[text];
        if(dict.en && dict.en[key] === undefined) dict.en[key] = text;
      });
    });
    dict.__odysseyCompletionPatched = true;
    return true;
  }

  let valueIndex = null;
  let reverseValueIndex = null;
  function buildValueIndex(){
    const dict = window.OdysseyI18n && window.OdysseyI18n.DICT;
    if(!dict || !dict.en) return new Map();
    const index = new Map();
    Object.keys(dict.en).forEach(key => {
      const value = dict.en[key];
      if(typeof value !== 'string') return;
      const n = norm(value);
      if(n && !index.has(n)) index.set(n,key);
    });
    return index;
  }

  function buildReverseValueIndex(){
    const dict = window.OdysseyI18n && window.OdysseyI18n.DICT;
    const index = new Map();
    function add(value, source){
      const n = norm(value);
      const s = norm(source);
      if(n && s && !index.has(n)) index.set(n, s);
    }
    if(dict && dict.en){
      Object.keys(dict.en).forEach(key => {
        if(typeof dict.en[key] !== 'string') return;
        const english = dict.en[key];
        add(english, english);
        Object.keys(dict).forEach(code => {
          if(code === 'en' || !dict[code] || typeof dict[code][key] !== 'string') return;
          add(dict[code][key], english);
        });
      });
    }
    Object.keys(COMMON_PHRASES).forEach(code => {
      Object.keys(COMMON_PHRASES[code] || {}).forEach(english => {
        add(english, english);
        add(COMMON_PHRASES[code][english], english);
      });
    });
    return index;
  }

  function sourceTextFor(value, previousSource){
    const n = norm(value);
    if(!n) return previousSource || value;
    if(!reverseValueIndex) reverseValueIndex = buildReverseValueIndex();
    return reverseValueIndex.get(n) || previousSource || value;
  }

  function translateText(value){
    const original = norm(value);
    if(!original) return null;
    const code = lang();
    if(code === 'en') return value;
    if(window.OdysseyPortalT){
      const portal = window.OdysseyPortalT(original);
      if(portal && portal !== original) return portal;
    }
    const common = COMMON_PHRASES[code] && COMMON_PHRASES[code][original];
    if(common) return common;
    const dict = window.OdysseyI18n && window.OdysseyI18n.DICT;
    if(!dict) return null;
    if(!valueIndex) valueIndex = buildValueIndex();
    const key = valueIndex.get(original);
    if(key && dict[code] && typeof dict[code][key] === 'string') return dict[code][key];
    const phrases = COMMON_PHRASES[code] || {};
    let replaced = original;
    Object.keys(phrases)
      .filter(text => text.length > 4 && original.includes(text))
      .sort((a,b) => b.length - a.length)
      .forEach(text => { replaced = replaced.split(text).join(phrases[text]); });
    if(replaced !== original) return replaced;
    return null;
  }

  function applyPlainTextTranslations(){
    const patched = patchDictionary();
    if(patched && window.OdysseyI18n && typeof window.OdysseyI18n.applyTranslations === 'function'){
      internalRefresh = true;
      window.OdysseyI18n.applyTranslations();
      internalRefresh = false;
    }
    const code = lang();
    document.documentElement.lang = code;
    document.documentElement.dir = RTL.has(code) ? 'rtl' : 'ltr';
    if(document.body) document.body.dir = document.documentElement.dir;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node){
        const parent = node.parentElement;
        if(!parent || /^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION|CODE|PRE|SVG)$/.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if(parent.closest('.i18n-switcher,[data-no-auto-i18n]')) return NodeFilter.FILTER_REJECT;
        if(parent.closest('.categories,.regions')) return NodeFilter.FILTER_REJECT;
        const text = norm(node.nodeValue);
        if(!text) return NodeFilter.FILTER_REJECT;
        if(!/[A-Za-z]/.test(text) && node.__odysseyOriginalText === undefined){
          if(!reverseValueIndex) reverseValueIndex = buildReverseValueIndex();
          if(!reverseValueIndex.has(text)) return NodeFilter.FILTER_REJECT;
        }
        if(/^[A-Z]{1,6}$/.test(text) || /^[\d\s.,:+/%-]+$/.test(text)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const source = sourceTextFor(node.nodeValue, node.__odysseyOriginalText);
      node.__odysseyOriginalText = source;
      const translated = translateText(source);
      node.nodeValue = translated || source;
    });

    document.querySelectorAll('[placeholder],[title],[aria-label],input[type="button"],input[type="submit"]').forEach(el => {
      ['placeholder','title','aria-label','value'].forEach(attr => {
        if(!el.hasAttribute(attr)) return;
        const dataName = 'odysseyCompletion' + attr.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
        el.dataset[dataName] = sourceTextFor(el.getAttribute(attr), el.dataset[dataName]);
        const translated = translateText(el.dataset[dataName]);
        el.setAttribute(attr, translated || el.dataset[dataName]);
      });
    });
  }

  let queued = false;
  function queue(){
    if(queued) return;
    queued = true;
    setTimeout(() => {
      queued = false;
      valueIndex = null;
      reverseValueIndex = null;
      applyPlainTextTranslations();
    }, 50);
  }

  document.addEventListener('DOMContentLoaded', () => {
    queue();
    if(!window.__odysseyCompletionObserver){
      window.__odysseyCompletionObserver = new MutationObserver(mutations => {
        if(mutations.some(m => m.addedNodes && m.addedNodes.length)) queue();
      });
      window.__odysseyCompletionObserver.observe(document.body,{childList:true,subtree:true});
    }
  });
  document.addEventListener('odyssey:languageChanged', () => { if(!internalRefresh) queue(); });
  if(document.readyState !== 'loading') queue();
})();
