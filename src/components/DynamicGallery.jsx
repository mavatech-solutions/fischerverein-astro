import { useState, useEffect } from 'react';
import GallerySection from './GallerySection.jsx';

const ALBUM_ORDER = ['Am Wasser', 'Vereinsleben & Veranstaltungen', 'Angelwettbewerbe', 'Größte Fänge'];
const ALBUM_DESC = {
  'Angelwettbewerbe': 'Impressionen unserer Turniere, von der Vorbereitung bis zur Siegerehrung.',
  'Größte Fänge': 'Die beeindruckendsten Fänge unserer Vereinsmitglieder.',
  'Vereinsleben & Veranstaltungen': 'Gemeinsame Erlebnisse bei Festen, Treffen und Aktionen am Wasser.',
  'Am Wasser': 'Gemeinsame Erlebnisse bei Festen, Treffen und Aktionen am Wasser.',
};

function driveUrl(url) {
  const id = url?.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1]
    ?? url?.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
  if (id && url.includes('drive.google.com')) {
    return `https://lh3.googleusercontent.com/d/${id}`;
  }
  return url;
}

export default function DynamicGallery({ supabaseUrl, supabaseKey }) {
  const [albums, setAlbums] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(
      `${supabaseUrl}/rest/v1/galerie_bilder?select=*&order=album.asc,sort_order.asc,created_at.asc`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    )
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        const grouped = {};
        for (const row of data) {
          if (!grouped[row.album]) grouped[row.album] = [];
          grouped[row.album].push({
            src: driveUrl(row.src),
            thumb: driveUrl(row.thumb || row.src),
            subHtml: row.caption ? `<p>${row.caption}</p>` : undefined,
          });
        }
        setAlbums(grouped);
      })
      .catch(e => setError(e.message));
  }, []);

  if (error) {
    return <p className="text-red-400 py-12 text-center">Galerie konnte nicht geladen werden: {error}</p>;
  }

  if (albums === null) {
    return <p className="text-gray-400 py-12 text-center">Lädt...</p>;
  }

  const ordered = ALBUM_ORDER.filter(a => albums[a]);
  const rest = Object.keys(albums).filter(a => !ALBUM_ORDER.includes(a));
  const allAlbums = [...ordered, ...rest];

  if (!allAlbums.length) {
    return <p className="text-gray-400 py-12 text-center">Noch keine Bilder vorhanden.</p>;
  }

  return (
    <div className="grid gap-8">
      {allAlbums.map(album => (
        <GallerySection
          key={album}
          title={album}
          description={ALBUM_DESC[album]}
          items={albums[album]}
        />
      ))}
    </div>
  );
}
