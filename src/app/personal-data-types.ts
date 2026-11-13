import type { CounsellingSession } from "./counselling/counselling-engine";
import type { DiscoveryAnswers } from "./discover/flow-data";
import type { EducationStage } from "./education-stage";
import type { ExplorationHistoryItem } from "./explore/exploration-history";
import type { SavedItem } from "./explore/saved-items";

export type PersonalDataSnapshot = {
  savedItems: SavedItem[];
  history: ExplorationHistoryItem[];
  educationStage: EducationStage | null;
  counsellingSession: CounsellingSession | null;
  discoveryAnswers: DiscoveryAnswers | null;
};

export type PersonalDataMutation =
  | { type: "saved.add"; item: SavedItem }
  | { type: "saved.remove"; item: Pick<SavedItem, "type" | "id" | "context"> }
  | {
      type: "history.record";
      item: Omit<ExplorationHistoryItem, "visitCount">;
    }
  | {
      type: "history.remove";
      item: Pick<ExplorationHistoryItem, "type" | "id" | "context">;
    }
  | { type: "history.restore"; item: ExplorationHistoryItem }
  | { type: "history.clear" }
  | {
      type: "progress.educationStage";
      value: EducationStage | null;
    }
  | {
      type: "progress.counsellingSession";
      value: CounsellingSession | null;
    }
  | {
      type: "progress.discoveryAnswers";
      value: DiscoveryAnswers | null;
    }
  | { type: "migration.keep"; data: PersonalDataSnapshot };
