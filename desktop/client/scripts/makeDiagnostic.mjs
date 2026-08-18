import { readFileSync, writeFileSync } from "fs";

const SRC = "dist/Discord.user.js";
const OUT = "dist/Discord.diagnostic.user.js";

const raw = readFileSync(SRC, "utf-8");
const marker = '"use strict";var Vencord';
const idx = raw.indexOf(marker);
if (idx === -1) { console.error("marker not found"); process.exit(1); }

const meta = raw.slice(0, idx);
const code = raw.slice(idx);

const diag = `
(function(){
  var box, count = 0;
  function ensure(){
    if (box && box.isConnected) return box;
    box = document.createElement("div");
    box.style.cssText = "position:fixed;z-index:2147483647;left:0;right:0;bottom:0;max-height:55vh;overflow:auto;background:#0a0a0a;color:#39ff14;font:12px/1.4 monospace;white-space:pre-wrap;padding:10px;border-top:3px solid #39ff14;box-shadow:0 0 20px #000";
    box.textContent = "=== Discord userscript diagnostics (first errors) ===";
    (document.body || document.documentElement).appendChild(box);
    return box;
  }
  function add(t){
    if (count > 10) return; count++;
    try { ensure(); box.textContent += "\\n\\n" + t; } catch(e){}
  }
  var oerr = console.error ? console.error.bind(console) : function(){};
  console.error = function(){
    try {
      var s = Array.prototype.map.call(arguments, function(a){
        return (a && (a.stack || a.message)) || String(a);
      }).join(" ");
      add("[console.error] " + s);
    } catch(e){}
    return oerr.apply(console, arguments);
  };
  window.addEventListener("error", function(e){
    add("[window.onerror] " + ((e.error && (e.error.stack || e.error.message)) || e.message));
  });
  window.addEventListener("unhandledrejection", function(e){
    add("[unhandledrejection] " + ((e.reason && (e.reason.stack || e.reason.message)) || String(e.reason)));
  });
  // keep the box visible even if Discord clears the body
  setTimeout(function(){ try{ if(count>0) ensure(); }catch(e){} }, 8000);
})();
`;

writeFileSync(OUT, meta + diag + "\n" + code, "utf-8");
console.log("wrote", OUT);
