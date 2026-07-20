const url = "https://bdaqtpyzqutelkdgcoex.supabase.co/rest/v1/galleries?select=*&limit=1";
const key = "sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib";
fetch(url, { headers: { apikey: key, Authorization: "Bearer " + key } })
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
