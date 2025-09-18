const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const fs = require("fs");

// ---- User agents simulados ----
const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/604.1"
];
const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

// ---- Retraso aleatorio ----
function randomDelay(min = 1000, max = 3000) {
  return new Promise(resolve =>
    setTimeout(resolve, Math.random() * (max - min) + min)
  );
}

// ---- Scroll humano ----
async function scrollHuman(driver) {
  const cards = await driver.findElements(By.css(".item-info-container"));
  for (let card of cards) {
    await driver.executeScript(
      "arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});",
      card
    );
    await randomDelay(1000, 2500);
  }
}

// ---- Movimientos de ratón seguros ----
async function humanMouse(driver) {
  const { width, height } = await driver.manage().window().getRect();

  for (let i = 0; i < 5; i++) {
    const x = Math.floor(Math.random() * (width - 10));
    const y = Math.floor(Math.random() * (height - 10));

    try {
      await driver.actions().move({ x, y, origin: "viewport" }).perform();
    } catch {
      console.log("⚠️ Movimiento fuera de rango, ignorado");
    }

    await randomDelay(500, 1500);
  }
}

(async () => {
  // ---- Configuración navegador ----
  let options = new chrome.Options().addArguments(
    `--user-agent=${userAgent}`,
    "--disable-blink-features=AutomationControlled",
    "--window-size=1366,768"
  );

  let driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  try {
    const url =
      "https://www.idealista.com/areas/venta-viviendas/?shape=%28%28c%60%60_F%60i%7BYqgDslCqZiea%40vaCssFlxArsFaW%7Cre%40%29%29";
    await driver.get(url);

    // 🍪 aceptar cookies
    try {
      const cookieBtn = await driver.wait(
        until.elementLocated(By.id("didomi-notice-agree-button")),
        5000
      );
      await cookieBtn.click();
      console.log("🍪 Cookies aceptadas");
    } catch {
      console.log("No apareció popup de cookies");
    }

    let resultados = [];
    let pagina = 1;

    while (true) {
      console.log(`➡️ Página ${pagina}...`);

      await driver.wait(
        until.elementsLocated(By.css(".item-info-container")),
        10000
      );

      // navegación humana
      await scrollHuman(driver);
      await humanMouse(driver);

      if (Math.random() > 0.7) {
        const pause = Math.floor(Math.random() * 20000) + 10000;
        console.log(`📖 Pausa larga (${pause / 1000}s)`);
        await randomDelay(pause, pause);
      }

      // ---- Extraer datos ----
      const viviendas = await driver.findElements(By.css(".item-info-container"));
      for (let card of viviendas) {
        const titulo = await card
          .findElement(By.css("a.item-link"))
          .getText()
          .catch(() => "");
        const precio = await card
          .findElement(By.css(".item-price"))
          .getText()
          .catch(() => "");
        const descripcion = await card
          .findElement(By.css(".item-detail-char"))
          .getText()
          .catch(() => "");
        const ubicacion = await card
          .findElement(By.css(".item-detail-location"))
          .getText()
          .catch(() => "");
        const url = await card
          .findElement(By.css("a.item-link"))
          .getAttribute("href")
          .catch(() => "");

        // ✅ Captura correcta de imágenes
        let imagen = "";
        try {
          const sourceJpg = await card.findElement(
            By.css("figure.item-gallery picture source[type='image/jpeg']")
          );
          imagen = await sourceJpg.getAttribute("srcset");
        } catch {
          try {
            const imgTag = await card.findElement(By.css("figure.item-gallery img"));
            imagen = await imgTag.getAttribute("src");
          } catch {
            imagen = "";
          }
        }

        resultados.push({ titulo, descripcion, precio, ubicacion, url, imagen });
      }

      console.log(`   +${viviendas.length} viviendas (total: ${resultados.length})`);

      await randomDelay(2000, 6000);

      // ---- Siguiente página ----
      const botones = await driver.findElements(By.css("a.icon-arrow-right-after"));
      if (botones.length > 0) {
        await botones[0].click();
        pagina++;
        await randomDelay(2000, 4000);
      } else {
        console.log("✅ No hay más páginas");
        break;
      }
    }

    // ---- Guardar resultados ----
    fs.writeFileSync(
      "viviendas.json",
      JSON.stringify(resultados, null, 2),
      "utf-8"
    );
    console.log(`💾 Guardado en viviendas.json con ${resultados.length} viviendas`);
  } finally {
    await driver.quit();
  }
})();
