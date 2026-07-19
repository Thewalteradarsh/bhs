export default function TrackCardSkeleton() {
  return (
    <div className="min-w-[160px] max-w-[180px] p-4 bg-[#181818] rounded-md animate-pulse flex-shrink-0">
      {/* 160x160 Image Placeholder */}
      <div className="w-full aspect-square bg-[#282828] rounded-md mb-4 shadow-sm"></div>
      
      {/* Title Placeholder */}
      <div className="h-4 bg-[#282828] rounded-sm w-3/4 mb-2"></div>
      
      {/* Subtitle Placeholder */}
      <div className="h-3 bg-[#282828] rounded-sm w-1/2"></div>
    </div>
  );
}
