import fs from 'fs';
const html = fs.readFileSync('embed.html', 'utf8');
const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/);
if (match) {
    const data = JSON.parse(match[1]);
    try {
        const tracks = data.props.pageProps.state.data.entity.trackList.map(t => t.title + ' - ' + t.subtitle);
        console.log(tracks.slice(0, 5).join('\n'));
    } catch (e) {
        console.log(Object.keys(data.props.pageProps.state.data.entity));
    }
} else {
    console.log('no next data');
}
