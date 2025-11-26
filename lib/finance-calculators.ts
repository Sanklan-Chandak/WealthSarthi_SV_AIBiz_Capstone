// Future value of monthly SIP: FV = P * [((1+r)^n - 1) / r] * (1+r)
export function sipFutureValue(
  monthlyInvestment: number,
  years: number,
  annualReturnPercent: number,
) {
  const n = years * 12;
  const r = annualReturnPercent / 100 / 12;
  if (r === 0) return monthlyInvestment * n;
  return monthlyInvestment * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}

// Required SIP to reach a target corpus
export function sipRequiredForGoal(
  targetAmount: number,
  years: number,
  annualReturnPercent: number,
) {
  const n = years * 12;
  const r = annualReturnPercent / 100 / 12;
  if (r === 0) return targetAmount / n;
  const factor = ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  return targetAmount / factor;
}

// Simple FD maturity calculator (annual compounding by default)
export function fixedDepositMaturity(
  principal: number,
  years: number,
  annualInterestPercent: number,
  compoundingPerYear = 1,
) {
  const r = annualInterestPercent / 100;
  const n = compoundingPerYear;
  return principal * Math.pow(1 + r / n, n * years);
}
