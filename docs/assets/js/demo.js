/* Asclepius demo page: builds the pins, view buttons, legend, detail panel and
   equipment list around the 3D rig engine (assets/js/asclepius-rig-engine.js). */
(function () {
  "use strict";
  var R = window.AsclepiusRig;
  var root = document.querySelector(".asc");
  var stage = document.getElementById("rig-stage");
  var canvas = document.getElementById("rig-canvas");
  var loading = document.getElementById("rig-loading");
  if (!R) { loading.textContent = "The rig could not load: the 3D files were blocked."; return; }

  var ITEMS = R.ITEMS, WIRES = R.WIRES;
  var VIEWS = [["overview", "Overview"], ["operator", "Operator"], ["tray", "Electronics"], ["pedals", "Pedals"], ["screen", "Screen"]];
  var st = { selected: null, view: "overview", labels: true, wires: true };
  var engine = null;
  var pad = function (n) { return String(n).padStart(2, "0"); };
  var el = function (tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === "text") e.textContent = attrs[k];
      else if (k === "style") e.style.cssText = attrs[k];
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  };

  /* Pins over the canvas (the engine positions them every frame) */
  var pins = {}, pinWrap = document.getElementById("rig-pins");
  ITEMS.forEach(function (it) {
    var b = el("button", { type: "button", "class": "pin", "aria-label": it.n + ". " + it.name, onclick: function () { choose(it.id); } },
      [String(it.n), el("span", { text: it.name })]);
    pins[it.id] = b; pinWrap.appendChild(b);
  });

  /* View buttons and toggles */
  var viewBtns = {}, viewWrap = document.getElementById("rig-views");
  VIEWS.forEach(function (v) {
    var b = el("button", { type: "button", "class": "tb", text: v[1], onclick: function () { pickView(v[0]); } });
    viewBtns[v[0]] = b; viewWrap.appendChild(b);
  });
  var labelsBtn = document.getElementById("rig-labels"), wiresBtn = document.getElementById("rig-wires");
  labelsBtn.addEventListener("click", function () { st.labels = !st.labels; render(); if (engine) engine.setLabels(st.labels); });
  wiresBtn.addEventListener("click", function () { st.wires = !st.wires; render(); if (engine) engine.setWires(st.wires); });

  /* Wire legend */
  var legend = document.getElementById("rig-legend");
  WIRES.forEach(function (w) {
    legend.appendChild(el("span", { style: "display: inline-flex; align-items: center; gap: 7px" },
      [el("span", { style: "width: 18px; height: 4px; border-radius: 2px; background: " + w.color }), w.label]));
  });

  /* Equipment list */
  var groups = [], listBtns = {}, list = document.getElementById("rig-groups");
  ITEMS.forEach(function (it) { if (groups.indexOf(it.group) < 0) groups.push(it.group); });
  groups.forEach(function (g) {
    var box = el("div", { style: "display: grid; gap: 2px" },
      [el("div", { text: g, style: "font: 600 11px var(--body); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); padding: 4px 8px" })]);
    ITEMS.filter(function (it) { return it.group === g; }).forEach(function (it) {
      var b = el("button", { type: "button", "class": "item", onclick: function () { choose(st.selected === it.id ? null : it.id); } }, [
        el("span", { text: pad(it.n), style: "font: 600 11.5px var(--mono); color: var(--accent)" }),
        el("span", { text: it.name }),
        el("span", { text: "×" + it.qty, style: "font: 400 12px var(--mono); color: var(--muted)" })
      ]);
      listBtns[it.id] = b; box.appendChild(b);
    });
    list.appendChild(box);
  });

  /* Detail panel */
  var ov = document.getElementById("rig-overview"), sel = document.getElementById("rig-selected");
  var selMeta = document.getElementById("sel-meta"), selName = document.getElementById("sel-name"),
      selQty = document.getElementById("sel-qty"), selRole = document.getElementById("sel-role"), selLinks = document.getElementById("sel-links");

  function render() {
    var item = null;
    ITEMS.forEach(function (it) {
      var on = it.id === st.selected;
      if (on) item = it;
      pins[it.id].className = on ? "pin on" : "pin";
      listBtns[it.id].setAttribute("aria-pressed", String(on));
    });
    VIEWS.forEach(function (v) { viewBtns[v[0]].setAttribute("aria-pressed", String(st.view === v[0] && !st.selected)); });
    labelsBtn.setAttribute("aria-pressed", String(st.labels));
    wiresBtn.setAttribute("aria-pressed", String(st.wires));
    ov.hidden = !!item; sel.hidden = !item;
    if (item) {
      selMeta.textContent = pad(item.n) + " · " + item.group;
      selName.textContent = item.name;
      selQty.textContent = "Quantity " + item.qty;
      selRole.textContent = item.role;
      selLinks.textContent = "";
      item.links.forEach(function (t) { selLinks.appendChild(el("li", { text: t })); });
    }
  }
  function choose(id) {
    st.selected = id; if (id) st.view = null;
    render(); if (engine) engine.select(id, true);
  }
  function pickView(k) {
    st.view = k; st.selected = null;
    render(); if (engine) { engine.select(null, false); engine.setView(k); }
  }
  render();

  engine = R.mount({
    canvas: canvas, stage: stage, root: root,
    getPin: function (id) { return pins[id]; },
    onSelect: function (id) { st.selected = id; if (id) st.view = null; render(); },
    onReady: function () { loading.hidden = true; },
    onError: function (msg) { loading.hidden = false; loading.textContent = "The rig could not load: " + msg; }
  });
})();
