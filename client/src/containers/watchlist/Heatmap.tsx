import { useMemo, useEffect, useRef, useState } from "react";
import { useMarketData } from "../../hooks/useMarketData";
import type { WatchlistEntity } from "../../store/useWatchlistStore";
import { cn } from "../../utils/cn";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

interface HeatmapProps {
  activeEntities: WatchlistEntity[];
  onAddEntities?: () => void;
}

const getSpectrumClass = (pctChange: number | null) => {
  if (pctChange === null) return "bg-zinc-900 text-zinc-500"; // Loading

  if (pctChange >= 2.5) return "bg-[#00e676] text-black font-bold"; // Brightest Green
  if (pctChange >= 1.5) return "bg-green-500 text-white";
  if (pctChange >= 0.5) return "bg-green-700 text-white/90";
  if (pctChange > 0) return "bg-green-900 text-white/80"; // Darkest Green

  if (pctChange === 0) return "bg-zinc-800 text-zinc-300"; // Neutral Gray

  if (pctChange > -0.5) return "bg-red-900 text-white/80"; // Darkest Red
  if (pctChange > -1.5) return "bg-red-700 text-white/90";
  if (pctChange > -2.5) return "bg-red-600 text-white";
  return "bg-[#ff1744] text-white font-bold"; // Brightest Red
};

const HeatmapCell = ({ entity, id }: { entity: any; id: string }) => {
  const navigate = useNavigate();
  const prevLtpRef = useRef<number | null>(entity.ltp);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (
      entity.ltp !== null &&
      prevLtpRef.current !== null &&
      entity.ltp !== prevLtpRef.current
    ) {
      setFlash(entity.ltp > prevLtpRef.current ? "up" : "down");

      const timer = setTimeout(() => {
        setFlash(null);
      }, 300);

      prevLtpRef.current = entity.ltp;
      return () => clearTimeout(timer);
    }
    prevLtpRef.current = entity.ltp;
  }, [entity.ltp]);

  const baseColor = getSpectrumClass(entity.pctChange);

  return (
    <button
      onClick={() => {
        navigate(`/instrument/${id}`);
      }}
      className={cn(
        "relative flex flex-col cursor-pointer hover:scale-105 transition-all justify-center items-center p-2 aspect-4/3 overflow-hidden rounded-sm",
        baseColor
      )}
    >
      {flash && (
        <div
          className={cn(
            "absolute inset-0 z-10 transition-opacity duration-300 pointer-events-none",
            flash === "up" ? "bg-white/30" : "bg-black/30"
          )}
        />
      )}

      <div className="text-xs sm:text-sm tracking-tight truncate w-full text-center z-20">
        {entity.trading_symbol}
      </div>

      <div className="mt-0.5 flex flex-col items-center justify-center z-20">
        {entity.ltp !== null ? (
          <>
            <span className="text-[11px] sm:text-[12px] opacity-90">
              {entity.pctChange! >= 0 ? "+" : ""}
              {entity.pctChange!.toFixed(2)}%
            </span>
            <span className="text-[12px] font-medium mt-0.5">
              {entity.ltp.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </>
        ) : (
          <span className="text-[10px] opacity-50 mt-1 animate-pulse">--</span>
        )}
      </div>
    </button>
  );
};

const Heatmap = ({ activeEntities, onAddEntities }: HeatmapProps) => {
  const subscriptionPayload = useMemo(() => {
    return activeEntities.map((e) => ({ isin: e.isin, segment: e.segment }));
  }, [activeEntities]);

  const { livePrices } = useMarketData(subscriptionPayload);

  const heatMapData = useMemo(() => {
    return activeEntities
      .map((entity) => {
        const instrumentKey = `${entity.segment}|${entity.isin}`;
        const tick = livePrices[instrumentKey];
        const ltpcData = tick?.ltpc;

        let pctChange: number | null = null;
        let ltp: number | null = null;

        if (ltpcData?.ltp && ltpcData?.cp) {
          ltp = ltpcData.ltp;
          pctChange = ((ltpcData.ltp - ltpcData.cp) / ltpcData.cp) * 100;
        }

        return { ...entity, ltp, pctChange };
      })
      .sort((a, b) => {
        if (a.pctChange === null) return 1;
        if (b.pctChange === null) return -1;
        return b.pctChange - a.pctChange;
      });
  }, [activeEntities, livePrices]);

  // Render empty state if there are no entities
  if (activeEntities.length === 0) {
    return (
      <div className="p-10 flex flex-col items-center justify-center h-full text-foreground-muted">
        <span className="text-sm">No entities added yet.</span>

        {onAddEntities && (
          <button
            onClick={onAddEntities}
            className="flex mt-2 rounded-sm border border-background-lable px-2 py-1.5 items-center text-xs gap-1 hover:bg-background-lable hover:text-white transition-colors text-foreground cursor-pointer"
          >
            <Plus className="size-4" /> <span>Add Entities</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 mb-4">
      <div className="w-full rounded-sm overflow-hidden">
        <div className="grid grid-cols-3 p-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-0.5">
          {heatMapData.map((entity) => (
            <HeatmapCell id={entity.isin} key={entity.isin} entity={entity} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Heatmap;