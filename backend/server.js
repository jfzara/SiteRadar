import express from "express";
import cors from "cors";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

function normalizeUrl(input) {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

function countWords(text) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
}

function scoreAudit(data) {
  let score = 100;

  if (data.loadTimeMs > 3000) score -= 25;
  else if (data.loadTimeMs > 1500) score -= 10;

  if (!data.hasContactWord) score -= 10;
  if (!data.hasPhoneLink) score -= 10;
  if (!data.hasEmailLink) score -= 10;
  if (!data.hasForm) score -= 10;
  if (!data.hasH1) score -= 8;
  if (data.wordCount < 150) score -= 10;
  if (!data.hasTitle) score -= 8;
  if (!data.hasMetaDescription) score -= 9;

  if (score < 0) score = 0;
  return score;
}

function getQuickFindings(data) {
  const findings = [];

  if (data.loadTimeMs > 3000) findings.push("Site lent à charger");
  else if (data.loadTimeMs > 1500) findings.push("Temps de chargement moyen");
  else findings.push("Temps de chargement correct");

  if (!data.hasContactWord) findings.push("Pas de section contact évidente");
  if (!data.hasPhoneLink) findings.push("Pas de lien téléphone détecté");
  if (!data.hasEmailLink) findings.push("Pas de lien email détecté");
  if (!data.hasForm) findings.push("Pas de formulaire détecté");
  if (!data.hasH1) findings.push("Structure SEO faible : pas de H1");
  if (!data.hasMetaDescription) findings.push("Meta description absente");
  if (data.wordCount < 150) findings.push("Contenu textuel faible");

  return findings;
}

app.post("/audit", async (req, res) => {
  try {
    const { url: rawUrl } = req.body;

    if (!rawUrl || typeof rawUrl !== "string") {
      return res.status(400).json({ error: "URL invalide." });
    }

    const url = normalizeUrl(rawUrl);

    const start = Date.now();
    const response = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      headers: { "User-Agent": "Mozilla/5.0 SiteRadar" }
    });
    const loadTimeMs = Date.now() - start;

    const html = response.data;
    const htmlSize = Buffer.byteLength(html, "utf8");

    const $ = cheerio.load(html);
    const bodyText = $("body").text() || "";
    const wordCount = countWords(bodyText);

    const title = $("title").text().trim();
    const metaDescription = $('meta[name="description"]').attr("content") || "";
    const h1 = $("h1").first().text().trim();

    const auditData = {
      url,
      loadTimeMs,
      htmlSize,
      wordCount,
      title,
      metaDescription,
      h1,
      hasContactWord: /contact/i.test(bodyText) || /contact/i.test(html),
      hasPhoneLink: $('a[href^="tel:"]').length > 0,
      hasEmailLink: $('a[href^="mailto:"]').length > 0,
      hasForm: $("form").length > 0,
      hasTitle: title.length > 0,
      hasMetaDescription: metaDescription.trim().length > 0,
      hasH1: h1.length > 0
    };

    return res.json({
      ...auditData,
      score: scoreAudit(auditData),
      findings: getQuickFindings(auditData)
    });
  } catch (error) {
    return res.status(500).json({
      error: "Impossible d'analyser ce site.",
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`SiteRadar backend running on http://localhost:${PORT}`);
});