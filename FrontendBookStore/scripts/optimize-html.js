/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const INDEX = path.join(__dirname, "..", "build", "index.html");

const TAG =
  /<script defer="defer" src="(\/static\/js\/main\.[^"]+\.js)"><\/script>/;

const loader = (src) =>
  "<script>(function(){" +
  `var s=${JSON.stringify(src)},done=0;` +
  "function load(){if(done)return;done=1;" +
  'var e=document.createElement("script");e.src=s;document.head.appendChild(e);}' +
  "function afterPaint(){requestAnimationFrame(function(){setTimeout(load,0);});}" +
  'if(document.documentElement.classList.contains("off-home"))return load();' +
  "var watched=0;try{" +
  "var T=window.PerformanceObserver&&PerformanceObserver.supportedEntryTypes;" +
  'if(T&&T.indexOf("largest-contentful-paint")>-1){' +
  "var po=new PerformanceObserver(function(l){" +
  "if(!l.getEntries().length)return;po.disconnect();afterPaint();});" +
  'po.observe({type:"largest-contentful-paint",buffered:true});watched=1;}' +
  "}catch(e){}" +
  "if(!watched){" +
  'var i=document.querySelector("#hero-backdrop img");' +
  "if(!i||i.complete)afterPaint();" +
  'else{i.addEventListener("load",afterPaint);i.addEventListener("error",afterPaint);}}' +
  "setTimeout(load,2500);" +
  "})();</script>";

const main = () => {
  if (!fs.existsSync(INDEX)) {
    console.error("optimize-html: build/index.html introuvable");
    process.exit(1);
  }

  const html = fs.readFileSync(INDEX, "utf8");
  const match = TAG.exec(html);

  if (!match) {
    console.log("optimize-html: aucun <script defer> a deplacer");
    return;
  }

  if (!html.includes('id="hero-backdrop"')) {
    console.error(
      "optimize-html: #hero-backdrop absent de public/index.html, " +
        "transformation annulee",
    );
    process.exit(1);
  }

  const out = html
    .replace(TAG, "")
    .replace("</body>", `${loader(match[1])}</body>`);

  fs.writeFileSync(INDEX, out, "utf8");
  console.log(
    `optimize-html: ${match[1]} demande apres la peinture de la couverture`,
  );
};

main();
