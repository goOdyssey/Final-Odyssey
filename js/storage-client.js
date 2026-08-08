(function () {
  // Rewritten to call the real "storage-api" Supabase Edge Function instead of
  // a /api/storage/* backend that never existed. Function names and signatures
  // (uploadFile, listObjects, downloadObject) are unchanged, so
  // student_portal.html and instructor_portal.html need no changes at all.

  function functionUrl(){
    const cfg = window.ODYSSEY_SUPABASE || {};
    if (!cfg.url) return null;
    return `${cfg.url.replace(/\/$/, '')}/functions/v1/storage-api`;
  }

  async function callStorageApi(action, payload){
    if (!window.OdysseySupabase?.isConfigured?.()) {
      throw new Error('Sign in through Odyssey to use file storage.');
    }
    const sb = await OdysseySupabase.client();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Sign in to use file storage.');
    const url = functionUrl();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: window.ODYSSEY_SUPABASE.anonKey
      },
      body: JSON.stringify({ action, ...payload })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || 'Storage request failed.');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function checksumSha256(file) {
    if (!window.crypto || !window.crypto.subtle) return '';
    const digest = await window.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
  }

  async function uploadFile(file, input) {
    if (!file) throw new Error('Choose a file first.');
    const grant = await callStorageApi('upload-grant', {
      ...input,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size
    });
    const uploadResponse = await fetch(grant.upload.url, {
      method: grant.upload.method || 'PUT',
      headers: grant.upload.headers || {},
      body: file
    });
    if (!uploadResponse.ok) throw new Error(`Storage provider rejected the upload (${uploadResponse.status}).`);
    const completed = await callStorageApi('complete', {
      objectId: grant.object.id,
      sizeBytes: file.size,
      checksumSha256: await checksumSha256(file)
    });
    return completed.object;
  }

  async function listObjects() {
    const result = await callStorageApi('list', {});
    return result.objects || [];
  }

  async function downloadObject(objectId) {
    const grant = await callStorageApi('download-grant', { objectId });
    window.location.assign(grant.download.url);
    return grant;
  }

  window.OdysseyStorage = { uploadFile, listObjects, downloadObject };
}());
