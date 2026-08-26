import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'odyssey-private';
const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
const DOWNLOAD_URL_TTL_SECONDS = 15 * 60;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function toCamelObject(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    originalFilename: row.original_filename,
    purpose: row.purpose,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    status: row.status,
    publicRead: row.public_read,
    scanStatus: row.scan_status,
    createdAt: row.created_at,
    uploadedAt: row.uploaded_at,
  };
}

function sanitizeFilename(name: string) {
  return String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-140);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') || '';
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: authData, error: authError } = await callerClient.auth.getUser();
  if (authError || !authData?.user) return json({ error: 'Not authenticated' }, 401);
  const userId = authData.user.id;

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  const action = body.action;

  try {
    if (action === 'upload-grant') {
      const filename = sanitizeFilename(body.filename);
      const contentType = body.contentType || 'application/octet-stream';
      const sizeBytes = Number(body.sizeBytes || 0);
      const purpose = String(body.purpose || 'other');
      if (!filename) return json({ error: 'filename is required' }, 400);
      if (sizeBytes <= 0 || sizeBytes > MAX_SIZE_BYTES) return json({ error: `File must be between 1 byte and ${MAX_SIZE_BYTES / 1024 / 1024}MB` }, 400);

      const objectKey = `${userId}/${crypto.randomUUID()}-${filename}`;

      const { data: row, error: insertError } = await callerClient.from('storage_objects').insert({
        owner_user_id: userId,
        course_id: body.courseId || null,
        exam_id: body.examId || null,
        certificate_id: body.certificateId || null,
        purpose,
        provider: 'supabase',
        bucket: BUCKET,
        object_key: objectKey,
        original_filename: filename,
        content_type: contentType,
        size_bytes: sizeBytes,
        status: 'pending',
        public_read: !!body.publicRead,
      }).select('*').single();
      if (insertError) throw insertError;

      const { data: signed, error: signError } = await serviceClient.storage.from(BUCKET).createSignedUploadUrl(objectKey);
      if (signError) throw signError;

      return json({
        object: { id: row.id },
        upload: { provider: 'supabase', url: signed.signedUrl, method: 'PUT', headers: { 'Content-Type': contentType } },
      });
    }

    if (action === 'complete') {
      const objectId = body.objectId;
      if (!objectId) return json({ error: 'objectId is required' }, 400);
      const { data: row, error: updateError } = await callerClient.from('storage_objects')
        .update({
          status: 'ready',
          size_bytes: Number(body.sizeBytes || 0),
          checksum_sha256: body.checksumSha256 || null,
          uploaded_at: new Date().toISOString(),
          scan_status: 'clean',
        })
        .eq('id', objectId)
        .select('*').maybeSingle();
      if (updateError) throw updateError;
      if (!row) return json({ error: 'Object not found or not owned by you' }, 404);
      return json({ object: toCamelObject(row) });
    }

    if (action === 'list') {
      const { data: rows, error: listError } = await callerClient.from('storage_objects')
        .select('*').eq('owner_user_id', userId).order('created_at', { ascending: false });
      if (listError) throw listError;
      return json({ objects: (rows || []).map(toCamelObject) });
    }

    if (action === 'download-grant') {
      const objectId = body.objectId;
      if (!objectId) return json({ error: 'objectId is required' }, 400);
      const { data: row, error: selectError } = await callerClient.from('storage_objects')
        .select('*').eq('id', objectId).maybeSingle();
      if (selectError) throw selectError;
      if (!row) return json({ error: 'Object not found or access denied' }, 404);

      const { data: signed, error: signError } = await serviceClient.storage.from(BUCKET)
        .createSignedUrl(row.object_key, DOWNLOAD_URL_TTL_SECONDS);
      if (signError) throw signError;

      await serviceClient.from('storage_access_grants').insert({
        object_id: row.id,
        user_id: userId,
        grant_type: 'download',
        token_hash: await sha256Hex(signed.signedUrl),
        expires_at: new Date(Date.now() + DOWNLOAD_URL_TTL_SECONDS * 1000).toISOString(),
      });

      return json({ download: { provider: 'supabase', url: signed.signedUrl } });
    }

    if (action === 'clone') {
      const objectId = body.objectId;
      const purpose = String(body.purpose || 'other');
      if (!objectId) return json({ error: 'objectId is required' }, 400);
      if (!purpose) return json({ error: 'purpose is required' }, 400);

      const { data: source, error: sourceError } = await callerClient.from('storage_objects')
        .select('*').eq('id', objectId).maybeSingle();
      if (sourceError) throw sourceError;
      if (!source) return json({ error: 'Object not found or access denied' }, 404);
      if (source.owner_user_id !== userId) return json({ error: 'Only the owner can clone this file' }, 403);
      if (source.status !== 'ready') return json({ error: 'Only a ready object can be cloned' }, 409);

      const clonedKey = `${userId}/${crypto.randomUUID()}-${sanitizeFilename(source.original_filename || 'file')}`;
      const { error: copyError } = await serviceClient.storage.from(BUCKET).copy(source.object_key, clonedKey);
      if (copyError) throw copyError;

      const { data: row, error: insertError } = await callerClient.from('storage_objects').insert({
        owner_user_id: userId,
        course_id: source.course_id || null,
        exam_id: source.exam_id || null,
        certificate_id: source.certificate_id || null,
        purpose,
        provider: source.provider || 'supabase',
        bucket: BUCKET,
        object_key: clonedKey,
        original_filename: source.original_filename || 'file',
        content_type: source.content_type || 'application/octet-stream',
        size_bytes: source.size_bytes || 0,
        status: 'ready',
        public_read: !!body.publicRead,
        checksum_sha256: source.checksum_sha256 || null,
        uploaded_at: new Date().toISOString(),
        scan_status: 'clean',
      }).select('*').single();
      if (insertError) {
        await serviceClient.storage.from(BUCKET).remove([clonedKey]).catch(() => {});
        throw insertError;
      }
      return json({ object: toCamelObject(row) });
    }

    if (action === 'delete') {
      const objectId = body.objectId;
      if (!objectId) return json({ error: 'objectId is required' }, 400);
      // Select through callerClient first so RLS decides whether this person can
      // even see this object (owner or admin) before anything gets deleted.
      const { data: row, error: selectError } = await callerClient.from('storage_objects')
        .select('*').eq('id', objectId).maybeSingle();
      if (selectError) throw selectError;
      if (!row) return json({ error: 'Object not found or access denied' }, 404);
      if (row.owner_user_id !== userId) return json({ error: 'Only the owner can delete this file' }, 403);

      const { error: removeError } = await serviceClient.storage.from(BUCKET).remove([row.object_key]);
      if (removeError) console.warn('Storage removal warning (continuing to delete metadata row):', removeError);

      const { error: deleteRowError } = await callerClient.from('storage_objects').delete().eq('id', objectId);
      if (deleteRowError) throw deleteRowError;

      return json({ ok: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error: any) {
    console.error('storage-api error:', error);
    return json({ error: error?.message || 'Storage request failed.' }, 500);
  }
});

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
