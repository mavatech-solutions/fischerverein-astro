import { useCallback, useRef } from 'react';
import LightGallery from 'lightgallery/react';
import lgZoom from 'lightgallery/plugins/zoom';
import lgThumbnail from 'lightgallery/plugins/thumbnail';

import 'lightgallery/css/lightgallery.css';
import 'lightgallery/css/lg-zoom.css';
import 'lightgallery/css/lg-thumbnail.css';

/**
 * @typedef {{ src: string, thumb?: string, subHtml?: string, responsive?: string }} GalleryItem
 *
 * @param {{ title: string, description?: string, items: GalleryItem[] }} props
 */
export default function GallerySection({ title, description, items = [] }) {
  const galleryRef = useRef(null);

  const aspectRatios = ['4 / 3', '3 / 4', '1 / 1', '16 / 10', '5 / 4'];

  const onInit = useCallback(detail => {
    galleryRef.current = detail.instance;
  }, []);

  const openAtIndex = useCallback(index => {
    if (!galleryRef.current || !items.length) {
      return;
    }

    galleryRef.current.openGallery(index);
  }, [items.length]);

  return (
    <section className="mb-12">
      <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          {description ? <p className="mt-2 text-gray-600">{description}</p> : null}
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md bg-[var(--color-secondary)] px-4 py-2 text-white font-semibold transition hover:brightness-110"
          onClick={() => openAtIndex(0)}
          disabled={!items.length}
        >
          Galerie öffnen
        </button>
      </div>

      <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">
        {items.map((item, index) => (
          <button
            key={`${item.src}-${index}`}
            type="button"
            onClick={() => openAtIndex(index)}
            className="group relative mb-3 block w-full overflow-hidden rounded-lg break-inside-avoid"
            aria-label={`${title} Bild ${index + 1}`}
          >
            <img
              src={item.thumb || item.src}
              alt={`${title} Vorschau ${index + 1}`}
              loading="lazy"
              className="w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              style={{ aspectRatio: item.aspectRatio || aspectRatios[index % aspectRatios.length] }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 to-transparent opacity-0 transition group-hover:opacity-100" />
          </button>
        ))}
      </div>

      <LightGallery
        dynamic
        dynamicEl={items}
        plugins={[lgZoom, lgThumbnail]}
        closable
        showCloseIcon
        download={false}
        speed={500}
        onInit={onInit}
      />
    </section>
  );
}
