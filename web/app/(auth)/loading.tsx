export default function GlobalLoadingSkeleton() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-3 w-full max-w-sm">
          <div className="h-8 bg-gray-200 rounded-lg w-3/4"></div>
          <div className="h-4 bg-gray-100 rounded-lg w-1/2"></div>
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded-xl"></div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-32 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 bg-gray-100 rounded-xl"></div>
              <div className="w-16 h-6 bg-gray-50 rounded-full"></div>
            </div>
            <div className="space-y-2">
              <div className="w-1/2 h-4 bg-gray-100 rounded"></div>
              <div className="w-3/4 h-6 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-[400px]">
        <div className="w-1/3 h-6 bg-gray-200 rounded mb-6"></div>
        <div className="space-y-4">
          <div className="w-full h-16 bg-gray-50 rounded-xl"></div>
          <div className="w-full h-16 bg-gray-50 rounded-xl"></div>
          <div className="w-full h-16 bg-gray-50 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}
