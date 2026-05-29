async function test() {
   const res = await fetch('http://localhost:3000/api/analytics/track', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ galleryId: 'test-id', event: 'view' })
   });
   console.log("Track status:", res.status);
   console.log("Track output:", await res.text());

   const res2 = await fetch('http://localhost:3000/api/analytics');
   console.log("Analytics output:", await res2.text());
}
test();
