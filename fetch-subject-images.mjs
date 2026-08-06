/**
 * One-time script: downloads one relevant, freely-licensed photo per
 * discipline card and saves it into assets/subjects/, sized and compressed
 * for web use. Run this once (or whenever you add a new subject) — the
 * site itself never calls Unsplash at runtime, so there's zero extra
 * weight or dependency on Unsplash's uptime for your actual visitors.
 *
 * 1. Get a free key: https://unsplash.com/developers → "New Application"
 *    (the free "Demo" tier allows 50 requests/hour, which easily covers
 *    this one-off run of 45 subjects).
 * 2. UNSPLASH_ACCESS_KEY=tKLJxxwAjViOlvKUgZxPml79gBwDmalMQy6jW3qQNvQ node fetch-subject-images.mjs
 * 3. Commit the resulting assets/subjects/*.jpg files to your repo.
 *
 * Uses the official /search/photos endpoint (JSON, stable, licensed) —
 * not scraped HTML — so results are accurate and won't break if Unsplash
 * changes their page markup.
 */
import fs from 'fs';
import path from 'path';

const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
if (!ACCESS_KEY) {
  console.error('Set UNSPLASH_ACCESS_KEY first — see the comment at the top of this file.');
  process.exit(1);
}

// slug → search query. Edit the query side any time you want a different
// photo for a subject; re-run the script to refresh just that one image
// (delete its file first, or add a --force flag if you prefer).
const SUBJECTS = {
  'calculus': 'calculus mathematics blackboard',
  'trigonometry': 'trigonometry math student',
  'algebra-and-statistics': 'algebra statistics classroom',
  'geometry': 'geometry shapes drawing',
  'physics': 'physics classroom experiment',
  'chemistry': 'chemistry lab student',
  'biology': 'biology microscope student',
  'earth-sciences': 'earth science geology field',
  'language-and-literature': 'literature books reading',
  'history': 'history classroom books',
  'economics': 'economics graph chart',
  'social-studies-and-civics': 'civics government classroom',
  'computer-science-hs': 'student coding laptop',
  'foreign-languages': 'language learning flashcards',
  'medicine-mbbsmd': 'medical student stethoscope',
  'dentistry': 'dentist dental clinic',
  'veterinary-science': 'veterinarian animal care',
  'pharmacy-and-nursing': 'pharmacy nurse medicine',
  'electrical-engineering': 'electrical engineering circuit',
  'civil-and-structural': 'civil engineering construction',
  'mechanical-engineering': 'mechanical engineering workshop',
  'chemical-engineering': 'chemical engineering plant',
  'law-and-governance': 'law books gavel',
  'philosophy': 'philosophy books thinking',
  'linguistics': 'linguistics language study',
  'economics-and-finance': 'finance business chart',
  'psychology-and-neuroscience': 'psychology brain study',
  'architecture-and-urban-design': 'architecture design blueprint',
  'business-and-management': 'business meeting management',
  'international-relations': 'international relations diplomacy',
  'tailoring-and-fashion': 'tailoring fashion sewing',
  'fine-arts-and-drawing': 'fine art drawing sketch',
  'calligraphy-and-typography': 'calligraphy typography hand lettering',
  'photography-and-videography': 'photography camera videography',
  'music-and-instruments': 'music instrument practice',
  'dance-and-movement': 'dance movement studio',
  'theatre-and-acting': 'theatre acting stage',
  'culinary-arts-and-baking': 'culinary baking kitchen',
  'agriculture-and-planting': 'agriculture farming planting',
  'diy-crafts-and-woodwork': 'woodwork craft workshop',
  'beauty-wellness-and-fitness': 'wellness fitness beauty',
  'coding-and-programming': 'programming code screen',
  'app-and-web-design': 'web design ui screen',
  'ai-and-data-science': 'data science ai visualization',
  'digital-content-and-marketing': 'digital marketing content creator',
};

const OUT_DIR = path.join(process.cwd(), 'assets', 'subjects');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function fetchOne(slug, query) {
  const outFile = path.join(OUT_DIR, `${slug}.jpg`);
  if (fs.existsSync(outFile)) { console.log('skip (exists):', slug); return; }

  const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
  const res = await fetch(searchUrl, { headers: { Authorization: `Client-ID ${ACCESS_KEY}` } });
  if (!res.ok) { console.error('search failed:', slug, res.status); return; }
  const json = await res.json();
  const photo = json.results?.[0];
  if (!photo) { console.warn('no result for:', slug, query); return; }

  // 480px wide is plenty for a card thumbnail — keeps downloads small.
  const imgUrl = `${photo.urls.raw}&w=480&h=320&fit=crop&auto=format&q=70`;
  const imgRes = await fetch(imgUrl);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  fs.writeFileSync(outFile, buf);
  console.log('saved:', slug, `(${(buf.length/1024).toFixed(0)}KB, photo by ${photo.user.name} on Unsplash)`);
}

for (const [slug, query] of Object.entries(SUBJECTS)) {
  await fetchOne(slug, query);
  await new Promise(r => setTimeout(r, 250)); // stay well under the rate limit
}
console.log('Done. Images are in assets/subjects/');
