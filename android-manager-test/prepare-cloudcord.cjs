// Mechanical rebranding of UI strings only. Preserve contributor attribution.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, 'app/src/main/res');
for (const dir of fs.readdirSync(root).filter(n => n.startsWith('values'))) {
    const file = path.join(root, dir, 'strings.xml');
    if (!fs.existsSync(file)) continue;
    let text = fs.readFileSync(file, 'utf8');
    text = text.replace(/<string\b[^>]*name="([^"]+)"[^>]*>[\s\S]*?<\/string>/g, (entry, key) => {
        if (key.startsWith('contributors_')) return entry;
        return entry.replace(/Rain Manager|RainManager|Raincord|RainXposed|\bRain\b/g,
            value => /Manager/.test(value) ? 'CloudCord Manager Test' : value === 'RainXposed' ? 'CloudCord module' : 'CloudCord');
    });
    if (dir === 'values') text = text.replace(/(<string name="app_name">)[^<]+/, '$1CloudCord Manager Test');
    text = text.replace(/(<string name="play_protect_warning_desc">)[\s\S]*?<\/string>/,
        '$1This is an experimental modified application. Keep Play Protect enabled. If Android blocks installation or shows a security warning, stop and send the exact warning to the tester coordinator. Do not bypass it.</string>');
    fs.writeFileSync(file, text);
}
