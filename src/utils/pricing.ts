export interface RateData {
  gold_rate: number;
  silver_rate: number;
  silver_925_rate: number;
  copper_rate: number;
  making_charges_percent: number;
  apply_making_to_silver: boolean;
  manual_making_charges_percent?: number;
  manual_apply_making_to_silver?: boolean;
}

export interface FormulaStep {
  op: string;
  value: number;
}

export interface RateFormula {
  gold: FormulaStep[];
  silver: FormulaStep[];
  silver_925: FormulaStep[];
  copper: FormulaStep[];
}

export const DEFAULT_FORMULA: RateFormula = {
  gold: [
    { op: '*', value: 0.9166 },
    { op: '/', value: 1.03 },
  ],
  silver: [],
  silver_925: [],
  copper: [],
};

export function applyRateFormula(base: number, steps: FormulaStep[]): number {
  let val = base;
  for (const step of steps) {
    if (step.op === '+') val += step.value;
    else if (step.op === '-') val -= step.value;
    else if (step.op === '*') val *= step.value;
    else if (step.op === '/' && Math.abs(step.value) > 1e-12) val /= step.value;
  }
  return val;
}

export function calculatePrice(
  metalType: string,
  weight: number,
  rates: RateData,
  formula: RateFormula = DEFAULT_FORMULA
): number {
  if (weight <= 0) return 0;
  const metal = metalType.toLowerCase().trim();

  let baseRate = 0;
  if (metal === 'gold') baseRate = rates.gold_rate;
  else if (metal === 'silver') baseRate = rates.silver_rate;
  else if (metal === 'silver_925') baseRate = rates.silver_925_rate;
  else if (metal === 'copper') baseRate = rates.copper_rate;

  if (baseRate <= 0) return 0;

  const steps = formula[metal as keyof RateFormula] || [];
  const effectiveRate = applyRateFormula(baseRate, steps);

  let price = effectiveRate * weight;

  const applyMaking =
    metal === 'gold' ||
    ((metal === 'silver' || metal === 'silver_925') &&
      Boolean(rates.apply_making_to_silver || rates.manual_apply_making_to_silver));

  const makingPct =
    rates.manual_making_charges_percent !== undefined
      ? rates.manual_making_charges_percent
      : rates.making_charges_percent;

  if (applyMaking && makingPct > 0) {
    price += price * (makingPct / 100);
  }

  return price;
}
