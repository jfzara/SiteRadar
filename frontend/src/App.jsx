import { useState } from "react";

function ResultRow({ label, value }) {
  return (
    <div className="result-row">
      <span className="label">{label}</span>
      <span className="value">{String(value)}</span>
    </div>
  );
}

function generateEmail(data) {
  const domain = new URL(data.url).hostname;
  const realFindings = data.findings.filter(
    (f) => !f.toLowerCase().includes("correct")
  );

  const bulletList = realFindings.map((f) => `• ${f}`).join("\n");

  return `Bonjour,

J'ai analysé rapidement votre site (${domain}) et j'ai noté quelques points qui peuvent vous faire perdre des clients potentiels :

${bulletList}

Sur 100, le site obtient un score de ${data.score}/100. Je peux corriger ces points rapidement pour améliorer votre conversion et votre visibilité.

Si ça vous intéresse, je peux vous envoyer une proposition détaillée.

Cordialement,
Jeff`;
}

export default function App() {
  const [url, setUrl] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleAudit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setData(null);
    setCopied(false);

    try {
      const res = await fetch("http://localhost:3001/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur serveur");
      setData(json);
    } catch (err) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyEmail() {
    if (!data) return;
    const email = generateEmail(data);
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      setError("Impossible de copier dans le presse-papier");
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h1>SiteRadar</h1>
        <p className="subtitle">
          Audit rapide d'un site : vitesse, contact, structure, signaux de conversion.
        </p>

        <form onSubmit={handleAudit} className="audit-form">
          <input
            type="text"
            placeholder="ex: example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="submit" disabled={loading || !url.trim()}>
            {loading ? "Analyse..." : "Analyser"}
          </button>
        </form>

        {error && <div className="error">{error}</div>}

        {data && (
          <div className="results">
            <div className="score-box">
              <div className="score-label">Score</div>
              <div className="score-value">{data.score}/100</div>
              <button
                type="button"
                className="copy-button"
                onClick={handleCopyEmail}
              >
                {copied ? "✓ Copié !" : "📋 Copier rapport email"}
              </button>
            </div>

            <div className="section">
              <h2>Résumé</h2>
              <ResultRow label="URL" value={data.url} />
              <ResultRow label="Temps de chargement" value={`${data.loadTimeMs} ms`} />
              <ResultRow label="Taille HTML" value={`${data.htmlSize} bytes`} />
              <ResultRow label="Nombre de mots" value={data.wordCount} />
            </div>

            <div className="section">
              <h2>Structure</h2>
              <ResultRow label="Title" value={data.hasTitle ? "Oui" : "Non"} />
              <ResultRow label="Meta description" value={data.hasMetaDescription ? "Oui" : "Non"} />
              <ResultRow label="H1" value={data.hasH1 ? "Oui" : "Non"} />
              <ResultRow label="Viewport mobile" value={data.hasViewport ? "Oui" : "Non"} />
            </div>

            <div className="section">
              <h2>Contact / conversion</h2>
              <ResultRow label="Mot 'contact'" value={data.hasContactWord ? "Oui" : "Non"} />
              <ResultRow label="Lien téléphone" value={data.hasPhoneLink ? "Oui" : "Non"} />
              <ResultRow label="Lien email" value={data.hasEmailLink ? "Oui" : "Non"} />
              <ResultRow label="Formulaire" value={data.hasForm ? "Oui" : "Non"} />
              <ResultRow label="Google Maps" value={data.hasGoogleMaps ? "Oui" : "Non"} />
              <ResultRow label="Réseaux sociaux" value={data.hasSocialLinks ? "Oui" : "Non"} />
            </div>

            <div className="section">
              <h2>Éléments détectés</h2>
              <ResultRow label="Title texte" value={data.title || "Aucun"} />
              <ResultRow label="H1 texte" value={data.h1 || "Aucun"} />
              <ResultRow label="Meta description texte" value={data.metaDescription || "Aucune"} />
              <ResultRow label="Favicon" value={data.hasFavicon ? "Oui" : "Non"} />
            </div>

            <div className="section">
              <h2>Findings</h2>
              <ul className="findings">
                {data.findings.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}