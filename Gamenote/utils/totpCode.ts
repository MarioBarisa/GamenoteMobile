export function normalizeTotpCode(value: string) {
    return value.replace(/[^0-9]/g, "").slice(0, 6);
}

export function totpQrMarkup(value: string) {
    const svg = value.replace(/^data:image\/svg\+xml(?:;utf-8)?,/i, "");
    return svg.replace(/<svg\b[^>]*>/i, tag => {
        if (/\bviewBox\s*=/.test(tag)) return tag;
        const width = tag.match(/\swidth\s*=\s*["']([\d.]+)(?:px)?["']/i)?.[1];
        const height = tag.match(/\sheight\s*=\s*["']([\d.]+)(?:px)?["']/i)?.[1];
        if (!width || !height || !(Number(width) > 0) || !(Number(height) > 0)) return tag;
        return tag.replace(/<svg/i, `<svg viewBox="0 0 ${width} ${height}"`);
    });
}
