import { useState, useEffect } from 'react';
import GallerySection from './GallerySection.jsx';

const ALBUM_ORDER = ['Am Wasser', 'Vereinsleben & Veranstaltungen', 'Größte Fänge'];
const ALBUM_DESC = {
  'Größte Fänge': 'Die beeindruckendsten Fänge unserer Vereinsmitglieder.',
  'Vereinsleben & Veranstaltungen': 'Gemeinsame Erlebnisse bei Festen, Treffen und Aktionen am Wasser.',
  'Am Wasser': 'Eindrücke und Impressionen vom Wasser.',
};

function imageUrl(url, { driveSuffix = '', imgurSuffix = '' } = {}) {
  if (!url) return url;

  // Google Drive
  const driveId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1]
    ?? url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
  if (driveId && url.includes('drive.google.com')) {
    return `https://lh3.googleusercontent.com/d/${driveId}${driveSuffix}`;
  }

  // Imgur — insert suffix before the extension, e.g. ABC123.jpg → ABC123l.jpg
  if (imgurSuffix && url.includes('imgur.com')) {
    return url.replace(/(\.[a-zA-Z]+)(\?.*)?$/, `${imgurSuffix}$1$2`);
  }

  return url;
}

export default function DynamicGallery({ supabaseUrl, supabaseKey }) {
  const [albums, setAlbums] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const promise = window.__galleryPromise ?? fetch(
      `${supabaseUrl}/rest/v1/galerie_bilder?select=*&order=album.asc,sort_order.asc,created_at.asc`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    ).then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`));

    promise
      .then(data => {
        const grouped = {};
        for (const row of data) {
          if (!grouped[row.album]) grouped[row.album] = [];
          grouped[row.album].push({
            src: imageUrl(row.src),
            thumb: imageUrl(row.thumb || row.src, { driveSuffix: '=w600', imgurSuffix: 'l' }),
            subHtml: row.caption ? `<p>${row.caption}</p>` : undefined,
          });
        }
        setAlbums(grouped);
      })
      .catch(e => setError(String(e)));
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
