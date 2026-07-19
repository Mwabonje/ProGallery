const html = `<meta property="og:title" content="Mwabonje - Client Galleries & Portfolio" />`;
console.log(html.replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="TEST" />`));
