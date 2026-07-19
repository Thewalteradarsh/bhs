const fs = require('fs');
const html = fs.readFileSync('spotify.html', 'utf8');

const regex = /<meta content="([^"]+)" property="twitter:title"/g;
let match = regex.exec(html);
console.log(match);
