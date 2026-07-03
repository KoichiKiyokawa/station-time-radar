import StationSearch from "./StationSearch";
import { addDestination, resetDestinations } from "../store";

export default function DestinationEditor() {
  return (
    <div class="mt-4">
      <StationSearch
        size="compact"
        placeholder="行き先を追加…"
        clearOnSelect
        onSelect={addDestination}
      />
      <div class="mt-2 text-right">
        <button
          class="text-[11px] text-muted/70 underline-offset-2 hover:text-muted hover:underline"
          onClick={resetDestinations}
        >
          プリセットに戻す
        </button>
      </div>
    </div>
  );
}
