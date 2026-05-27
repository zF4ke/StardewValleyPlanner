import { CROPS } from '../data/crops';
import { rankCrops } from '../domain/planner';
import type { CropPlan, PlannerInput } from '../domain/types';

interface PlannerRequest {
  id: number;
  input: PlannerInput;
}

interface PlannerResponse {
  id: number;
  plans?: CropPlan[];
  error?: string;
}

self.addEventListener('message', (event: MessageEvent<PlannerRequest>) => {
  const { id, input } = event.data;
  try {
    const plans = rankCrops(CROPS, input);
    self.postMessage({ id, plans } satisfies PlannerResponse);
  } catch (err) {
    self.postMessage({
      id,
      error: err instanceof Error ? err.message : 'Planner failed.',
    } satisfies PlannerResponse);
  }
});
