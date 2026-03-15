"use client"

import { useState } from "react"
import { updatePackageStep4 } from "../../actions"
import { formatPickupTimeInput, parseStoredPickupTime } from "@/lib/time/pickupTime"
import { getMerchantWizardText, merchantWizardLanguageOptions } from "@/lib/merchant-wizard-i18n"
import { normalizeLocale, type Locale } from "@/lib/i18n"

const LANGS = merchantWizardLanguageOptions.map((language) => ({
  code: language.code,
  label: language.label,
})) as Array<{ code: Locale; label: string }>

type RouteTranslation = Record<Locale, string>
type DayTranslation = Record<Locale, { title: string; description: string }>

type RouteType = {
  pickupTime: string
  pickupPeriod: "AM" | "PM"
  translations: RouteTranslation
}

type DayType = {
  day: number
  translations: DayTranslation
  routes: RouteType[]
}

export default function EditStep4Itinerary({
  packageId,
  initialDays,
  defaultLanguage = "id",
}: {
  packageId: string
  initialDays: Array<{
    day: number
    translations: DayTranslation
    routes: Array<{
      pickup_time: string
      translations: RouteTranslation
    }>
  }>
  defaultLanguage?: string
}) {
  const locale = normalizeLocale(defaultLanguage)
  const t = getMerchantWizardText(locale)
  const [activeLang, setActiveLang] = useState<Locale>(locale)
  const [days, setDays] = useState<DayType[]>(
    initialDays.length > 0
      ? initialDays.map((day) => ({
          day: day.day,
          translations: day.translations,
          routes:
            day.routes.length > 0
              ? day.routes.map((route) => ({
                  ...parseStoredPickupTime(route.pickup_time || ""),
                  translations: route.translations,
                }))
              : [
                  {
                    pickupTime: "",
                    pickupPeriod: "AM",
                    translations: { id: "", en: "", zh: "" },
                  },
                ],
        }))
      : [
          {
            day: 1,
            translations: {
              id: { title: "", description: "" },
              en: { title: "", description: "" },
              zh: { title: "", description: "" },
            },
            routes: [
              {
                pickupTime: "",
                pickupPeriod: "AM",
                translations: { id: "", en: "", zh: "" },
              },
            ],
          },
        ],
  )

  const addDay = () => {
    setDays((prev) => [
      ...prev,
      {
        day: prev.length + 1,
        translations: {
          id: { title: "", description: "" },
          en: { title: "", description: "" },
          zh: { title: "", description: "" },
        },
        routes: [
          {
            pickupTime: "",
            pickupPeriod: "AM",
            translations: { id: "", en: "", zh: "" },
          },
        ],
      },
    ])
  }

  const removeDay = (dayIndex: number) => {
    setDays((prev) =>
      prev
        .filter((_, index) => index !== dayIndex)
        .map((day, index) => ({ ...day, day: index + 1 })),
    )
  }

  const addRoute = (dayIndex: number) => {
    setDays((prev) => {
      const updated = [...prev]
      updated[dayIndex].routes.push({
        pickupTime: "",
        pickupPeriod: "AM",
        translations: { id: "", en: "", zh: "" },
      })
      return updated
    })
  }

  const removeRoute = (dayIndex: number, routeIndex: number) => {
    setDays((prev) => {
      const updated = [...prev]
      updated[dayIndex].routes = updated[dayIndex].routes.filter((_, index) => index !== routeIndex)
      return updated
    })
  }

  const updateDayTranslation = (dayIndex: number, field: "title" | "description", value: string) => {
    setDays((prev) => {
      const updated = [...prev]
      updated[dayIndex].translations[activeLang] = {
        ...updated[dayIndex].translations[activeLang],
        [field]: value,
      }
      return updated
    })
  }

  const updateRouteField = (dayIndex: number, routeIndex: number, field: "pickupTime" | "pickupPeriod", value: string) => {
    setDays((prev) => {
      const updated = [...prev]
      updated[dayIndex].routes[routeIndex] = {
        ...updated[dayIndex].routes[routeIndex],
        [field]: field === "pickupTime" ? formatPickupTimeInput(value) : value,
      }
      return updated
    })
  }

  const updateRouteTranslation = (dayIndex: number, routeIndex: number, value: string) => {
    setDays((prev) => {
      const updated = [...prev]
      updated[dayIndex].routes[routeIndex].translations[activeLang] = value
      return updated
    })
  }

  return (
    <form action={updatePackageStep4} className="space-y-12">
      <input type="hidden" name="package_id" value={packageId} />
      <input type="hidden" name="default_language" value={defaultLanguage} />

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-600">
          {t.contentLanguage}: <strong>{activeLang}</strong>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {LANGS.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setActiveLang(lang.code)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeLang === lang.code
                  ? "bg-orange-500 text-white shadow-sm"
                  : "border border-slate-300 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {days.map((day, dayIndex) => (
        <div key={dayIndex} className="space-y-8 rounded-2xl border border-slate-200 bg-slate-50 p-8">
          <div className="flex items-center justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              <h3 className="text-xl font-semibold text-slate-800">{t.dayLabel} {day.day}</h3>
              <input
                value={day.translations[activeLang].title}
                onChange={(event) => updateDayTranslation(dayIndex, "title", event.target.value)}
                placeholder={t.dayTitlePlaceholder}
                className="w-full max-w-xl rounded-xl border p-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            {days.length > 1 && (
              <button
                type="button"
                onClick={() => removeDay(dayIndex)}
                className="text-sm font-medium text-red-500 hover:underline"
              >
                {t.removeDay}
              </button>
            )}
          </div>

          {LANGS.map((lang) => (
            <div key={`${dayIndex}-${lang.code}`} className="hidden">
              <input type="hidden" name={`day_title_${lang.code}[]`} value={day.translations[lang.code].title} readOnly />
              <textarea name={`description_${lang.code}[]`} value={day.translations[lang.code].description} readOnly />
            </div>
          ))}

          <div className="space-y-6">
            {day.routes.map((route, routeIndex) => (
              <div key={routeIndex} className="grid grid-cols-12 items-end gap-4">
                <input type="hidden" name="day_number[]" value={day.day} />

                <div className="col-span-1 text-sm font-semibold text-slate-400">#{routeIndex + 1}</div>

                <div className="col-span-3">
                  {routeIndex === 0 && <label className="text-sm font-medium text-slate-600">{t.time}</label>}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="pickup_time[]"
                      value={route.pickupTime}
                      onChange={(event) => updateRouteField(dayIndex, routeIndex, "pickupTime", event.target.value)}
                      inputMode="numeric"
                      maxLength={5}
                      pattern="^(?:[1-9]|1[0-2])\\.[0-5][0-9]$"
                      title={t.timeFormatHint}
                      className="w-full rounded-xl border p-3 outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    <select
                      name="pickup_period[]"
                      value={route.pickupPeriod}
                      onChange={(event) => updateRouteField(dayIndex, routeIndex, "pickupPeriod", event.target.value as "AM" | "PM")}
                      className="rounded-xl border p-3 outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>

                <div className="col-span-6">
                  {routeIndex === 0 && <label className="text-sm font-medium text-slate-600">{t.route}</label>}
                  <input
                    value={route.translations[activeLang]}
                    onChange={(event) => updateRouteTranslation(dayIndex, routeIndex, event.target.value)}
                    className="w-full rounded-xl border p-3 outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  {LANGS.map((lang) => (
                    <input
                      key={`${dayIndex}-${routeIndex}-${lang.code}`}
                      type="hidden"
                      name={`route_${lang.code}[]`}
                      value={route.translations[lang.code]}
                      readOnly
                    />
                  ))}
                </div>

                <div className="col-span-2 text-right">
                  {day.routes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRoute(dayIndex, routeIndex)}
                      className="text-sm font-medium text-red-500 hover:underline"
                    >
                      {t.removeRoute}
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addRoute(dayIndex)}
              className="font-semibold text-orange-500 hover:underline"
            >
              {t.addRoute}
            </button>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">{t.dayTripDescription}</label>
            <textarea
              value={day.translations[activeLang].description}
              onChange={(event) => updateDayTranslation(dayIndex, "description", event.target.value)}
              className="mt-2 h-32 w-full rounded-xl border p-4 outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-4 pt-4">
        <button
          type="button"
          onClick={addDay}
          className="rounded-2xl bg-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {t.addDay}
        </button>
        <a
          href="?step=3"
          className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
        >
          {t.back}
        </a>
        <button
          type="submit"
          className="rounded-2xl bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300 px-8 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(249,115,22,0.4)] transition-all duration-300 hover:scale-105"
        >
          {t.saveAndSendReview}
        </button>
      </div>
    </form>
  )
}
