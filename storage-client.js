(function () {
  async function jsonRequest(path, options) {
    const response = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options && options.headers) },
      ...options
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const error = new Error(payload.error || 'Storage request failed.');
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  async function checksumSha256(file) {
    if (!window.crypto || !window.crypto.subtle) return '';
    const digest = await window.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
  }

  async function uploadFile(file, input) {
    if (!file) throw new Error('Choose a file first.');
    const grant = await jsonRequest('/api/storage/upload-grants', {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size
      })
    });
    if (grant.upload.provider !== 'demo') {
      const response = await fetch(grant.upload.url, {
        method: grant.upload.method || 'PUT',
        headers: grant.upload.headers || {},
        body: file
      });
      if (!response.ok) throw new Error(`Storage provider rejected the upload (${response.status}).`);
    }
    const object = await jsonRequest(`/api/storage/objects/${encodeURIComponent(grant.object.id)}/complete`, {
      method: 'POST',
      body: JSON.stringify({
        sizeBytes: file.size,
        checksumSha256: await checksumSha256(file)
      })
    });
    return object.object;
  }

  async function listObjects() {
    return jsonRequest('/api/storage/objects').then(result => result.objects || []);
  }

  async function downloadObject(objectId) {
    const grant = await jsonRequest(`/api/storage/objects/${encodeURIComponent(objectId)}/download-grant`, {
      method: 'POST',
      body: '{}'
    });
    if (grant.download.provider === 'demo') return grant;
    window.location.assign(grant.download.url);
    return grant;
  }

  window.OdysseyStorage = { uploadFile, listObjects, downloadObject };
}());
