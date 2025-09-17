const { chromium } = require("playwright");
const fs = require("fs");

// ⏳ Delay aleatorio
function randomDelay(min = 1000, max = 3000) {
  return new Promise(resolve =>
    setTimeout(resolve, Math.random() * (max - min) + min)
  );
}

// 📜 Scroll humano
async function scrollHuman(page, steps = 6) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate(y => window.scrollBy(0, y), 400 + Math.random() * 400);
    await randomDelay(800, 2000);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.7339.128 Safari/537.36",
    viewport: { width: 1366, height: 768 },
  });

  const page = await context.newPage();

  // 🔒 Evasiones manuales tipo stealth
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, "languages", {
      get: () => ["es-ES", "es", "en"],
    });
  });

  const url =
    "https://www.idealista.com";
  await page.goto(url, { waitUntil: "domcontentloaded" });

  // aceptar cookies
  try {
    await page.click('button[aria-label="Aceptar"]', { timeout: 5000 });
  } catch {
    console.log("No apareció popup de cookies");
  }

  let resultados = [];
  let pagina = 1;

  while (true) {
    console.log(`➡️ Página ${pagina}...`);

    await page.waitForSelector(".item-info-container", { timeout: 10000 });
    await scrollHuman(page, 6);
    await randomDelay(1500, 3000);

    // extraer datos de cada vivienda
    const viviendas = await page.$$eval(".item-info-container", cards =>
      cards.map(card => {
        const titulo = card.querySelector("a.item-link")?.innerText || "";
        const precio = card.querySelector(".item-price")?.innerText || "";
        const descripcion =
          card.querySelector(".item-detail-char")?.innerText || "";
        const ubicacion =
          card.querySelector(".item-detail-location")?.innerText || "";
        const url = card.querySelector("a.item-link")?.href || "";

        // imágenes desde <figure class="item-gallery">
        const imagenes = Array.from(
          card.querySelectorAll("figure.item-gallery source, figure.item-gallery img")
        )
          .map(el => el.getAttribute("srcset") || el.getAttribute("src"))
          .filter(Boolean);

        return { titulo, descripcion, precio, ubicacion, url, imagenes };
      })
    );

    resultados.push(...viviendas);
    console.log(
      `   +${viviendas.length} viviendas (total: ${resultados.length})`
    );

    // ⏸ pausa larga cada 3 páginas
    if (pagina % 3 === 0) {
      const extraDelay = Math.floor(Math.random() * 10000) + 10000; // 10–20 seg
      console.log(
        `⏸ Pausa larga simulando descanso (${extraDelay / 1000} segundos)...`
      );
      await randomDelay(extraDelay, extraDelay);
    }

    // siguiente página
    const botonSiguiente = await page.$("a.icon-arrow-right-after");
    if (botonSiguiente) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: "domcontentloaded" }),
        botonSiguiente.click(),
      ]);
      pagina++;
      await randomDelay(2000, 4000);
    } else {
      console.log("✅ No hay más páginas");
      break;
    }
  }

  // guardar JSON
  fs.writeFileSync(
    "viviendas.json",
    JSON.stringify(resultados, null, 2),
    "utf-8"
  );
  console.log(
    `💾 Guardado en viviendas.json con ${resultados.length} viviendas`
  );

  await browser.close();
})();
