import { adviceSentence, caseCountInWords, channelInWords, formatDay, labelFor, trustInWords } from "../data/derive";
import type { Assertion } from "../data/types";

/** Three lines only: title, what to do and avoid, and who/where/trust/cases. */
export function TipCard({
  tip,
  all,
  style,
  onClose,
}: {
  tip: Assertion;
  all: Assertion[];
  style?: React.CSSProperties;
  onClose: () => void;
}) {
  const old = tip.supersedes ? all.find((a) => a.id === tip.supersedes) : undefined;
  const replaced = tip.supersedes ? ` Replaced earlier info from ${old ? formatDay(old.valid_from) : "before"}.` : "";
  const meta = `${tip.evidence.said_by}, ${channelInWords(tip)}, ${formatDay(tip.valid_from)}. ${trustInWords(tip.trust)} · ${caseCountInWords(tip)}.${replaced}`;
  return (
    <div className="tip-card" role="dialog" aria-label={labelFor(tip)} style={style} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <p className="tip-card-title">{labelFor(tip)}</p>
      <p className="tip-card-advice">{adviceSentence(tip)}</p>
      <p className="tip-card-meta">{meta}</p>
    </div>
  );
}
