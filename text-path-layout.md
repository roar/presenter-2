# Tekst begrenset til path

Beskriver algoritmen og datastrukturene som brukes når tekst skal layoutes innenfor en vilkårlig SVG-path-form.

## Oversikt

Tilnærmingen er rasterisert scanline-søk: pathen tegnes til et nedskalt offscreen-canvas, alphakanaldata leses ut som et binært pikselgrid, og dette gridet brukes til å finne tilgjengelig linjebredde og -posisjon for hver tekstlinje under layout.

## Datastruktur: rasterisert pathgrid

```js
{
  res:  number,      // nedskalingsfaktor (0–1), slik at max(w,h) ≈ 800px
  cw:   number,      // gridbredde i piksler
  ch:   number,      // gridhøyde i piksler
  data: Uint8Array   // RGBA-pixeldata, 4 bytes per piksel
}
```

Gridet produseres av `getPathScanlines()` i `canvas2dRenderer.js`:

```js
function getPathScanlines(pathD, baseWidth, baseHeight, w, h) {
  const res = Math.min(1, 800 / Math.max(w, h));
  const cw = Math.max(1, Math.ceil(w * res));
  const ch = Math.max(1, Math.ceil(h * res));

  pathScanlineCanvas.width = cw;
  pathScanlineCanvas.height = ch;
  const octx = pathScanlineCanvas.getContext('2d');
  octx.scale((w * res) / baseWidth, (h * res) / baseHeight);
  octx.fill(new Path2D(pathD));

  const data = new Uint8Array(octx.getImageData(0, 0, cw, ch).data.buffer);
  return { res, cw, ch, data };
}
```

Resultatet caches med `pathD + dimensjoner` som nøkkel (maks 50 entries).

## Linjebredde-spørring

For hver tekstlinje spørres gridet om hvilken horisontal utstrekning pathen har ved linjens y-posisjon. Sampling skjer på **linjemidten** (`lineY + lineHeight / 2`) — dette gir riktigere resultat for linjer med stor linjehøyde.

```js
function getPathLineExtent(scan, lineY, lineHeight) {
  const y = Math.round((lineY + lineHeight / 2) * scan.res);

  let left = -1;
  let right = -1;
  for (let x = 0; x < scan.cw; x++) {
    if (scan.data[(y * scan.cw + x) * 4 + 3] > 128) {
      if (left < 0) left = x;
      right = x;
    }
  }

  if (left < 0) return null;
  return { left: left / scan.res, right: (right + 1) / scan.res };
}
```

Returnerer `{ left, right }` i world-koordinater, eller `null` hvis pathen ikke skjærer denne y-verdien.

## To-pass layout

Vertikal sentrering krever at total blokkhøyde er kjent før layout, men blokkhøyden avhenger av per-linje-bredder som varierer med formen. Dette løses med to pass:

```js
// Pass 1 — estimér blokkhøyde med rektangulær bredde
const est = layoutTokens(ctx, tokens, () => maxWidth, h, lineHeight, fontSize);
const estBlockH = est.lines.reduce((sum, line) => sum + line.height, 0);
const yOffset = Math.max(0, (h - estBlockH) / 2);

// Pass 2 — layout med faktisk pathbegrensning, offset med yOffset
const result = layoutTokens(ctx, tokens, (y) => {
  const ext = getPathLineExtent(pathScan, yOffset + y, lineHeight);
  return ext ? Math.max(0, ext.right - ext.left - padding * 2) : 0;
}, h - yOffset, lineHeight, fontSize);
```

`yOffset` legges til y-argumentet i `getLineWidth`-callbacken slik at spørringen alltid er i riktig koordinatrom.

## Linjebryting

`layoutTokens()` i `textLayout.js` er en greedy linjebrytealgoritme. Den mottar en `getLineWidth(y)`-callback som returnerer tilgjengelig bredde for gjeldende y. For path-tekst varierer denne per linje; for rektangulær tekst er den konstant.

Flyten per token:

1. Mål tokenbredde med Canvas2D `measureText()`
2. Kall `getLineWidth(y)` — for paths oversettes dette til et scanline-oppslag
3. Får token plass på linjen → legg til
4. Får token ikke plass → brekk linje, øk y med linjehøyde, prøv på ny linje
5. Eksplisitt linjeskift (`\n`) → tving linjeskift

```
linje 1: [token token token]   ← bredde fra pathgrid ved y=0
linje 2: [token token]         ← bredde fra pathgrid ved y=lineHeight
linje 3: [token token token]   ← osv.
```

## Tekstplassering

Etter layout er `ext.left` startpunktet for hver linje (pluss padding og tekstjustering). Dette betyr at teksten ikke bare begrenses i bredde — den forskyves også horisontalt slik at den starter ved pathens venstre kant.

```
x = ext.left + padding                   // venstrejustert
x = ext.left + (ext.right - ext.left)/2  // sentrert
x = ext.right - padding - lineWidth      // høyrejustert
```

## Nøkkelegenskaper

| Egenskap | Detalj |
|---|---|
| Støttede former | Vilkårlig SVG-path via `fill(new Path2D(d))` |
| Oppløsning | Adaptiv: max(w,h) skaleres til ~800px |
| Caching | Map med `pathD\|w\|h` som nøkkel, maks 50 entries |
| Sampling | Linjemidt, ikke topplinje |
| Linjebryting | Greedy (ord-for-ord) |
| Vertikal sentrering | To-pass estimering |
