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
  function bottle(item = {}) {
    const color = /^#[a-f\d]{6}$/i.test(item.color) ? item.color : "#79a883";
    const paths = {
      bottle:
        "M42 15H62V49Q62 56 76 67V145Q76 153 68 153H36Q28 153 28 145V67Q42 56 42 49Z",
      round: "M43 18H61V55C98 69 96 150 66 153H38C8 150 6 69 43 55Z",
      carton: "M28 41L40 18H69L82 41V153H28Z",
      jar: "M25 49Q25 40 35 40H72Q82 40 82 49V145Q82 153 72 153H35Q25 153 25 145Z",
      whiskey: 'M43 18H65V51L83 64V145Q83 153 75 153H33Q25 153 25 145V64L43 51Z',
      gin: 'M44 17H64V45Q64 49 83 57V147L75 153H33L25 147V57Q44 49 44 45Z',
      vodka: 'M43 17H65V42C65 53 81 53 81 73V145Q81 153 72 153H36Q27 153 27 145V73C27 53 43 53 43 42Z',
      tequila: 'M44 44H65V63Q87 67 88 85V137Q87 153 69 153H40Q21 153 21 137V85Q22 67 44 63Z',
      rum: 'M46 14H62V66Q76 69 76 82V146Q76 153 67 153H41Q32 153 32 146V82Q32 69 46 66Z',
    };
    const cap = item.shape === 'carton'
      ? '<path d="M40 18H69M28 41H82M40 18L52 41L69 18" fill="none" stroke="#fff8e8" stroke-width="3"/>'
      : item.shape === 'jar' ? '<rect data-cap="jar" x="25" y="34" width="57" height="13" rx="4" fill="#ba9560" stroke="#29494d" stroke-width="2"/><path d="M30 39H77" stroke="#e6c892"/>'
      : item.shape === 'tequila' ? '<rect x="41" y="32" width="27" height="17" rx="4" fill="#ba895b" stroke="#765336" stroke-width="2"/>'
      : `<rect data-cap="bottle" x="${item.shape === 'rum' ? 44 : 41}" y="10" width="${item.shape === 'rum' ? 20 : 26}" height="14" rx="3" fill="#29494d"/><path d="M45 15H61" stroke="#c7a268" stroke-width="2"/>`;
    const strokes = (item.drawing || [])
      .map(
        (points) =>
          `<polyline points="${points.map((p) => p.map(Number).join(",")).join(" ")}"/>`,
      )
      .join("");
    return `<svg viewBox="0 0 110 170" aria-hidden="true" data-bottle="${escape(item.shape || 'bottle')}"><ellipse cx="55" cy="159" rx="34" ry="5" fill="#203d3d" opacity=".1"/><path d="${paths[item.shape] || paths.bottle}" fill="${color}" stroke="#29494d" stroke-width="2.5"/><path d="M36 77V140" stroke="white" stroke-width="5" opacity=".3" stroke-linecap="round"/>${cap}<rect x="32" y="83" width="45" height="41" rx="${item.shape === 'whiskey' ? 1 : 8}" fill="${item.shape === 'whiskey' ? '#293b3b' : '#fff8e8'}" stroke="#d3b982"/><path d="M43 100H65M47 107H61" stroke="${item.shape === 'whiskey' ? '#ecd7ae' : '#29494d'}" opacity=".7" stroke-width="2"/><g fill="none" stroke="#29494d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" transform="translate(14 40) scale(.42)">${strokes}</g></svg>`;
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
  let drawingID = 0;
  function contents(shape, color, options) {
    const id = `drink-contents-${++drawingID}`;
    const level = Math.max(0, Math.min(0.9, options.level ?? 0.7));
    const surface = shape.bottom - (shape.bottom - shape.rim) * level;
    const layers = options.layers;
    const gradient = layers ? `<linearGradient id="${id}-gradient" x1="0" y1="${surface}" x2="0" y2="${shape.bottom}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${layers[0]}"/><stop offset=".38" stop-color="${layers[0]}"/><stop offset=".72" stop-color="${layers[1]}"/><stop offset="1" stop-color="${layers[1]}"/></linearGradient>` : '';
    return `<defs>${gradient}<clipPath id="${id}"><path d="${shape.path}"/></clipPath><clipPath id="${id}-ice"><path d="${shape.path}"/><rect x="${shape.left}" y="-140" width="${shape.right-shape.left}" height="${shape.rim+140}"/></clipPath></defs>
      <g clip-path="url(#${id})" class="drink-liquid" fill="${color}">${level ? `<rect x="0" y="${surface}" width="160" height="${shape.bottom-surface}" fill="${layers ? `url(#${id}-gradient)` : color}" fill-opacity=".85"/><ellipse cx="80" cy="${surface}" rx="70" ry="3" fill-opacity=".3"/>${options.foam ? `<rect x="0" y="${surface}" width="160" height="7" fill="#fff4db" opacity=".9"/>` : ''}` : ""}</g>
      <g clip-path="url(#${id}-ice)" class="drink-ice">${options.ice ? shape.cubes.map(([x,y,size,angle], i) => `<g transform="translate(${x} ${y}) rotate(${angle})"><g class="ice-piece ${options.animateIce ? "ice-falling" : ""}" style="--ice-start:${shape.rim-y-70}px;--ice-delay:${i*0.32}s"><rect x="${-size/2}" y="${-size/2}" width="${size}" height="${size}" rx="5" fill="#dceff2" fill-opacity=".8" stroke="#7ca5b0" stroke-width="1.3"/><path d="M${-size/2+4} ${size/2-5}V${-size/2+5}H${size/2-5}" fill="none" stroke="white" stroke-opacity=".9" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M${-size/2+4} ${size/2-4}L${size/2-4} ${-size/2+4}V${size/2-4}Z" fill="#92bfca" fill-opacity=".23"/></g></g>`).join("") : ""}</g>`;
  }
  function glass(kind = "coupe", color = "#da9561", options = {}) {
    color = /^#[a-f\d]{6}$/i.test(color) ? color : "#da9561";
    const shape = glassShapes[kind] || glassShapes.coupe;
    const stem = ["highball", "rocks", "mug", "shot", "bowl"].includes(kind)
      ? ""
      : `<path d="M80 ${shape.bottom}V170M52 174H108" fill="none" stroke="#31535a" stroke-width="4" stroke-linecap="round"/>`;
    return `<svg viewBox="0 0 160 190" aria-hidden="true" data-glass="${escape(kind)}"><ellipse cx="80" cy="181" rx="46" ry="5" fill="#203d3d" opacity=".09"/><path d="${shape.path}" fill="#e2eff0" fill-opacity=".23"/>${contents(shape, color, options)}<path d="${shape.path}" fill="none" stroke="#31535a" stroke-width="3" stroke-linejoin="round"/><path d="M${shape.left+10} ${shape.rim+13}l6 19" stroke="white" stroke-width="4" stroke-linecap="round" opacity=".65"/>${stem}${kind === "mug" ? '<path d="M115 66Q151 63 146 105Q145 130 115 130" fill="none" stroke="#31535a" stroke-width="5"/>' : ""}${garnish(options.garnish, shape)}</svg>`;
  }
  function garnish(type, shape) {
    if (type === false || type === 'none') return '';
    const x = shape.right - 5, y = shape.rim + 4;
    if (type === 'mint') return `<g transform="translate(${x} ${y})"><path d="M0 18Q-31 -14 -12 -18Q1 -15 0 18Q1 -20 18 -20Q31 -2 0 18" fill="#5b975d" stroke="#366b45" stroke-width="2"/></g>`;
    if (type === 'coffee') return '<g fill="#503526"><ellipse cx="66" cy="67" rx="5" ry="3"/><ellipse cx="80" cy="71" rx="5" ry="3"/><ellipse cx="90" cy="63" rx="5" ry="3"/></g>';
    if (type === 'olive') return `<path d="M65 ${y+40}L132 ${y-10}" stroke="#ab8753" stroke-width="2"/><ellipse cx="92" cy="${y+20}" rx="11" ry="8" fill="#929b55"/><circle cx="98" cy="${y+18}" r="3" fill="#bc6754"/>`;
    const color = type === 'orange' ? '#f3ac4e' : type === 'lemon' ? '#e8d772' : '#bed183';
    return `<g transform="translate(${x} ${y})"><circle r="17" fill="${color}" stroke="#8c9250" stroke-width="2"/><circle r="13" fill="none" stroke="#fff1bd"/><path d="M-13 0H13M0 -13V13M-9 -9L9 9M-9 9L9 -9" stroke="#fff1bd" stroke-width="1.5"/></g>`;
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
    return `<svg viewBox="0 0 160 190" aria-hidden="true" data-vessel="${escape(kind)}"><ellipse cx="80" cy="181" rx="46" ry="5" fill="#203d3d" opacity=".09"/><path d="${vesselShape.path}" fill="#b7c8c3" fill-opacity=".4"/>${contents(vesselShape, color, options)}<path d="${vesselShape.path}" fill="none" stroke="#31535a" stroke-width="3"/>${lid}<path d="M56 79L63 151" stroke="white" stroke-width="5" opacity=".5"/>${blender}</svg>`;
  }
  const rim = (kind) => (glassShapes[kind] || vesselShape).rim;
  globalThis.BarArt = { escape, bottle, glass, vessel, rim, drink };
})();
