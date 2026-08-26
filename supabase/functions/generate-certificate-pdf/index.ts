import { createClient } from 'jsr:@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb, degrees } from 'npm:pdf-lib@1.17.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'odyssey-certificates';
const STANDARD_PASS_THRESHOLD = 70; // No per-exam threshold is stored yet; this is Odyssey's stated standard.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function studentIdLabel(memberCode: string | null | undefined) { return String(memberCode || 'UNASSIGNED'); }

async function buildCertificatePdf(cert: any, examLines: string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]); // A4 landscape
  const { width, height } = page.getSize();

  const serif = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const navy = rgb(0.078, 0.173, 0.310);   // #142C4F
  const gold = rgb(0.753, 0.541, 0.243);   // #C08A3E
  const ink = rgb(0.078, 0.11, 0.169);
  const muted = rgb(0.392, 0.439, 0.541);
  const cream = rgb(0.984, 0.976, 0.961);  // #FBF9F5
  const creamGold = rgb(0.965, 0.937, 0.878); // #F6EFE0

  // Subtle vertical gradient background (cream -> faint gold), built from thin
  // interpolated bands rather than a single flat fill. Kept gentle on purpose.
  const bands = 40;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const r = cream.red + (creamGold.red - cream.red) * t;
    const g = cream.green + (creamGold.green - cream.green) * t;
    const b = cream.blue + (creamGold.blue - cream.blue) * t;
    page.drawRectangle({ x: 0, y: (height / bands) * i, width, height: height / bands + 1, color: rgb(r, g, b) });
  }

  // Faint corner flourishes (quarter-circle arcs suggested via nested circles clipped by the border).
  const cornerRadius = 70;
  const corners: [number, number][] = [[38, height - 38], [width - 38, height - 38], [38, 38], [width - 38, 38]];
  for (const [cx, cy] of corners) {
    page.drawCircle({ x: cx, y: cy, size: cornerRadius, borderColor: rgb(0.90, 0.85, 0.73), borderWidth: 0.75, opacity: 0.5 });
  }

  // Faint rotated watermark behind the main content.
  const wmSize = 64;
  const wmText = 'ODYSSEY';
  const wmWidth = serif.widthOfTextAtSize(wmText, wmSize);
  page.drawText(wmText, {
    x: width / 2 - wmWidth / 2, y: height / 2 - 20, size: wmSize, font: serif,
    color: rgb(0.906, 0.859, 0.769), rotate: degrees(0), opacity: 0.35,
  });

  // Decorative border
  page.drawRectangle({ x: 18, y: 18, width: width - 36, height: height - 36, borderColor: gold, borderWidth: 2.5 });
  page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, borderColor: navy, borderWidth: 1 });

  const centerText = (text: string, y: number, font: any, size: number, color = ink) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - w) / 2, y, size, font, color });
  };

  // Student ID - placeholder position/format; the person building this told me
  // they'll design the final look of this field themselves later.
  page.drawText(`Student ID: ${studentIdLabel(cert.member_code)}`, {
    x: 45, y: height - 45, size: 9, font: sansBold, color: navy,
  });

  centerText('IN GOD WE TRUST', height - 70, sans, 9, muted);
  centerText('ODYSSEY', height - 100, serif, 30, navy);
  centerText('Certificate of Completion', height - 130, serifItalic, 18, gold);

  centerText('This certifies that', height - 175, sans, 12, muted);
  centerText(cert.student_name || 'Odyssey Student', height - 210, serif, 26, ink);

  centerText('has successfully completed the course', height - 245, sans, 12, muted);
  centerText(cert.course_title || 'Untitled Course', height - 278, sansBold, 18, navy);

  const completedDate = cert.completed_at ? new Date(cert.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  centerText(`Completed on ${completedDate}`, height - 305, sans, 11, muted);

  // Extra detail block, in front of the signature area, per request.
  const startedDate = cert.course_started_at ? new Date(cert.course_started_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
  const institutionLine = `Institution: ${cert.institution_name || 'Odyssey'}     ·     Course start: ${startedDate}`;
  centerText(institutionLine, height - 340, sans, 9.5, ink);

  const examLine = examLines.length ? examLines.join('   ·   ') : `Required exam(s): course assessment     ·     Passing threshold: ${STANDARD_PASS_THRESHOLD}%`;
  centerText(examLine, height - 356, sans, 9, muted);

  // Seal
  const sealX = width - 150, sealY = 110;
  page.drawCircle({ x: sealX, y: sealY, size: 42, borderColor: gold, borderWidth: 2, color: rgb(0.98, 0.96, 0.92) });
  page.drawCircle({ x: sealX, y: sealY, size: 32, borderColor: gold, borderWidth: 1 });
  const sealText = 'ODYSSEY';
  const sealW = sans.widthOfTextAtSize(sealText, 7);
  page.drawText(sealText, { x: sealX - sealW / 2, y: sealY + 3, size: 7, font: sansBold, color: gold });
  const sealText2 = 'VERIFIED';
  const sealW2 = sans.widthOfTextAtSize(sealText2, 6);
  page.drawText(sealText2, { x: sealX - sealW2 / 2, y: sealY - 8, size: 6, font: sans, color: gold });

  // Signature block
  const sigX = 140, sigY = 118;
  page.drawLine({ start: { x: sigX - 90, y: sigY }, end: { x: sigX + 90, y: sigY }, thickness: 1, color: muted });
  const instructorLine = cert.instructor_name || 'Odyssey Instructor';
  const instrW = serifItalic.widthOfTextAtSize(instructorLine, 14);
  page.drawText(instructorLine, { x: sigX - instrW / 2, y: sigY + 6, size: 14, font: serifItalic, color: ink });
  const posLine = cert.instructor_position || 'Course Instructor';
  const posW = sans.widthOfTextAtSize(posLine, 9);
  page.drawText(posLine, { x: sigX - posW / 2, y: sigY - 14, size: 9, font: sans, color: muted });

  // Verification footer
  const verifyLine = `Verification code: ${cert.verification_code}`;
  const verifyW = sans.widthOfTextAtSize(verifyLine, 10);
  page.drawText(verifyLine, { x: (width - verifyW) / 2, y: 55, size: 10, font: sansBold, color: navy });
  const instText = cert.institution_name ? `Issued by ${cert.institution_name} via Odyssey` : 'Issued by Odyssey';
  const instW = sans.widthOfTextAtSize(instText, 8);
  page.drawText(instText, { x: (width - instW) / 2, y: 42, size: 8, font: sans, color: muted });

  return doc.save();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') || '';
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: authData, error: authError } = await callerClient.auth.getUser();
  if (authError || !authData?.user) return json({ error: 'Not authenticated' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  const certificateId = body.certificateId;
  const forceRegenerate = !!body.forceRegenerate;
  if (!certificateId) return json({ error: 'certificateId is required' }, 400);

  const { data: cert, error: certError } = await callerClient.from('certificates')
    .select('*').eq('id', certificateId).maybeSingle();
  if (certError) return json({ error: certError.message }, 500);
  if (!cert) return json({ error: 'Certificate not found or access denied' }, 404);

  if (cert.pdf_storage_key && !forceRegenerate) {
    const { data: signed, error: signErr } = await serviceClient.storage.from(BUCKET)
      .createSignedUrl(cert.pdf_storage_key, 60 * 15);
    if (!signErr && signed) return json({ downloadUrl: signed.signedUrl, cached: true });
  }

  const jobInsert = await serviceClient.from('certificate_pdf_jobs')
    .insert({ certificate_id: certificateId, status: 'processing' }).select('id').single();

  try {
    let examLines: string[] = [];
    if (cert.course_id) {
      const studentUid = cert.student_user_id || cert.student_id;
      const { data: attempts } = await serviceClient
        .from('exam_attempts')
        .select('score_percent, status, exams(title, course_id)')
        .eq('student_user_id', studentUid)
        .limit(4);
      const relevant = (attempts || []).filter((a: any) => a.exams?.course_id === cert.course_id);
      if (relevant.length) {
        examLines = relevant.map((a: any) =>
          `${a.exams?.title || 'Exam'}: ${a.score_percent ?? '—'}% (pass ${STANDARD_PASS_THRESHOLD}%)`
        );
      }
    }

    const pdfBytes = await buildCertificatePdf(cert, examLines);
    const storageKey = `${cert.student_user_id || cert.student_id || 'unknown'}/${certificateId}.pdf`;

    const { error: uploadError } = await serviceClient.storage.from(BUCKET)
      .upload(storageKey, pdfBytes, { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw uploadError;

    await serviceClient.from('certificates').update({ pdf_storage_key: storageKey }).eq('id', certificateId);
    if (jobInsert.data) {
      await serviceClient.from('certificate_pdf_jobs').update({ status: 'completed', storage_key: storageKey }).eq('id', jobInsert.data.id);
    }

    const { data: signed, error: signErr } = await serviceClient.storage.from(BUCKET)
      .createSignedUrl(storageKey, 60 * 15);
    if (signErr) throw signErr;

    return json({ downloadUrl: signed.signedUrl, cached: false });
  } catch (error: any) {
    console.error('generate-certificate-pdf error:', error);
    if (jobInsert.data) {
      await serviceClient.from('certificate_pdf_jobs').update({ status: 'failed', error_message: String(error?.message || error) }).eq('id', jobInsert.data.id);
    }
    return json({ error: error?.message || 'Could not generate certificate PDF.' }, 500);
  }
});
