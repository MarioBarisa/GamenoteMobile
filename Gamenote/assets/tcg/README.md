TCG folija preuzeta iz [Gamenote GameCard.vue](https://github.com/MarioBarisa/Gamenote/blob/main/src/components/GameCard.vue).

- Gold/holo cover: izvorni SVG linearni gradijenti izravno u komponenti, s CSS kutom 115° prilagođenim dimenzijama kartice.
- `cover-prism.png`: izvorni konični CSS gradijent, rasteriziran kao kvadrat radi očuvanja kutova bez rastezanja.
- `foil-gold.png`, `foil-spectrum.png`: izvorni SVG-ovi rasterizirani u Chromiumu na 600 × 840, bez izmjene pozadine, šuma, boja ili internog screen blendinga. Samo opacity zvjezdica i sitnih odsjaja povećan je za 10% na zahtjev korisnika.
- `foil-prism.png`: izvorni spectrum SVG s primijenjenim hue-rotate(20deg).

Cover koristi color-dodge neposredno nad posterom. EX sloj koristi izvorni radijalni gradijent ispod teksture, color-burn između njih te soft-light nad karticom. PNG teksture sadrže izvornu tamnu pozadinu i koriste se isključivo unutar tog blendinga.

Kružni gradijenti zadržavaju LCH boje pretvorene u sRGB te izvorne stopove 8%, 28% i 90%. Refleksija prati nagib bez povećavanja kartice ili animacije disanja. Opacity ostaje izvorni: cover 0.45, prism 0.55, EX 0.25–0.75; glare prati aktivaciju i koristi izvorni overlay blending. Logo je izostavljen na zahtjev korisnika.

Radijalne refleksije koriste statični SVG s iOS rasterizacijom. Pomiče se i skalira samo refleksija, prema izvornom središtu i polumjeru do najudaljenijeg kuta kartice. Blending ostaje izvan predmemoriranog sloja. Zajednički pomaci tekstura i opacity računaju se u `TCGMotionProvider` jednom za sve kartice; frekvencija senzora i izglađivanje ostaju isti.

Pravila ostaju izvorna: 5/5 → holo, 100% → gold, oboje → prism.

Izvorne revizije: GameCard `645e147711b6d8ecfcf94f0f6f712efd4b8d54f9`, gold `9a59ff659cd645ce4d9f42b6917a0d972457d378`, spectrum `377a9edfe0c95a407c7adfef8122f8ff169486c1`.
