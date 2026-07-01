import React from "react";
import Context from "../../context";

export default function RoundHistoryList() {
  const { fullHistory } = React.useContext(Context);

  const getMultiplierClass = (num: number) => {
    if (num < 2) return "low";
    if (num <= 10) return "mid";
    return "high";
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return "";
    }
  };

  return (
    <div className="round-history-list">
      <div className="table-header">
        <div className="col">Round ID</div>
        <div className="col">Crashed At</div>
        <div className="col">Time</div>
      </div>
      <div className="table-body">
        {(!fullHistory || fullHistory.length === 0) ? (
          <div className="no-data">No rounds played yet</div>
        ) : (
          fullHistory.map((item: any, index: number) => {
            const num = Number(item.multiplier || 0);
            const badgeClass = getMultiplierClass(num);
            return (
              <div key={index} className="table-row">
                <div className="col round-id">#{item.id}</div>
                <div className="col multiplier">
                  <span className={`history-pill ${badgeClass}`}>
                    {num.toFixed(2)}x
                  </span>
                </div>
                <div className="col time">{formatTime(item.createdAt)}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
