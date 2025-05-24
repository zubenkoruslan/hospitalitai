import React from "react";

interface KPICardProps {
  title: string;
  value: string | number;
  description?: string; // Optional: e.g., "vs last month" or units
  isLoading?: boolean;
  icon?: React.ReactNode; // Optional: for an icon
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  description,
  isLoading = false,
  icon,
}) => {
  return (
    <div className="bg-white shadow-lg rounded-xl p-6 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </h4>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div>
        {isLoading ? (
          <div className="h-8 bg-slate-200 rounded animate-pulse w-3/4"></div> // Placeholder for loading value
        ) : (
          <p className="text-3xl font-bold text-slate-800">{value}</p>
        )}
        {description && !isLoading && (
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        )}
      </div>
    </div>
  );
};

export default KPICard;
