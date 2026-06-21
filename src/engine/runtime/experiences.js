/* PortHub Engine - full-page experience packs.
   These are not themes. Each pack owns the composition, navigation, section
   names, and component metaphors while still reading the same ProfileData. */
(function () {
  "use strict";
  var PH = (window.PH = window.PH || {});
  var esc = function (s) { return PH.esc(s); };

  function arr(x) { return Array.isArray(x) ? x : []; }
  function identity(data) { return data.identity || { links: {} }; }
  function links(data) { return identity(data).links || {}; }
  function github(data) { return links(data).github || ""; }
  function email(data) { return links(data).email || ""; }
  function role(data) { return identity(data).role || "Developer"; }
  function name(data) { return identity(data).name || "Portfolio"; }
  function headline(data) { return identity(data).headline || "Building on the internet."; }

  function abilities(data) {
    var out = arr(data.abilities);
    if (out.length) return out.slice(0, 14);
    var seen = {};
    arr(data.languages).forEach(function (l) {
      if (!seen[l.label]) seen[l.label] = { label: l.label, source: "language" };
    });
    arr(data.projects).forEach(function (p) {
      arr(p.tech).forEach(function (t) {
        if (!seen[t]) seen[t] = { label: t, source: "project" };
      });
    });
    return Object.keys(seen).map(function (k) { return seen[k]; }).slice(0, 14);
  }

  function statCards(data, kind) {
    return arr(data.stats).map(function (s, i) {
      return '<div class="xp-card xp-stat reveal" data-kind="' + kind + '" style="--i:' + i + '">' +
        '<b>' + esc(s.value) + '</b><span>' + esc(s.label) + '</span></div>';
    }).join("");
  }

  function abilityCloud(data, kind) {
    return '<div class="xp-abilities" data-kind="' + kind + '">' + abilities(data).map(function (a, i) {
      return '<span class="xp-ability reveal" style="--i:' + i + '">' +
        '<em>' + String(i + 1).padStart(2, "0") + '</em>' + esc(a.label) + '</span>';
    }).join("") + "</div>";
  }

  function languageList(data, kind) {
    return '<div class="xp-languages" data-kind="' + kind + '">' + arr(data.languages).map(function (l, i) {
      return '<span class="xp-lang reveal" style="--i:' + i + '">' + esc(l.label) + '</span>';
    }).join("") + "</div>";
  }

  function projectCard(p, i, kind) {
    var tech = arr(p.tech).slice(0, 4).map(function (t) {
      return '<span>' + esc(t) + '</span>';
    }).join("");
    var stars = p.stars ? '<small>STARS ' + esc(p.stars) + '</small>' : "";
    return '<a class="xp-card xp-project reveal" data-kind="' + kind + '" style="--i:' + i + '" href="' + esc(p.repoUrl) + '" target="_blank" rel="noreferrer">' +
      '<div class="xp-card-glow"></div><header><b>' + esc(p.name) + '</b>' + stars + '</header>' +
      '<p>' + esc(p.blurb || "Repository signal captured.") + '</p><div class="xp-tech">' + tech + '</div></a>';
  }

  function projects(data, kind, max) {
    return arr(data.projects).slice(0, max || 8).map(function (p, i) {
      return projectCard(p, i, kind);
    }).join("");
  }

  function nav(items, className) {
    return '<nav class="xp-nav ' + className + '" aria-label="Portfolio sections">' +
      items.map(function (it, i) {
        return '<a href="#' + it.id + '" class="' + (i === 0 ? "active" : "") + '"><span>' + esc(it.k) + '</span>' + esc(it.label) + '</a>';
      }).join("") + "</nav>";
  }

  function contactBlock(data, kind) {
    var l = links(data);
    return '<div class="xp-contact-actions">' +
      (email(data) ? '<button class="xp-action xp-copy" data-copy="' + esc(email(data)) + '">' + esc(email(data)) + '</button>' : "") +
      (l.github ? '<a class="xp-action" href="' + esc(l.github) + '" target="_blank" rel="noreferrer">GitHub</a>' : "") +
      (l.site ? '<a class="xp-action" href="' + esc(l.site) + '" target="_blank" rel="noreferrer">Website</a>' : "") +
      '</div>';
  }

  function terminalNexus(data) {
    var items = [
      { id: "hero", k: "00", label: "root" },
      { id: "sys", k: "01", label: "sys_info" },
      { id: "mods", k: "02", label: "modules" },
      { id: "repos", k: "03", label: "dir_list" },
      { id: "ping", k: "04", label: "ping" },
    ];
    return '<div class="xp xp-terminalNexus">' + nav(items, "xp-rail") +
      '<main class="xp-flow">' +
      '<section id="hero" class="xp-section xp-hero"><div class="xp-kicker">LOC_INTERNET // SYS_STATUS: ONLINE</div>' +
      '<h1 class="ph-display xp-title xp-scramble" data-text="' + esc(name(data)) + '">' + esc(name(data)) + '</h1>' +
      '<div class="xp-role">&gt;' + esc(role(data)) + '<span></span></div><p class="xp-copyline">// ' + esc(headline(data)) + '</p>' +
      '<div class="xp-terminal-actions"><a href="#repos">ACCESS_DATA</a><a href="#ping">PING_USER</a></div></section>' +
      '<section id="sys" class="xp-section xp-split"><div><h2>SYS_INFO // ABOUT</h2><p>' + esc(headline(data)) + '</p></div><div class="xp-stat-stack">' + statCards(data, "terminal") + '</div></section>' +
      '<section id="mods" class="xp-section"><h2>MODULES // ABILITIES</h2>' + abilityCloud(data, "terminal") + languageList(data, "terminal") + '</section>' +
      '<section id="repos" class="xp-section"><h2>DIR_LIST // PROJECTS</h2><div class="xp-grid">' + projects(data, "terminal", 8) + '</div></section>' +
      '<section id="ping" class="xp-section xp-contact"><h2>INITIATE_HANDSHAKE</h2>' + contactBlock(data, "terminal") + '</section>' +
      '</main><div class="xp-corner xp-corner-a"></div><div class="xp-corner xp-corner-b"></div></div>';
  }

  function directorCut(data) {
    var items = [
      { id: "hero", k: "I", label: "Prologue" },
      { id: "arc", k: "II", label: "Character Arc" },
      { id: "missions", k: "III", label: "Side Missions" },
      { id: "arsenal", k: "IV", label: "Arsenal" },
      { id: "credits", k: "V", label: "Credits" },
    ];
    return '<div class="xp xp-directorCut"><div class="xp-letter top"></div><div class="xp-letter bottom"><span class="xp-timeline"><i class="xp-timeline-fill"></i></span></div>' +
      nav(items, "xp-filmnav") + '<main class="xp-film">' +
      '<section id="hero" class="xp-section xp-hero"><span class="xp-act">ACT I</span><p>A FILM BY</p><h1 class="ph-display xp-title xp-scramble" data-text="' + esc(name(data)) + '">' + esc(name(data)) + '</h1><b>STARRING AS: ' + esc(role(data)) + '</b><small>' + esc(headline(data)) + '</small></section>' +
      '<section id="arc" class="xp-section xp-right"><span class="xp-act">ACT II</span><h2>CHARACTER ARC</h2><p>' + esc(headline(data)) + '</p><div class="xp-stat-row">' + statCards(data, "director") + '</div></section>' +
      '<section id="missions" class="xp-section"><span class="xp-act">ACT III</span><h2>SIDE MISSIONS</h2>' + abilityCloud(data, "director") + '</section>' +
      '<section id="arsenal" class="xp-section"><span class="xp-act">ACT IV</span><h2>WEAPONS CACHE</h2><div class="xp-grid">' + projects(data, "director", 6) + '</div></section>' +
      '<section id="credits" class="xp-section xp-contact"><h2>END OF LINE</h2><p>DIRECTED BY</p><strong>' + esc(name(data)) + '</strong>' + contactBlock(data, "director") + '</section>' +
      '</main></div>';
  }

  function desktopOS(data) {
    return '<div class="xp xp-desktopOS"><div class="xp-menubar"><b>PortHubOS</b><span>' + esc(name(data)) + '</span><i>online</i></div>' +
      '<main class="xp-desktop">' +
      '<section id="hero" class="xp-window xp-window-main reveal"><header><i></i><i></i><i></i><span>profile.app</span></header><div><p>$ whoami --verbose</p><h1 class="ph-display xp-scramble" data-text="' + esc(name(data)) + '">' + esc(name(data)) + '</h1><b>' + esc(role(data)) + '</b><p>' + esc(headline(data)) + '</p></div></section>' +
      '<section id="stats" class="xp-window reveal"><header><i></i><i></i><i></i><span>status.monitor</span></header><div class="xp-stat-grid">' + statCards(data, "desktop") + '</div></section>' +
      '<section id="abilities" class="xp-window reveal"><header><i></i><i></i><i></i><span>abilities.folder</span></header>' + abilityCloud(data, "desktop") + '</section>' +
      '<section id="projects" class="xp-window xp-window-wide reveal"><header><i></i><i></i><i></i><span>projects.finder</span></header><div class="xp-grid">' + projects(data, "desktop", 8) + '</div></section>' +
      '<section id="contact" class="xp-window reveal"><header><i></i><i></i><i></i><span>network.share</span></header>' + contactBlock(data, "desktop") + '</section>' +
      '</main><div class="xp-dock"><a href="#hero">Profile</a><a href="#projects">Repos</a><a href="#contact">Share</a></div></div>';
  }

  function gameHud(data) {
    return '<div class="xp xp-gameHud">' + nav([
      { id: "hero", k: "P1", label: "Player" },
      { id: "abilities", k: "AB", label: "Abilities" },
      { id: "inventory", k: "IV", label: "Inventory" },
      { id: "lobby", k: "CO", label: "Lobby" },
    ], "xp-hudnav") + '<main class="xp-flow">' +
      '<section id="hero" class="xp-section xp-player"><div class="xp-player-card"><span>LEVEL ' + Math.max(7, arr(data.projects).length * 11) + '</span><h1 class="ph-display xp-scramble" data-text="' + esc(name(data)) + '">' + esc(name(data)) + '</h1><b>' + esc(role(data)) + '</b><p>' + esc(headline(data)) + '</p></div><div class="xp-stat-stack">' + statCards(data, "game") + '</div></section>' +
      '<section id="abilities" class="xp-section"><h2>ABILITY TREE</h2>' + abilityCloud(data, "game") + languageList(data, "game") + '</section>' +
      '<section id="inventory" class="xp-section"><h2>INVENTORY</h2><div class="xp-grid">' + projects(data, "game", 8) + '</div></section>' +
      '<section id="lobby" class="xp-section xp-contact"><h2>MULTIPLAYER LOBBY</h2>' + contactBlock(data, "game") + '</section>' +
      '</main></div>';
  }

  function liquidGlass(data) {
    return '<div class="xp xp-liquidGlass">' + nav([
      { id: "hero", k: "01", label: "Signal" },
      { id: "craft", k: "02", label: "Craft" },
      { id: "work", k: "03", label: "Work" },
      { id: "contact", k: "04", label: "Contact" },
    ], "xp-topnav") + '<main class="xp-flow">' +
      '<section id="hero" class="xp-section xp-hero"><div class="xp-glass-hero reveal"><p>Interactive portfolio for</p><h1 class="ph-display xp-scramble" data-text="' + esc(name(data)) + '">' + esc(name(data)) + '</h1><b>' + esc(role(data)) + '</b><small>' + esc(headline(data)) + '</small></div></section>' +
      '<section id="craft" class="xp-section xp-split"><div><h2>Craft Stack</h2><p>' + esc(headline(data)) + '</p></div><div>' + abilityCloud(data, "glass") + languageList(data, "glass") + '</div></section>' +
      '<section id="work" class="xp-section"><h2>Selected Work</h2><div class="xp-grid xp-grid-large">' + projects(data, "glass", 8) + '</div></section>' +
      '<section id="contact" class="xp-section xp-contact"><h2>Open Channel</h2>' + contactBlock(data, "glass") + '</section>' +
      '</main></div>';
  }

  function cosmicLab(data) {
    return '<div class="xp xp-cosmicLab">' + nav([
      { id: "hero", k: "A", label: "Launch" },
      { id: "telemetry", k: "B", label: "Telemetry" },
      { id: "experiments", k: "C", label: "Experiments" },
      { id: "transmit", k: "D", label: "Transmit" },
    ], "xp-orbitnav") + '<main class="xp-flow">' +
      '<section id="hero" class="xp-section xp-hero"><div class="xp-orbit-label">DEEP FIELD PROFILE</div><h1 class="ph-display xp-scramble" data-text="' + esc(name(data)) + '">' + esc(name(data)) + '</h1><b>' + esc(role(data)) + '</b><p>' + esc(headline(data)) + '</p></section>' +
      '<section id="telemetry" class="xp-section xp-split"><div><h2>Telemetry</h2><div class="xp-stat-stack">' + statCards(data, "cosmic") + '</div></div><div>' + abilityCloud(data, "cosmic") + '</div></section>' +
      '<section id="experiments" class="xp-section"><h2>Experiments</h2><div class="xp-grid">' + projects(data, "cosmic", 8) + '</div></section>' +
      '<section id="transmit" class="xp-section xp-contact"><h2>Transmit Signal</h2>' + contactBlock(data, "cosmic") + '</section>' +
      '</main></div>';
  }

  function scramble(el) {
    var text = el.getAttribute("data-text") || el.textContent || "";
    var glyphs = "!<>-_\\/[]{}=+*^?#________";
    var frame = 0;
    var timer = setInterval(function () {
      el.textContent = text.split("").map(function (ch, i) {
        if (ch === " ") return " ";
        if (i < frame / 2) return ch;
        return glyphs[(Math.random() * glyphs.length) | 0];
      }).join("");
      frame++;
      if (frame > text.length * 2 + 8) {
        clearInterval(timer);
        el.textContent = text;
      }
    }, 24);
  }

  function mount() {
    document.querySelectorAll(".xp-card,.xp-project,.xp-action,.xp-window").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (e.clientX - r.left) + "px");
        el.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
    document.querySelectorAll(".xp-scramble").forEach(function (el) {
      el.addEventListener("pointerenter", function () { scramble(el); });
    });
    document.querySelectorAll(".xp-copy").forEach(function (el) {
      el.addEventListener("click", function () {
        var v = el.getAttribute("data-copy") || "";
        if (navigator.clipboard && v) navigator.clipboard.writeText(v);
        el.setAttribute("data-copied", "true");
        setTimeout(function () { el.removeAttribute("data-copied"); }, 1400);
      });
    });
    var navLinks = document.querySelectorAll(".xp-nav a");
    if ("IntersectionObserver" in window && navLinks.length) {
      var byId = {};
      navLinks.forEach(function (a) { byId[(a.getAttribute("href") || "").slice(1)] = a; });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          Object.keys(byId).forEach(function (id) { byId[id].classList.toggle("active", id === en.target.id); });
        });
      }, { threshold: 0.42 });
      Object.keys(byId).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) io.observe(el);
      });
    }
  }

  PH.experiences = {
    terminalNexus: { render: terminalNexus, mount: mount },
    directorCut: { render: directorCut, mount: mount },
    desktopOS: { render: desktopOS, mount: mount },
    gameHud: { render: gameHud, mount: mount },
    liquidGlass: { render: liquidGlass, mount: mount },
    cosmicLab: { render: cosmicLab, mount: mount },
  };
})();
