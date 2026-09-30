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
    };
    const strokes = (item.drawing || [])
      .map(
        (points) =>
          `<polyline points="${points.map((p) => p.map(Number).join(",")).join(" ")}"/>`,
      )
      .join("");
    return `<svg viewBox="0 0 110 170" aria-hidden="true"><ellipse cx="55" cy="159" rx="34" ry="5" fill="#203d3d" opacity=".1"/><path d="${paths[item.shape] || paths.bottle}" fill="${color}" stroke="#29494d" stroke-width="2.5"/><path d="M36 77V140" stroke="white" stroke-width="5" opacity=".3" stroke-linecap="round"/><rect x="41" y="11" width="22" height="12" rx="3" fill="#29494d"/><rect x="32" y="83" width="45" height="41" rx="5" fill="#fff8e8"/><path d="M43 100H65M47 107H61" stroke="#29494d" opacity=".5" stroke-width="2"/><g fill="none" stroke="#29494d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" transform="translate(14 40) scale(.42)">${strokes}</g></svg>`;
  }
  const glassShapes = {
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
    return `<defs><clipPath id="${id}"><path d="${shape.path}"/></clipPath><clipPath id="${id}-ice"><path d="${shape.path}"/><rect x="${shape.left}" y="-140" width="${shape.right-shape.left}" height="${shape.rim+140}"/></clipPath></defs>
      <g clip-path="url(#${id})" class="drink-liquid" fill="${color}">${level ? `<rect x="0" y="${surface}" width="160" height="190" fill-opacity=".65"/><ellipse cx="80" cy="${surface}" rx="70" ry="3" fill-opacity=".3"/>` : ""}</g>
      <g clip-path="url(#${id}-ice)" class="drink-ice">${options.ice ? shape.cubes.map(([x,y,size,angle], i) => `<g transform="translate(${x} ${y}) rotate(${angle})"><g class="ice-piece ${options.animateIce ? "ice-falling" : ""}" style="--ice-start:${shape.rim-y-70}px;--ice-delay:${i*0.32}s"><rect x="${-size/2}" y="${-size/2}" width="${size}" height="${size}" rx="5" fill="#dceff2" fill-opacity=".8" stroke="#7ca5b0" stroke-width="1.3"/><path d="M${-size/2+4} ${size/2-5}V${-size/2+5}H${size/2-5}" fill="none" stroke="white" stroke-opacity=".9" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M${-size/2+4} ${size/2-4}L${size/2-4} ${-size/2+4}V${size/2-4}Z" fill="#92bfca" fill-opacity=".23"/></g></g>`).join("") : ""}</g>`;
  }
  function glass(kind = "coupe", color = "#da9561", options = {}) {
    color = /^#[a-f\d]{6}$/i.test(color) ? color : "#da9561";
    const shape = glassShapes[kind] || glassShapes.coupe;
    const stem = ["highball", "rocks"].includes(kind)
      ? ""
      : '<path d="M80 113V170M52 174H108" fill="none" stroke="#31535a" stroke-width="4" stroke-linecap="round"/>';
    return `<svg viewBox="0 0 160 190" aria-hidden="true" data-glass="${escape(kind)}"><ellipse cx="80" cy="181" rx="46" ry="5" fill="#203d3d" opacity=".09"/><path d="${shape.path}" fill="#e2eff0" fill-opacity=".23"/>${contents(shape, color, options)}<path d="${shape.path}" fill="none" stroke="#31535a" stroke-width="3" stroke-linejoin="round"/><path d="M${shape.left+10} ${shape.rim+13}l6 19" stroke="white" stroke-width="4" stroke-linecap="round" opacity=".65"/>${stem}${options.garnish === false ? "" : '<circle cx="118" cy="48" r="18" fill="#d0d792" stroke="#687653" stroke-width="3"/><path d="M105 48H131M118 35V61" stroke="#fff8e8" stroke-width="2"/>'}</svg>`;
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
  globalThis.BarArt = { escape, bottle, glass, vessel, rim };
})();
