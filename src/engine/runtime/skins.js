/* PortHub Engine — component skins (markup variants; appearance via base.css). */
(function () {
  "use strict";
  var PH = (window.PH = window.PH || {});
  var esc = function (s) { return PH.esc(s); };
  PH.skins = {
    statCard: function (s, skin) {
      return '<div class="ph-card ph-stat" data-skin="' + skin + '"><div class="v">' + esc(s.value) + '</div><div class="l">' + esc(s.label) + "</div></div>";
    },
    projectCard: function (p, skin, btnSkin) {
      var chrome = skin === "terminalWindow" ? '<div class="tw-bar"><i></i><i></i><i></i></div>' : "";
      var stars = p.stars ? '<span class="ph-pill">★ ' + esc(p.stars) + "</span>" : "";
      var tech = (p.tech || []).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("");
      var links = '<a href="' + esc(p.repoUrl) + '" target="_blank" rel="noreferrer">repo →</a>';
      if (p.demoUrl) links += '<a href="' + esc(p.demoUrl) + '" target="_blank" rel="noreferrer">demo →</a>';
      return '<div class="ph-card ph-proj" data-skin="' + skin + '">' + chrome +
        "<h3>" + esc(p.name) + stars + "</h3><p>" + esc(p.blurb) + '</p><div class="tech">' + tech + '</div><div class="links">' + links + "</div></div>";
    },
    langbar: function (langs, skin) {
      langs = langs || [];
      if (skin === "chips") {
        return '<div class="ph-lang" data-skin="chips">' + langs.map(function (l) {
          return '<span class="chip">' + esc(l.label) + " <b>" + esc(l.share) + "%</b></span>";
        }).join("") + "</div>";
      }
      if (skin === "dots") {
        return '<div class="ph-lang" data-skin="dots">' + langs.map(function (l) {
          var on = Math.max(1, Math.round(l.share / 10)), d = "";
          for (var i = 0; i < 10; i++) d += '<span class="dot' + (i < on ? "" : " off") + '"></span>';
          return '<div class="row"><div class="top"><span>' + esc(l.label) + "</span><span>" + esc(l.share) + '%</span></div><div class="track">' + d + "</div></div>";
        }).join("") + "</div>";
      }
      if (skin === "ascii") {
        return '<div class="ph-lang" data-skin="ascii">' + langs.map(function (l) {
          var on = Math.max(1, Math.round(l.share / 10)), bar = "";
          for (var i = 0; i < 10; i++) bar += i < on ? "█" : "░";
          return '<div class="row"><div class="top"><span>' + esc(l.label) + '</span></div><div class="asciibar">[' + bar + "] " + esc(l.share) + "%</div></div>";
        }).join("") + "</div>";
      }
      // bars (default)
      return '<div class="ph-lang" data-skin="bars">' + langs.map(function (l) {
        return '<div class="row"><div class="top"><span>' + esc(l.label) + "</span><span>" + esc(l.share) + '%</span></div><div class="track"><div class="fill" style="--w:' + Math.max(2, l.share) + '%"></div></div></div>';
      }).join("") + "</div>";
    },
  };
})();
