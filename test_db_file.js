const url = "https://bdaqtpyzqutelkdgcoex.supabase.co/rest/v1/files?gallery_id=eq.7ce795e8-f0a5-46e0-82d5-80e9d2319ac8&select=file_url&limit=1&order=expires_at.asc";
const key = "sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib";
fetch(url, { headers: { apikey: key, Authorization: "Bearer " + key } })
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
