(() => {
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const bottlePaths = {
    bottle: "M42 15H62V49Q62 56 76 67V145Q76 153 68 153H36Q28 153 28 145V67Q42 56 42 49Z",
    round: "M43 18H61V55C98 69 96 150 66 153H38C8 150 6 69 43 55Z",
    carton: "M28 41L40 18H69L82 41V153H28Z",
    jar: "M25 49Q25 40 35 40H72Q82 40 82 49V145Q82 153 72 153H35Q25 153 25 145Z",
    whiskey: 'M43 18H65V51L83 64V145Q83 153 75 153H33Q25 153 25 145V64L43 51Z',
    gin: 'M44 17H64V45Q64 49 83 57V147L75 153H33L25 147V57Q44 49 44 45Z',
    vodka: 'M43 17H65V42C65 53 81 53 81 73V145Q81 153 72 153H36Q27 153 27 145V73C27 53 43 53 43 42Z',
    tequila: 'M44 44H65V63Q87 67 88 85V137Q87 153 69 153H40Q21 153 21 137V85Q22 67 44 63Z',
    rum: 'M46 14H62V66Q76 69 76 82V146Q76 153 67 153H41Q32 153 32 146V82Q32 69 46 66Z',
  };
  // Label artwork drawn inside the 45 × 41 label at (32, 83). `ink` is the user's colour.
  const labelPatterns = {
    classic: ink => `<path d="M43 100H65M47 107H61" stroke="${ink}" opacity=".75" stroke-width="2"/>`,
    stripes: ink => [0, 9, 18, 27, 36, 45, 54].map(d => `<path d="M${24 + d} 128L${44 + d} 80" stroke="${ink}" stroke-width="3.2" opacity=".8"/>`).join(""),
    dots: ink => [0, 1, 2, 3].flatMap(r => [0, 1, 2, 3, 4].map(c => `<circle cx="${36 + c * 9 + (r % 2) * 4.5}" cy="${88 + r * 10}" r="2.3" fill="${ink}" opacity=".85"/>`)).join(""),
    star: ink => `<path d="M54.5 91.5L57.4 99.5L65.9 99.8L59.3 105.0L61.6 113.2L54.5 108.5L47.4 113.2L49.7 105.0L43.1 99.8L51.6 99.5Z" fill="${ink}"/><path d="M38 119H71" stroke="${ink}" stroke-width="1.5" opacity=".6"/>`,
    crest: ink => `<path d="M45 89H64V101Q64 112 54.5 118Q45 112 45 101Z" fill="none" stroke="${ink}" stroke-width="2"/><path d="M48.5 99L54.5 104L60.5 99M48.5 105L54.5 110L60.5 105" fill="none" stroke="${ink}" stroke-width="1.6"/>`,
    leaf: ink => `<path d="M54.5 120Q53 104 55 88" fill="none" stroke="${ink}" stroke-width="1.8"/>${[[92, -1], [99, 1], [106, -1], [112, 1]].map(([y, d]) => `<path d="M54.5 ${y + 3}Q${54.5 + d * 12} ${y - 2} ${54.5 + d * 13} ${y - 8}Q${54.5 + d * 3} ${y - 6} 54.5 ${y + 3}Z" fill="${ink}" opacity=".85"/>`).join("")}`,
    citrus: ink => `<circle cx="54.5" cy="103.5" r="12" fill="none" stroke="${ink}" stroke-width="2.4"/><circle cx="54.5" cy="103.5" r="8.5" fill="none" stroke="${ink}" stroke-width=".9"/><path d="M46 103.5H63M54.5 95V112M48.5 97.5L60.5 109.5M48.5 109.5L60.5 97.5" stroke="${ink}" stroke-width="1.3"/>`,
    wave: ink => [92, 101, 110, 119].map(y => `<path d="M30 ${y}Q36.5 ${y - 5} 43 ${y}Q49.5 ${y + 5} 56 ${y}Q62.5 ${y - 5} 69 ${y}Q75.5 ${y + 5} 82 ${y}" fill="none" stroke="${ink}" stroke-width="2"/>`).join(""),
    deco: ink => `${[-50, -30, -10, 10, 30, 50].map(a => `<g transform="translate(54.5 119) rotate(${a})"><path d="M0 0V-26" stroke="${ink}" stroke-width="1.4"/></g>`).join("")}<path d="M36 119Q54.5 84 73 119" fill="none" stroke="${ink}" stroke-width="2"/><path d="M34 88H75M34 121H75" stroke="${ink}" stroke-width="1.2"/>`,
    agave: ink => [-46, -24, 0, 24, 46].map((a, i) => `<g transform="translate(54.5 120) rotate(${a})"><path d="M-3 0Q-2 -16 0 ${i === 2 ? -30 : -24}Q2 -16 3 0Z" fill="${ink}" opacity=".9"/></g>`).join(""),
    anchor: ink => `<circle cx="54.5" cy="90" r="3.4" fill="none" stroke="${ink}" stroke-width="1.8"/><path d="M54.5 93.5V118M48 98H61M43 108Q45 119 54.5 118Q64 119 66 108" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`,
    crown: ink => `<path d="M41 113L39 94L47.5 103L54.5 90L61.5 103L70 94L68 113Z" fill="${ink}" opacity=".9"/><path d="M41 117H68" stroke="${ink}" stroke-width="2.4"/>`,
    heart: ink => `<path d="M54.5 117C40 107 41 95 48 93C52 92 54.5 96 54.5 98C54.5 96 57 92 61 93C68 95 69 107 54.5 117Z" fill="${ink}"/>`,
  };
  function bottle(item = {}) {
    const color = /^#[a-f\d]{6}$/i.test(item.color) ? item.color : "#79a883";
    const shape = bottlePaths[item.shape] ? item.shape : "bottle";
    const strokes = (item.drawing || []).map((points, i) => {
      const stroke = /^#[a-f\d]{6}$/i.test(item.strokeColors?.[i]) ? ` stroke="${item.strokeColors[i]}"` : "";
      const width = Number.isFinite(item.strokeWidths?.[i]) ? ` stroke-width="${item.strokeWidths[i]}"` : "";
      return `<polyline points="${points.map((p) => p.map(Number).join(",")).join(" ")}"${stroke}${width}/>`;
    }).join("");
    // A fully hand-drawn bottle replaces the template outright.
    if (item.drawMode === "bottle") return `<svg viewBox="0 0 110 170" aria-hidden="true" data-bottle="drawn"><ellipse cx="55" cy="159" rx="34" ry="5" fill="#203d3d" opacity=".1"/><g fill="none" stroke="#29494d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${strokes}</g></svg>`;
    const necks = { bottle: [42, 20], round: [43, 18], whiskey: [43, 22], gin: [44, 20], vodka: [43, 22], rum: [46, 16] };
    const highlights = {
      bottle: 'M35 74V139', round: 'M25 79Q15 108 27 137',
      carton: 'M35 51V139', jar: 'M31 55V139', whiskey: 'M32 73V139',
      gin: 'M32 66V139', vodka: 'M34 75V139',
      tequila: 'M30 81Q27 86 28 98V136', rum: 'M40 83V140',
    };
    const [neckX, neckWidth] = necks[shape] || necks.bottle;
    const pattern = labelPatterns[item.pattern] || item.pattern === "blank" || item.pattern === "wax" || item.pattern === "diamond" ? item.pattern : "classic";
    const dark = shape === "whiskey";
    const ink = /^#[a-f\d]{6}$/i.test(item.ink) ? item.ink : dark ? "#ecd7ae" : "#29494d";
    const cap = shape === 'carton'
      ? '<path d="M40 18H69M28 41H82M40 18L52 41L69 18" fill="none" stroke="#fff8e8" stroke-width="3"/>'
      : shape === 'jar' ? '<rect data-cap="jar" x="25" y="34" width="57" height="13" rx="4" fill="#ba9560" stroke="#29494d" stroke-width="2"/><path d="M30 39H77" stroke="#e6c892"/>'
      : shape === 'tequila' ? '<rect x="41" y="32" width="27" height="17" rx="4" fill="#ba895b" stroke="#765336" stroke-width="2"/>'
      : `<rect data-cap="bottle" x="${neckX - 3}" y="10" width="${neckWidth + 6}" height="14" rx="3" fill="#29494d"/><path d="M${neckX + 2} 15H${neckX + neckWidth - 2}" stroke="#c7a268" stroke-width="2"/>`;
    const capTop = shape === "tequila" ? 32 : shape === "jar" ? 34 : shape === "carton" ? 18 : 10;
    const wax = pattern === "wax" && shape !== "carton" ? (() => {
      const [x, w] = shape === "jar" ? [25, 57] : shape === "tequila" ? [41, 27] : [neckX - 3, neckWidth + 6];
      const red = /^#[a-f\d]{6}$/i.test(item.ink) ? item.ink : "#a3142c";
      return `<path d="M${x - 1} ${capTop - 1}H${x + w + 1}V${capTop + 16}Q${x + w - 2} ${capTop + 24} ${x + w - 5} ${capTop + 16}Q${x + w - 9} ${capTop + 30} ${x + w * .55} ${capTop + 18}Q${x + w * .4} ${capTop + 22} ${x + w * .3} ${capTop + 15}Q${x + 2} ${capTop + 27} ${x - 1} ${capTop + 16}Z" fill="${red}"/><path d="M${x + 2} ${capTop + 3}H${x + w - 3}" stroke="#ffffff" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>`;
    })() : "";
    const clip = `bottle-label-${++drawingID}`, body = `bottle-body-${drawingID}`;
    const hatch = pattern === "diamond" ? `<defs><clipPath id="${body}"><path d="${bottlePaths[shape]}"/></clipPath></defs><g clip-path="url(#${body})" opacity=".45">${Array.from({ length: 16 }, (_, i) => `<path d="M${-60 + i * 14} 170L${40 + i * 14} 40M${170 - i * 14} 170L${70 - i * 14} 40" stroke="#ffffff" stroke-width="1.2"/>`).join("")}</g>` : "";
    const label = pattern === "blank" ? "" : `<defs><clipPath id="${clip}"><rect x="32" y="83" width="45" height="41" rx="${dark ? 1 : 8}"/></clipPath></defs><rect x="32" y="83" width="45" height="41" rx="${dark ? 1 : 8}" fill="${dark ? '#293b3b' : '#fff8e8'}" stroke="#d3b982"/><g clip-path="url(#${clip})">${(labelPatterns[pattern] || labelPatterns.classic)(ink)}</g>`;
    return `<svg viewBox="0 0 110 170" aria-hidden="true" data-bottle="${escape(shape)}"><ellipse cx="55" cy="159" rx="34" ry="5" fill="#203d3d" opacity=".1"/><path d="${bottlePaths[shape]}" fill="${color}" stroke="#29494d" stroke-width="2.5"/>${hatch}${reflection(bottlePaths[shape], highlights[shape] || highlights.bottle, 2.5, .25)}${cap}${wax}${label}<g fill="none" stroke="#29494d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" transform="translate(14 40) scale(.42)">${strokes}</g></svg>`;
  }
  const glassShapes = {
    hurricane: { path: 'M48 20H112Q88 66 111 102Q125 144 80 147Q35 144 49 102Q72 66 48 20Z', rim:20, bottom:147, left:48, right:112, cubes:[[69,122,22,-10],[91,119,22,9],[80,88,21,-7]] },
    mug: { path:'M35 40H115V156Q115 167 103 167H47Q35 167 35 156Z',rim:40,bottom:167,left:35,right:115,cubes:[[59,142,24,-10],[93,140,24,10]] },
    shot: { path:'M48 79H112L104 167H56Z',rim:79,bottom:167,left:48,right:112,cubes:[[80,143,20,0]] },
    margarita: { path:'M17 44H143Q139 80 103 83Q105 119 80 122Q55 119 57 83Q21 80 17 44Z',rim:44,bottom:122,left:17,right:143,cubes:[[78,97,22,12],[52,62,22,-9],[107,62,22,8]] },
    bowl: { path:'M17 72H143Q137 165 80 165Q23 165 17 72Z',rim:72,bottom:165,left:17,right:143,cubes:[[58,135,26,12],[99,131,26,-10],[78,105,24,0]] },
    coupe: { path: "M22 48H138Q130 110 80 111Q30 110 22 48Z", rim: 48, bottom: 111, left: 22, right: 138, cubes: [[61,83,21,-12],[91,84,23,14],[77,64,20,-5]] },
    martini: { path: "M15 42H145L80 118Z", rim: 42, bottom: 118, left: 15, right: 145, cubes: [[79,91,18,8],[57,61,22,-12],[99,60,22,16]] },
    highball: { path: "M43 18H117L110 167H50Z", rim: 18, bottom: 167, left: 43, right: 117, cubes: [[65,148,23,-8],[94,146,24,10],[79,118,25,-12]] },
    rocks: { path: "M29 76H131L124 167H36Z", rim: 76, bottom: 167, left: 29, right: 131, cubes: [[61,145,28,-12],[100,143,28,12],[80,111,27,-8]] },
    wine: { path: "M39 25H121Q149 113 80 115Q11 113 39 25Z", rim: 25, bottom: 115, left: 39, right: 121, cubes: [[62,87,24,-14],[94,87,25,12],[79,57,24,-8]] },
  };
  const vesselShape = { path: "M40 62H120L108 172H52Z", rim: 62, bottom: 172, left: 40, right: 120, cubes: [[70,147,25,-10],[94,120,24,12],[68,93,25,-8]] };
  // Follow each glass wall, inset from its outline. Curved bowls need curved
  // reflections; a shared fixed slope can put the stroke outside a martini glass.
  const glassHighlights = {
    hurricane: 'M58 35Q66 53 64 70', mug: 'M42 54V84',
    shot: 'M55 91L57 113', margarita: 'M26 55Q31 72 48 76',
    bowl: 'M26 84Q29 108 40 126', coupe: 'M32 60Q37 82 51 91',
    martini: 'M33 54L47 70.4', highball: 'M50 32L51.7 68',
    rocks: 'M37 89L39.3 119', wine: 'M44 40Q36 65 41 82',
  };
  let drawingID = 0;
  function reflection(outline, path, width = 2.2, opacity = .4) {
    const id = `reflection-${++drawingID}`;
    return `<defs><clipPath id="${id}"><path d="${outline}"/></clipPath></defs><path data-reflection="true" d="${path}" fill="none" stroke="white" stroke-width="${width}" stroke-linecap="round" opacity="${opacity}" clip-path="url(#${id})"/>`;
  }
  // Deterministic scatter so the same drink always renders identically.
  const scatter = (i, seed) => { const v = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453; return v - Math.floor(v); };
  const surfaceOf = (shape, options) => {
    const level = Math.max(0, Math.min(0.9, options.level ?? 0.7));
    return { level, surface: shape.bottom - (shape.bottom - shape.rim) * level };
  };
  function cube(x, y, size, angle, i, options, extra = "") {
    return `<g transform="translate(${x} ${y}) rotate(${angle})"><g class="ice-piece ${options.animateIce ? "ice-falling" : ""}" style="--ice-start:${options.rim - y - 70}px;--ice-delay:${i*0.32}s"><rect x="${-size/2}" y="${-size/2}" width="${size}" height="${size}" rx="${size > 30 ? 7 : 5}" fill="#dceff2" fill-opacity="${size > 30 ? .62 : .8}" stroke="#7ca5b0" stroke-width="1.3"/><path d="M${-size/2+4} ${size/2-5}V${-size/2+5}H${size/2-5}" fill="none" stroke="white" stroke-opacity=".9" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M${-size/2+4} ${size/2-4}L${size/2-4} ${-size/2+4}V${size/2-4}Z" fill="#92bfca" fill-opacity=".23"/>${extra}</g></g>`;
  }
  function iceFor(shape, options) {
    const o = { ...options, rim: shape.rim };
    if (options.crushed) {
      let out = "", i = 0;
      for (let y = shape.bottom - 8; y > shape.rim - 8; y -= 13) {
        for (let x = shape.left + 7 + (i % 2) * 6; x < shape.right - 5; x += 16) {
          const w = 7 + scatter(i, 1) * 4, h = 5 + scatter(i, 2) * 3, a = Math.round((scatter(i, 3) - .5) * 50);
          out += `<g transform="translate(${(x + scatter(i, 13) * 5).toFixed(1)} ${(y + scatter(i, 14) * 4).toFixed(1)}) rotate(${a})"><rect x="${(-w / 2).toFixed(1)}" y="${(-h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="2.2" fill="#f1f9fa" fill-opacity=".55" stroke="#a9cbd2" stroke-opacity=".7" stroke-width=".8"/></g>`;
          i++;
        }
      }
      return out;
    }
    if (options.rock) {
      const size = Math.round(Math.min((shape.right - shape.left) * .55, (shape.bottom - shape.rim) * .78));
      return cube(80, shape.bottom - size / 2 - 5, size, 4, 0, o, `<path d="M${-size/2+9} ${-size/2+8}H${size/2-14}" stroke="white" stroke-opacity=".6" stroke-width="1.6" stroke-linecap="round"/>`);
    }
    return shape.cubes.map(([x, y, size, angle], i) => cube(x, y, size, angle, i, o)).join("");
  }
  function contents(shape, color, options) {
    const id = `drink-contents-${++drawingID}`;
    const { level, surface } = surfaceOf(shape, options);
    const layers = options.layers;
    const gradient = layers ? `<linearGradient id="${id}-gradient" x1="0" y1="${surface}" x2="0" y2="${shape.bottom}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${layers[0]}"/><stop offset=".38" stop-color="${layers[0]}"/><stop offset=".72" stop-color="${layers[1]}"/><stop offset="1" stop-color="${layers[1]}"/></linearGradient>` : '';
    const decorated = options.garnish !== false && level;
    const width = shape.right - shape.left;
    const bubbles = options.bubbles && level ? Array.from({ length: 11 }, (_, i) => {
      const x = shape.left + width * (.22 + .56 * scatter(i, 4)), y = surface + (shape.bottom - surface) * (.12 + .8 * scatter(i, 5));
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.1 + (i % 3) * .55).toFixed(2)}" fill="none" stroke="#ffffff" stroke-opacity=".7" stroke-width=".9"/>`;
    }).join("") : "";
    const sunk = decorated && (options.extras || []).includes("cherry") && options.garnish !== "cherry"
      ? `<circle cx="${shape.bottom - shape.rim > 90 ? 93 : 80}" cy="${shape.bottom - 9}" r="6.5" fill="#a3142c" stroke="#6e0f1f" stroke-width="1.2"/><circle cx="${shape.bottom - shape.rim > 90 ? 91 : 78}" cy="${shape.bottom - 11}" r="1.8" fill="#ffffff" opacity=".55"/>` : "";
    const topping = decorated ? (options.extras || []).map(kind => {
      const dust = { nutmeg: ["#8a5a32", 14], cocoa: ["#4b2a1a", 22], pepper: ["#2b2420", 12] }[kind];
      if (dust) return Array.from({ length: dust[1] }, (_, i) => `<circle cx="${(80 + (scatter(i, 6) - .5) * width * .62).toFixed(1)}" cy="${(surface + 1 + scatter(i, 7) * 4).toFixed(1)}" r="${(.7 + scatter(i, 8) * .7).toFixed(2)}" fill="${dust[0]}"/>`).join("");
      if (kind === "bitters") return [62, 80, 98].map((x, i) => `<ellipse cx="${x}" cy="${surface + 3.5}" rx="${3 - i * .3}" ry="1.4" fill="#8c1f1a" opacity=".85"/>`).join("");
      return "";
    }).join("") : "";
    return `<defs>${gradient}<clipPath id="${id}"><path d="${shape.path}"/></clipPath><clipPath id="${id}-ice"><path d="${shape.path}"/><rect x="${shape.left}" y="-140" width="${width}" height="${shape.rim+140}"/></clipPath></defs>
      <g clip-path="url(#${id})" class="drink-liquid" fill="${color}">${level ? `<rect x="0" y="${surface}" width="160" height="${shape.bottom-surface}" fill="${layers ? `url(#${id}-gradient)` : color}" fill-opacity="${options.opaque ? .96 : .85}"/><ellipse cx="80" cy="${surface}" rx="70" ry="3" fill-opacity=".3"/>${bubbles}${sunk}${options.foam ? `<rect x="0" y="${surface}" width="160" height="7" fill="#fff4db" opacity=".9"/>` : ''}${topping}` : ""}</g>
      <g clip-path="url(#${id}-ice)" class="drink-ice">${options.ice || options.crushed || options.rock ? iceFor(shape, options) : ""}</g>`;
  }
  function rimFx(type, shape) {
    const colors = { salt: ["#f6f5ef", "#ffffff", "#dfe3e0"], sugar: ["#f8ecca", "#fffaf0", "#ecd7a4"], spice: ["#c0603e", "#e39a6e", "#8a3a22"] }[type];
    if (!colors) return "";
    const width = shape.right - shape.left, count = Math.round(width / 2.6);
    return `<g data-rim="${escape(type)}"><path d="M${shape.left - .5} ${shape.rim}H${shape.right + .5}" stroke="${colors[0]}" stroke-width="3.2" stroke-linecap="round" opacity=".6"/>${Array.from({ length: count }, (_, i) => {
      const x = shape.left + i * 2.6 + scatter(i, 9) * 2, y = shape.rim - 2.6 + scatter(i, 10) * 5.6, size = 1.1 + scatter(i, 15) * 1.4;
      return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${Math.round(scatter(i, 16) * 90)})"><rect x="${(-size / 2).toFixed(2)}" y="${(-size / 2).toFixed(2)}" width="${size.toFixed(2)}" height="${size.toFixed(2)}" rx=".3" fill="${colors[i % 5 ? (i % 2 ? 1 : 0) : 2]}"/></g>`;
    }).join("")}</g>`;
  }
  function straw(shape, color = "") {
    const stripe = ["#e07a86", "#5fb3ad", "#3a3a3a", "#e3b65a"][[...color].reduce((n, c) => n + c.charCodeAt(0), 0) % 4];
    const x1 = shape.left + (shape.right - shape.left) * .38, y1 = shape.bottom - 9;
    const x2 = shape.left + (shape.right - shape.left) * .2, y2 = shape.rim - 24;
    const d = `M${x1} ${y1}L${x2} ${y2}Q${x2 - 2.5} ${y2 - 7} ${x2 - 9} ${y2 - 12}`;
    return `<path d="${d}" fill="none" stroke="#fbf7ef" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${stripe}" stroke-width="4.6" stroke-dasharray="4 5" opacity=".85"/><path d="M${x1 - 1.2} ${y1}L${x2 - 1.2} ${y2}" stroke="#ffffff" stroke-opacity=".5" stroke-width="1"/>`;
  }
  // Citrus colours: rind, pith, flesh, segment.
  const citrus = {
    lime: ["#6a9a35", "#eef2c8", "#cfe08a", "#b2cc5e"],
    lemon: ["#dcb92a", "#fbf3c8", "#f6e27a", "#ead058"],
    orange: ["#e3852b", "#fde9c8", "#f7b552", "#ef9a3a"],
    grapefruit: ["#e59a4c", "#fde3d6", "#f39a8a", "#e8786a"],
  };
  const wheel = ([rind, pith, flesh, seg]) => `<g transform="rotate(-14)"><circle r="16.5" fill="${rind}"/><circle r="14.7" fill="${pith}"/><circle r="13.2" fill="${flesh}"/>${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<g transform="rotate(${a})"><path d="M0 -2.4C-3 -5 -4.4 -8.8 -3.3 -11.5Q0 -12.6 3.3 -11.5C4.4 -8.8 3 -5 0 -2.4Z" fill="${seg}"/></g>`).join("")}<circle r="1.8" fill="${pith}"/><path d="M-11.5 -6.5Q-7.5 -12.5 -.5 -13.6" fill="none" stroke="#ffffff" stroke-opacity=".6" stroke-width="1.5" stroke-linecap="round"/></g>`;
  const wedge = ([rind, pith, flesh, seg]) => `<g transform="translate(0 -4) rotate(-28)"><path d="M-17 0C-15 9 -8 15.5 0 15.8C8 15.5 15 9 17 0Z" fill="${rind}"/><path d="M-15.2 .4C-13.2 7.6 -7 12.8 0 13.2C7 12.8 13.2 7.6 15.2 .4Z" fill="${pith}"/><path d="M-13.6 .6C-11.6 6.6 -6 11 0 11.4C6 11 11.6 6.6 13.6 .6Z" fill="${flesh}"/><path d="M0 1.6V10.2M-6 1.6Q-5.2 6 -4.3 9.4M6 1.6Q5.2 6 4.3 9.4" fill="none" stroke="${pith}" stroke-width="1" stroke-linecap="round"/><path d="M-15 .2Q0 -1.2 15 .2" fill="none" stroke="${seg}" stroke-width="1.6" stroke-linecap="round"/><path d="M-12.5 4Q-8.5 10 -2.5 12" fill="none" stroke="#ffffff" stroke-opacity=".45" stroke-width="1.2" stroke-linecap="round"/></g>`;
  const twist = (peel, light) => `<path d="M-4 -8C10 -11 15 -1 6.5 4.5C-1.5 9.5 0 17.5 9 20C17 22.5 15.5 31 7.5 34" fill="none" stroke="${peel}" stroke-width="4.6" stroke-linecap="round"/><path d="M-2.6 -8.8C8.8 -10.6 12.6 -2 5.6 3.4C-1.2 8.4 .6 16 8.4 18.4" fill="none" stroke="${light}" stroke-width="1.3" stroke-linecap="round" opacity=".75"/><path d="M7.5 34C3.5 35.8 2.6 38.4 4.6 40.6" fill="none" stroke="${peel}" stroke-width="2.6" stroke-linecap="round"/>`;
  const leaf = (angle, fill, vein, size = 1) => `<g transform="rotate(${angle}) scale(${size})"><path d="M0 0C-6.5 -4 -7.5 -12.5 0 -19C7.5 -12.5 6.5 -4 0 0Z" fill="${fill}"/><path d="M0 -1.5Q.6 -9 0 -16" fill="none" stroke="${vein}" stroke-width=".9" stroke-linecap="round"/><path d="M0 -6L-3 -8.5M0 -10L3 -12.5M0 -13L-2.4 -15" stroke="${vein}" stroke-width=".7" stroke-linecap="round" opacity=".8"/></g>`;
  const berries = (fill, light, dark) => `<path d="M-30 32L14 -16" stroke="#b08e5c" stroke-width="1.8" stroke-linecap="round"/><circle cx="15.5" cy="-17.5" r="1.8" fill="#c9a46c"/>${[[0,0],[-4.6,-3.6],[4.6,-3.6],[-5.4,2.6],[5.4,2.6],[0,-7.4],[0,6],[-2.4,-1],[2.6,1.6]].map(([x,y], i) => `<circle cx="${x}" cy="${y}" r="${i > 6 ? 2.6 : 3.3}" fill="${i % 3 ? fill : dark}"/>`).join("")}${[[-5,-4.6],[-1,-8.2],[3.8,-4.4],[-5.8,1.8]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="${light}" opacity=".7"/>`).join("")}`;
  const rimItems = {
    orange: () => wheel(citrus.orange),
    lime: () => wheel(citrus.lime),
    lemon: () => wheel(citrus.lemon),
    grapefruit: () => wheel(citrus.grapefruit),
    cucumber: () => `<g transform="rotate(-14)"><circle r="16" fill="#3f7a3a"/><circle r="14.4" fill="#cfe3a8"/><circle r="9.5" fill="#e6f1cd"/>${[0,60,120,180,240,300].map(a => `<g transform="rotate(${a})"><ellipse cx="0" cy="-5.6" rx="1.2" ry="2.3" fill="#b5d388"/></g>`).join("")}<path d="M-10.5 -7Q-6.5 -12 0 -13" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width="1.4" stroke-linecap="round"/></g>`,
    "lime-wedge": () => wedge(citrus.lime),
    "lemon-wedge": () => wedge(citrus.lemon),
    "orange-wedge": () => wedge(citrus.orange),
    "lemon-twist": () => twist("#e0bd2c", "#fff4b8"),
    "orange-twist": () => twist("#e27a26", "#ffd9a8"),
    mint: () => `<g transform="translate(0 -4) scale(1.45)"><path d="M-1 18Q2 6 0 -4Q-1.5 -12 2 -20" fill="none" stroke="#4a7d3e" stroke-width="1.5" stroke-linecap="round"/><g transform="translate(1 9)">${leaf(-118, "#4d8a4a", "#9ccc8e", .62)}${leaf(112, "#558f4f", "#a8d39a", .6)}</g><g transform="translate(0 -1)">${leaf(-70, "#5f9e57", "#a8d39a", .78)}${leaf(66, "#4d8a4a", "#9ccc8e", .76)}</g><g transform="translate(1.4 -12)">${leaf(-30, "#6cab61", "#b6dca8", .62)}${leaf(34, "#5f9e57", "#a8d39a", .6)}${leaf(4, "#78b66b", "#c3e2ae", .52)}</g></g>`,
    basil: () => `<path d="M0 14Q0 6 0 0" fill="none" stroke="#2f6a32" stroke-width="1.6" stroke-linecap="round"/><g transform="rotate(-36)"><path d="M0 0C-9 -4 -10 -16 0 -21C10 -16 9 -4 0 0Z" fill="#3f8a3f"/><path d="M0 -2V-18" stroke="#7dbb6c" stroke-width=".9"/></g><g transform="rotate(30)"><path d="M0 0C-9 -4 -10 -16 0 -21C10 -16 9 -4 0 0Z" fill="#4c9c46"/><path d="M0 -2V-18" stroke="#8cc97a" stroke-width=".9"/></g><path d="M-12 -10Q-9 -15 -4 -16" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="1.2" stroke-linecap="round"/>`,
    cherry: () => `<path d="M.5 -6C1.5 -14 7 -21 15 -25.5" fill="none" stroke="#6b4a2b" stroke-width="1.7" stroke-linecap="round"/><path d="M-7.6 1C-8 -5 -3 -8 0 -6C3 -8 8 -5 7.6 1C7.2 6 3.6 8.6 0 8.6C-3.6 8.6 -7.2 6 -7.6 1Z" fill="#b3122e"/><path d="M-5.6 3.4Q-3 7 1.5 7.2" fill="none" stroke="#6e0a1d" stroke-opacity=".55" stroke-width="1.2" stroke-linecap="round"/><ellipse cx="-3.2" cy="-1.8" rx="2.3" ry="1.5" fill="#ffffff" opacity=".6"/>`,
    pineapple: () => `<g transform="rotate(10)"><path d="M-2 -2C-6 -12 -12 -18 -16 -27C-9 -23 -4 -16 0 -6Z" fill="#4f8d4c"/><path d="M2 -2C6 -12 12 -18 16 -26C9 -22 4 -16 0 -6Z" fill="#5c9a52"/><path d="M-1 -3C-2 -14 -1 -22 1 -32C3 -22 3 -14 1 -3Z" fill="#6aa85e"/><path d="M-17 -1C-12 8 -6 16 0 22C6 16 12 8 17 -1Z" fill="#f6d65f"/><path d="M-18 -3.4Q0 -6.6 18 -3.4L17 .4Q0 -2.6 -17 .4Z" fill="#b8862f"/><path d="M-8 4.5L-6.5 6.5M-1 6L.5 8M6.5 4.5L8 6.5M-4 11.5L-2.5 13.5M3 11.5L4.5 13.5" stroke="#e0ac3a" stroke-width="1.3" stroke-linecap="round"/><path d="M0 2Q.5 10 0 18" fill="none" stroke="#fdf0b4" stroke-width="1.6" opacity=".75"/></g>`,
    blackberry: () => berries("#4a1a3a", "#b07aa6", "#2e0f25"),
    raspberry: () => berries("#d23c58", "#ffc2cd", "#a8243e"),
    ginger: () => `<path d="M-28 30L14 -14" stroke="#b08e5c" stroke-width="1.8" stroke-linecap="round"/><g transform="rotate(14)"><rect x="-6" y="-6" width="12" height="11" rx="3.5" fill="#e9c46a"/><rect x="-6" y="-6" width="12" height="4" rx="2" fill="#f4dc94"/></g><g transform="translate(-9 7) rotate(-10)"><rect x="-5.5" y="-5" width="11" height="10" rx="3.5" fill="#e2b95a"/><rect x="-5.5" y="-5" width="11" height="3.5" rx="1.8" fill="#f0d488"/></g>${[[-2,-3],[3,0],[-11,5],[-6,9],[1,3]].map(([x,y]) => `<rect x="${x}" y="${y}" width="1.4" height="1.4" fill="#fffaf0"/>`).join("")}`,
    apple: () => [-26, 0, 26].map(a => `<g transform="rotate(${a})"><path d="M0 4C-7 -4 -7 -18 0 -27C7 -18 7 -4 0 4Z" fill="#c8392f"/><path d="M0 2.4C-5.2 -4 -5.2 -17 0 -24.6C5.2 -17 5.2 -4 0 2.4Z" fill="#f7efcf"/><path d="M0 -6V-12" stroke="#b78d5a" stroke-width="1.2" stroke-linecap="round"/></g>`).join(""),
    cinnamon: () => `<g transform="rotate(-58)"><rect x="-4" y="-30" width="8" height="48" rx="2.5" fill="#8f5230"/><path d="M1.2 -29V17" stroke="#b77a4c" stroke-width="1.1"/><path d="M-2.6 -27V15" stroke="#6e3a1e" stroke-width=".8" opacity=".7"/><ellipse cx="0" cy="-30" rx="4" ry="1.8" fill="#6a3a1f"/><path d="M-2 -30Q0 -28.6 2 -30.4" fill="none" stroke="#c18656" stroke-width=".9"/></g>`,
    umbrella: () => `<g transform="translate(0 -4) rotate(-24)"><path d="M0 22C-.6 6 0 -10 0 -26" fill="none" stroke="#8a6440" stroke-width="1.8" stroke-linecap="round"/><path d="M-24 -22Q-21 -17.5 -16 -21.5Q-12 -17.5 -8 -21.8Q-4 -17.5 0 -21.8Q4 -17.5 8 -21.8Q12 -17.5 16 -21.5Q21 -17.5 24 -22Q15 -44 0 -45Q-15 -44 -24 -22Z" fill="#e46c88"/><path d="M0 -45Q-9 -36 -16 -21.5Q-12 -17.5 -8 -21.8Q-4 -33 0 -45Z" fill="#f4a3b6"/><path d="M0 -45Q4 -33 8 -21.8Q12 -17.5 16 -21.5Q9 -36 0 -45Z" fill="#f4a3b6"/><circle cx="0" cy="-45" r="1.8" fill="#f6d27a"/></g>`,
  };
  function garnish(type, shape, options = {}) {
    if (type === false || type === 'none' || !type) return '';
    const x = shape.right - 5, y = shape.rim + 4;
    const surface = surfaceOf(shape, options).surface;
    if (type === 'coffee') return [[-12,1,-12],[1,3.5,8],[12.5,-.5,-4]].map(([dx,dy,a]) => `<g transform="translate(${80+dx} ${(surface + dy).toFixed(1)}) rotate(${a})"><ellipse rx="5" ry="3.3" fill="#5a3a26"/><path d="M-3.6 .6Q0 -1.8 3.6 .4" fill="none" stroke="#2d1c12" stroke-width="1" stroke-linecap="round"/><ellipse cx="-1.6" cy="-1.5" rx="1.6" ry=".7" fill="#ffffff" opacity=".3"/></g>`).join("");
    if (type === 'olive') return `<path d="M65 ${y+40}L132 ${y-10}" stroke="#b08e5c" stroke-width="1.8" stroke-linecap="round"/><circle cx="133" cy="${y-11}" r="2" fill="#c9a46c"/>${[[92, y+20, 10.5, 7.6, -36], [110, y+7, 9, 6.6, -36]].map(([cx, cy, rx, ry, a]) => `<g transform="translate(${cx} ${cy}) rotate(${a})"><ellipse rx="${rx}" ry="${ry}" fill="#8f9a4f"/><ellipse cx="${rx * .45}" cy="0" rx="${rx * .3}" ry="${ry * .42}" fill="#c4543e"/><ellipse cx="${-rx * .35}" cy="${-ry * .45}" rx="${rx * .35}" ry="${ry * .2}" fill="#ffffff" opacity=".35"/></g>`).join("")}`;
    if (type === 'celery') return `<g transform="translate(${shape.right - 22} ${Math.min(shape.rim + 54, shape.bottom - 28)}) rotate(14)"><path d="M-5 30C-6 10 -5 -16 -2 -40L5 -40C7 -16 7 10 5 30Z" fill="#a6cc6a"/><path d="M0 28C0 8 0 -16 1.6 -38" fill="none" stroke="#d2e8a8" stroke-width="1.6"/><path d="M3.4 28C3.8 8 3.6 -16 4.4 -38" fill="none" stroke="#86b04f" stroke-width="1"/><g transform="translate(1.5 -40)">${leaf(-40, "#6fa64a", "#b6dca8", .8)}${leaf(14, "#7fb556", "#c3e2ae", .9)}${leaf(55, "#68a046", "#b6dca8", .7)}</g></g>`;
    const draw = rimItems[type] || rimItems.lime;
    return `<g transform="translate(${x} ${y})">${draw()}</g>`;
  }
  // Second decorations sit on the opposite rim or inside the drink.
  function extrasFor(options, shape, inner) {
    if (options.garnish === false) return "";
    const extras = (options.extras || []).filter(kind => kind !== options.garnish);
    if (inner) return extras.includes("straw") ? straw(shape, options.color) : "";
    return extras.filter(kind => rimItems[kind] && kind !== "cherry").slice(0, 2).map((kind, i) =>
      `<g transform="translate(${shape.left + 6 + i * 16} ${shape.rim + 4}) scale(-1 1)">${rimItems[kind]()}</g>`).join("");
  }
  function copperMug(shape, id) {
    return `<defs><linearGradient id="${id}" x1="${shape.left}" y1="0" x2="${shape.right}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8f4a24"/><stop offset=".32" stop-color="#e6a06a"/><stop offset=".58" stop-color="#c47640"/><stop offset="1" stop-color="#7f3f1e"/></linearGradient></defs><path d="${shape.path}" fill="url(#${id})"/>${Array.from({ length: 14 }, (_, i) => `<ellipse cx="${(shape.left + 8 + scatter(i, 11) * (shape.right - shape.left - 16)).toFixed(1)}" cy="${(shape.rim + 14 + scatter(i, 12) * (shape.bottom - shape.rim - 26)).toFixed(1)}" rx="3" ry="2" fill="#ffd2a6" opacity=".22"/>`).join("")}<rect x="${shape.left}" y="${shape.rim}" width="${shape.right - shape.left}" height="5" fill="#f2b98a" opacity=".55"/>`;
  }
  function glass(kind = "coupe", color = "#da9561", options = {}) {
    color = /^#[a-f\d]{6}$/i.test(color) ? color : "#da9561";
    const shape = glassShapes[kind] || glassShapes.coupe;
    const copper = kind === "mug" && options.copper;
    const edge = copper ? "#7a3f1f" : "#31535a";
    const stem = ["highball", "rocks", "mug", "shot", "bowl"].includes(kind)
      ? ""
      : `<path d="M80 ${shape.bottom}V170M52 174H108" fill="none" stroke="#31535a" stroke-width="4" stroke-linecap="round"/>`;
    return `<svg viewBox="0 0 160 190" aria-hidden="true" data-glass="${escape(kind)}"><ellipse cx="80" cy="181" rx="46" ry="5" fill="#203d3d" opacity=".09"/>${extrasFor({ ...options, color }, shape, true)}<path d="${shape.path}" fill="#e2eff0" fill-opacity=".23"/>${contents(shape, color, options)}${copper ? copperMug(shape, `copper-${++drawingID}`) : ""}<path d="${shape.path}" fill="none" stroke="${edge}" stroke-width="3" stroke-linejoin="round"/>${copper ? "" : reflection(shape.path, glassHighlights[kind] || glassHighlights.coupe)}${stem}${kind === "mug" ? `<path d="M115 66Q151 63 146 105Q145 130 115 130" fill="none" stroke="${copper ? "#b0663a" : "#31535a"}" stroke-width="5"/>` : ""}${rimFx(options.rim, shape)}${extrasFor(options, shape, false)}${garnish(options.garnish, shape, options)}</svg>`;
  }
  function drink(recipe) {
    const look = BarCore.drinkAppearance(recipe);
    return glass(look.glass, look.color, look.visual || {});
  }
  function vessel(kind, options = {}) {
    const lid = kind === "shaker"
      ? '<g class="vessel-lid"><path d="M42 62L57 35H103L118 62Z" fill="#dae3dc" stroke="#31535a" stroke-width="3"/><rect x="62" y="18" width="36" height="18" rx="5" fill="#31535a"/></g>'
      : '<ellipse cx="80" cy="62" rx="40" ry="7" fill="#dfe9df" stroke="#31535a" stroke-width="3"/>';
    const blender = kind === "blender" ? '<path d="M120 80Q151 82 140 128L114 136" fill="none" stroke="#31535a" stroke-width="6"/><rect x="45" y="155" width="70" height="22" rx="5" fill="#31535a"/><circle cx="80" cy="166" r="5" fill="#e0b788"/>' : '';
    const color = /^#[a-f\d]{6}$/i.test(options.color) ? options.color : "#d69867";
    return `<svg viewBox="0 0 160 190" aria-hidden="true" data-vessel="${escape(kind)}"><ellipse cx="80" cy="181" rx="46" ry="5" fill="#203d3d" opacity=".09"/><path d="${vesselShape.path}" fill="#b7c8c3" fill-opacity=".4"/>${contents(vesselShape, color, options)}<path d="${vesselShape.path}" fill="none" stroke="#31535a" stroke-width="3"/>${lid}${reflection(vesselShape.path, 'M49 79L54 125', 2.5, .35)}${blender}</svg>`;
  }
  const rim = (kind) => (glassShapes[kind] || vesselShape).rim;
  globalThis.BarArt = { escape, bottle, bottlePaths, glass, vessel, rim, drink };
})();
