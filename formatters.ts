import { CoolerDoor, DoorHardwareType, FacingSlot } from '../types/kooleriq';

export function formatTemp(tempF: number, unit: 'F' | 'C'): string {
  if (unit === 'C') {
    const c = ((tempF - 32) * 5) / 9;
    return `${c.toFixed(1)}°C`;
  }
  return `${tempF.toFixed(1)}°F`;
}

export const HARDWARE_LABELS: Record<DoorHardwareType, string> = {
  'standard-glass': 'Standard Glass Door',
  'slim-reach-in': 'Slim Reach-In',
  'wide-air-curtain': 'Wide Open Air Curtain',
  'countertop-mini': 'Countertop Mini',
  'walk-in-cave': 'Walk-In Cave Door',
};

export function getDoorMetrics(door: CoolerDoor) {
  const allSlots: FacingSlot[] = door.shelves.flat();
  const totalFacings = allSlots.length;
  let oosCount = 0;
  let lowCount = 0;
  let violationCount = 0;
  let compliantCount = 0;
  let aiOpportunityCount = 0;
  let projectedWeeklyLift = 0;

  for (const s of allSlots) {
    if (s.status === 'oos' || s.currentDepth === 0) {
      oosCount++;
    } else if (s.status === 'violation' || s.skuId !== s.plannedSkuId) {
      violationCount++;
    } else {
      compliantCount++;
      if (s.status === 'low' || s.currentDepth / s.maxDepth <= 0.25) {
        lowCount++;
      }
    }
    if (s.aiRecommendation && !s.aiRecommendation.applied) {
      aiOpportunityCount++;
      projectedWeeklyLift += s.aiRecommendation.weeklyDollarGain;
    }
  }

  const compliancePct = totalFacings > 0 ? (compliantCount / totalFacings) * 100 : 100;

  return {
    totalFacings,
    oosCount,
    lowCount,
    violationCount,
    compliantCount,
    compliancePct,
    aiOpportunityCount,
    projectedWeeklyLift,
  };
}
