/**
 * PlaylistCover - A highly performant CSS Grid component for generating 
 * 2x2 collage artwork from track lists. This avoids HTML5 Canvas memory overhead
 * and renders flawlessly sharp on high-DPI displays.
 */
export default function PlaylistCover({ tracks = [], fallbackImage = 'https://via.placeholder.com/500' }) {
  // Extract high-res images defensively
  const extractImages = () => {
    return tracks.map(t => {
      if (Array.isArray(t.image)) return t.image.find(i => i.quality === '500x500')?.url || t.image[0]?.url;
      return t.image;
    }).filter(Boolean); // removes nulls/undefined
  };

  const images = extractImages();

  if (images.length >= 4) {
    return (
      <div className="w-full aspect-square grid grid-cols-2 grid-rows-2 rounded-md overflow-hidden shadow-lg border border-[#333]">
        {images.slice(0, 4).map((img, i) => (
          <img key={i} src={img} alt={`Cover Part ${i+1}`} className="w-full h-full object-cover border-[0.5px] border-[#121212]" loading="lazy" />
        ))}
      </div>
    );
  }

  // Fallback to single image if < 4 tracks
  return (
    <div className="w-full aspect-square rounded-md overflow-hidden shadow-lg border border-[#333]">
      <img src={images[0] || fallbackImage} alt="Cover" className="w-full h-full object-cover" />
    </div>
  );
}
