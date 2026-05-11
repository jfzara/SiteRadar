import { useState } from "react";

function ResultRow({ label, value }) {
  return (
    <div className="result-row">
      <span className="label">{label}</span>
      <span className="value">{String(value)}</span>
    </div>
  );
}

export default function App() {
  const [url, setUrl] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAudit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setData(null);

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
            </div>

            <div className="section">
              <h2>Contact / conversion</h2>
              <ResultRow label="Mot 'contact'" value={data.hasContactWord ? "Oui" : "Non"} />
              <ResultRow label="Lien téléphone" value={data.hasPhoneLink ? "Oui" : "Non"} />
              <ResultRow label="Lien email" value={data.hasEmailLink ? "Oui" : "Non"} />
              <ResultRow label="Formulaire" value={data.hasForm ? "Oui" : "Non"} />
            </div>

            <div className="section">
              <h2>Éléments détectés</h2>
              <ResultRow label="Title texte" value={data.title || "Aucun"} />
              <ResultRow label="H1 texte" value={data.h1 || "Aucun"} />
              <ResultRow label="Meta description texte" value={data.metaDescription || "Aucune"} />
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