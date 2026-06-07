/**
 * Upload a File/Blob straight to object storage via a presigned PUT URL.
 *
 * Mirrors the thumbnail upload flow: ask the API for a presigned URL + key, PUT the bytes
 * directly to storage (bypassing our server), then return the key to persist on the resource.
 *
 * @param {File|Blob} file
 * @param {() => Promise<{ data: { upload_url: string, key: string } }>} requestUploadUrl
 *        An API call (axios) that returns the presigned URL and storage key.
 * @returns {Promise<string>} the storage key to send back to the API.
 */
export async function uploadToStorage(file, requestUploadUrl) {
  const { data: { upload_url, key } } = await requestUploadUrl()
  const res = await fetch(upload_url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  })
  if (!res.ok) throw new Error(`Upload failed (${res.status})`)
  return key
}
