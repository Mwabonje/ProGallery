const fs = require('fs');
fetch("https://bdaqtpyzqutelkdgcoex.supabase.co/rest/v1/galleries?limit=1", {
    headers: { "apikey": "sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib" }
}).then(r => r.json()).then(data => {
    console.log(Object.keys(data[0]));
});
