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
  return text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;
}

function scoreAudit(data) {
  let score = 100;

  if (data.loadTimeMs > 3000) score -= 25;
  else if (data.loadTimeMs > 1500) score -= 10;

  if (!data.hasContactWord) score -= 8;
  if (!data.hasPhoneLink) score -= 10;
  if (!data.hasEmailLink) score -= 8;
  if (!data.hasForm) score -= 10;
  if (!data.hasH1) score -= 8;
  if (data.wordCount < 150) score -= 8;
  if (!data.hasTitle) score -= 8;
  if (!data.hasMetaDescription) score -= 9;
  if (!data.hasViewport) score -= 10;
  if (!data.hasFavicon) score -= 3;
  if (!data.hasGoogleMaps && !data.hasSocialLinks) score -= 5;

  if (score < 0) score = 0;
  return score;
}

function getQuickFindings(data) {
  const findings = [];

  if (data.loadTimeMs > 3000) findings.push("Site lent à charger");
  else if (data.loadTimeMs > 1500) findings.push("Temps de chargement moyen");
  else findings.push("Temps de chargement correct");

  if (!data.hasContactWord) findings.push("Pas de section contact évidente");
  if (!data.hasPhoneLink) findings.push("Pas de lien téléphone cliquable");
  if (!data.hasEmailLink) findings.push("Pas de lien email cliquable");
  if (!data.hasForm) findings.push("Pas de formulaire de contact détecté");
  if (!data.hasH1) findings.push("Structure SEO faible : pas de balise H1");
  if (!data.hasMetaDescription) findings.push("Meta description absente (impact SEO)");
  if (!data.hasTitle) findings.push("Balise title absente (impact SEO majeur)");
  if (data.wordCount < 150) findings.push("Contenu textuel très faible");
  if (!data.hasViewport) findings.push("Pas de balise viewport (problème mobile)");
  if (!data.hasFavicon) findings.push("Pas de favicon (manque de professionnalisme)");
  if (!data.hasGoogleMaps && !data.hasSocialLinks) {
    findings.push("Aucune intégration Google Maps ou réseaux sociaux");
  }

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

    // Nouveaux checks
    const hasViewport = $('meta[name="viewport"]').length > 0;
    const hasFavicon =
      $('link[rel="icon"]').length > 0 ||
      $('link[rel="shortcut icon"]').length > 0;
    const hasGoogleMaps =
      /google\.com\/maps/i.test(html) ||
      /maps\.google/i.test(html) ||
      $('iframe[src*="google.com/maps"]').length > 0;
    const hasSocialLinks =
      $('a[href*="facebook.com"]').length > 0 ||
      $('a[href*="instagram.com"]').length > 0 ||
      $('a[href*="linkedin.com"]').length > 0 ||
      $('a[href*="twitter.com"]').length > 0 ||
      $('a[href*="x.com"]').length > 0;

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
      hasH1: h1.length > 0,
      hasViewport,
      hasFavicon,
      hasGoogleMaps,
      hasSocialLinks
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