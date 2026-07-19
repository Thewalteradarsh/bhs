import fs from 'fs';
fetch('https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M').then(r=>r.text()).then(html => {
    fs.writeFileSync('embed.html', html);
    const regex = /"name":"([^"]+)","artists":\[{"name":"([^"]+)"/g;
    let match;
    let count = 0;
    while((match = regex.exec(html)) !== null && count < 5) {
        console.log(match[1] + ' - ' + match[2]);
        count++;
    }
});
