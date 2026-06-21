/* PortHub Engine — layout archetypes (hero treatments per archetype). */
(function () {
  "use strict";
  var PH = (window.PH = window.PH || {});
  var esc = function (s) { return PH.esc(s); };

  function cta(data, spec) {
    var gh = data.identity.links && data.identity.links.github;
    var out = '<a class="ph-btn" data-skin="' + spec.skins.button + '" href="#projects">View work</a>';
    if (gh) out += '<a class="ph-btn" data-skin="ghost" href="' + esc(gh) + '" target="_blank" rel="noreferrer">GitHub</a>';
    return '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:32px">' + out + "</div>";
  }
  function bits(data) {
    return {
      name: esc(data.identity.name || ""),
      role: esc(data.identity.role || ""),
      headline: esc(data.identity.headline || ""),
    };
  }

  var HEROES = {
    terminal: function (data, spec) {
      var b = bits(data);
      return '<section class="ph-hero" id="hero"><div class="ph-wrap"><div class="ph-card" data-skin="terminalWindow" style="max-width:760px">' +
        '<div class="tw-bar"><i></i><i></i><i></i></div>' +
        '<div style="color:var(--muted);margin-bottom:6px">$ whoami --verbose</div>' +
        '<h1 class="ph-display">' + b.name + '</h1><div class="ph-role">' + b.role + '</div>' +
        '<p class="ph-headline">' + b.headline + '</p>' +
        '<div id="ph-gimmick" style="color:var(--accent);font-family:var(--font-display);margin-top:12px;min-height:1.4em"></div>' +
        cta(data, spec) + "</div></div></section>";
    },
    editorial: function (data, spec) {
      var b = bits(data);
      return '<section class="ph-hero" id="hero"><div class="ph-wrap">' +
        '<div style="color:var(--accent);text-transform:uppercase;letter-spacing:.22em;font-size:13px;margin-bottom:18px">' + b.role + "</div>" +
        '<h1 class="ph-display">' + b.name + '</h1><p class="ph-headline">' + b.headline + "</p>" +
        '<div id="ph-gimmick"></div>' + cta(data, spec) + "</div></section>";
    },
    brutalist: function (data, spec) {
      var b = bits(data);
      return '<section class="ph-hero" id="hero"><div class="ph-wrap">' +
        '<h1 class="ph-display" style="text-transform:uppercase">' + b.name + '</h1>' +
        '<div class="ph-role">' + b.role + '</div><p class="ph-headline">' + b.headline + "</p>" +
        '<div id="ph-gimmick"></div>' + cta(data, spec) + "</div></section>";
    },
    minimal: function (data, spec) {
      var b = bits(data);
      return '<section class="ph-hero" id="hero"><div class="ph-wrap" style="max-width:760px">' +
        '<h1 class="ph-display">' + b.name + '</h1><div class="ph-role">' + b.role + "</div>" +
        '<p class="ph-headline">' + b.headline + '</p><div id="ph-gimmick"></div>' + cta(data, spec) + "</div></section>";
    },
    bento: function (data, spec) {
      var b = bits(data);
      var s0 = (data.stats && data.stats[0]) || null;
      var tile = s0 ? '<div class="ph-card" data-skin="glass"><div class="ph-stat"><div class="v">' + esc(s0.value) + '</div><div class="l">' + esc(s0.label) + "</div></div></div>" : "";
      return '<section class="ph-hero" id="hero"><div class="ph-wrap"><div class="ph-grid cols-2" style="align-items:center">' +
        '<div><h1 class="ph-display">' + b.name + '</h1><div class="ph-role">' + b.role + "</div><p class=\"ph-headline\">" + b.headline + '</p><div id="ph-gimmick"></div>' + cta(data, spec) + "</div>" +
        tile + "</div></div></section>";
    },
  };

  PH.archetypes = {
    hero: function (data, spec) {
      var fn = HEROES[spec.archetype] || HEROES.minimal;
      return fn(data, spec);
    },
  };
})();
