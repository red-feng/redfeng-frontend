import assert from "node:assert/strict"
import {
  calculateFlightBookingAmounts,
  calculateFlightFareForCustomer,
  defaultFinanceSettings,
  getFinanceSettings,
} from "../lib/finance/settings.ts"

async function runCase(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    console.log(`PASS ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}`)
    throw error
  }
}

function settingsWithFlightPricing() {
  return {
    ...defaultFinanceSettings,
    customerTaxPercent: 12,
    flightPricing: {
      markupPercent: 2,
      minimumMarginAmount: 20000,
      maximumMarginAmount: 75000,
    },
  }
}

await runCase("flight pricing uses minimum margin for low fares", () => {
  const result = calculateFlightFareForCustomer(700000, settingsWithFlightPricing())

  assert.equal(result.supplierFareAmount, 700000)
  assert.equal(result.markupAmount, 20000)
  assert.equal(result.taxAmount, 86400)
  assert.equal(result.customerFareAmount, 806400)
})

await runCase("flight pricing uses percentage margin inside min/max band", () => {
  const result = calculateFlightFareForCustomer(2000000, settingsWithFlightPricing())

  assert.equal(result.markupAmount, 40000)
  assert.equal(result.taxAmount, 244800)
  assert.equal(result.customerFareAmount, 2284800)
})

await runCase("flight pricing caps high-fare margin", () => {
  const result = calculateFlightFareForCustomer(6000000, settingsWithFlightPricing())

  assert.equal(result.markupAmount, 75000)
  assert.equal(result.taxAmount, 729000)
  assert.equal(result.customerFareAmount, 6804000)
})

await runCase("flight checkout adds admin fee without adding ticket tax twice", () => {
  const settings = settingsWithFlightPricing()
  const result = calculateFlightBookingAmounts(806400, 86400, "bank_transfer", settings)

  assert.equal(result.subtotalAmount, 806400)
  assert.equal(result.customerTaxPercent, 12)
  assert.equal(result.customerTaxAmount, 86400)
  assert.equal(result.customerAdminFeePercent, 3)
  assert.equal(result.customerAdminFeeAmount, 24192)
  assert.equal(result.totalAmount, 830592)
})

await runCase("legacy flat flight settings migrate to percent with min and max", async () => {
  const fakeAdmin = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: "default",
              redfeng_commission_percent: 15,
              customer_admin_fee_percent: 3,
              customer_tax_percent: 12,
              merchant_transfer_fee: 6500,
              customer_admin_fee_rules: {
                bank_transfer: 3,
                qris: 1.5,
                credit_card: 3.5,
                flight_markup_flat_amount: 20000,
                flight_markup_percent: 0,
                flight_minimum_margin_amount: 15000,
              },
              merchant_transfer_fee_rules: {},
            },
            error: null,
          }),
        }),
      }),
    }),
  }

  const settings = await getFinanceSettings(fakeAdmin)

  assert.deepEqual(settings.flightPricing, {
    markupPercent: 2,
    minimumMarginAmount: 20000,
    maximumMarginAmount: 75000,
  })
})
