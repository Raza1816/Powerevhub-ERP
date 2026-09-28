export type CurrencyCode = 'PKR' | 'USD' | 'AED' | 'EUR' | 'GBP' | 'SAR'

export interface CurrencyConfig {
  code: CurrencyCode
  symbol: string
  label: string
  locale: string
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  PKR: { code: 'PKR', symbol: 'Rs.', label: 'Pakistani Rupee (PKR)', locale: 'en-PK' },
  USD: { code: 'USD', symbol: '$', label: 'US Dollar ($)', locale: 'en-US' },
  AED: { code: 'AED', symbol: 'AED', label: 'UAE Dirham (AED)', locale: 'en-AE' },
  EUR: { code: 'EUR', symbol: '€', label: 'Euro (€)', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', label: 'British Pound (£)', locale: 'en-GB' },
  SAR: { code: 'SAR', symbol: 'SAR', label: 'Saudi Riyal (SAR)', locale: 'en-SA' },
}

export function formatCurrency(amount: number | null | undefined, currency: CurrencyCode = 'PKR'): string {
  const num = Number(amount) || 0
  const cfg = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.PKR
  const formattedNumber = Math.abs(num).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  if (num < 0) {
    return `-${cfg.symbol} ${formattedNumber}`
  }
  return `${cfg.symbol} ${formattedNumber}`
}

export function formatNumber(num: number | null | undefined, decimals = 0): string {
  const n = Number(num) || 0
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}
