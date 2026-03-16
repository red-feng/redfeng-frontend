"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { updatePackageStep4 } from "../../actions"
import { formatPickupTimeInput, parseStoredPickupTime } from "@/lib/time/pickupTime"
import { getMerchantWizardText, merchantWizardLanguageOptions } from "@/lib/merchant-wizard-i18n"
import { normalizeLocale, type Locale } from "@/lib/i18n"
import { requestMerchantAutoTranslations } from "@/lib/merchant-auto-translation-client"

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
  publishedLanguages,
  uiLocale = "id",
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
  publishedLanguages: string[]
  uiLocale?: string
}) {
  const t = getMerchantWizardText(normalizeLocale(uiLocale))
  const normalizedDefaultLanguage = normalizeLocale(defaultLanguage)
  const [activeLang, setActiveLang] = useState<Locale>(normalizedDefaultLanguage)
  const [isRetranslatingLanguage, setIsRetranslatingLanguage] = useState<Locale | null>(null)
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
  const [expandedDayIndex, setExpandedDayIndex] = useState(0)
  const manualOverridesRef = useRef<Set<string>>(
    new Set(
      initialDays.flatMap((day, dayIndex) => {
        const dayKeys = (["id", "en", "zh"] as Locale[])
          .filter((language) => language !== normalizedDefaultLanguage)
          .flatMap((language) => {
            const keys: string[] = []
            if (day.translations[language]?.title?.trim()) keys.push(`day:${dayIndex}:title:${language}`)
            if (day.translations[language]?.description?.trim()) keys.push(`day:${dayIndex}:description:${language}`)
            return keys
          })

        const routeKeys = day.routes.flatMap((route, routeIndex) =>
          (["id", "en", "zh"] as Locale[])
            .filter((language) => language !== normalizedDefaultLanguage)
            .flatMap((language) =>
              route.translations[language]?.trim() ? [`route:${dayIndex}:${routeIndex}:${language}`] : [],
            ),
        )

        return [...dayKeys, ...routeKeys]
      }),
    ),
  )
  const translationTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const targetLanguages = useMemo(
    () =>
      LANGS.map((lang) => lang.code).filter(
        (lang): lang is Locale => lang !== normalizedDefaultLanguage && publishedLanguages.includes(lang),
      ),
    [normalizedDefaultLanguage, publishedLanguages],
  )
  const visibleLanguages = useMemo(
    () => LANGS.filter((lang) => lang.code === normalizedDefaultLanguage || publishedLanguages.includes(lang.code)),
    [normalizedDefaultLanguage, publishedLanguages],
  )

  useEffect(() => {
    const timers = translationTimersRef.current
    return () => {
      Object.values(timers).forEach((timer) => clearTimeout(timer))
    }
  }, [])

  useEffect(() => {
    if (!visibleLanguages.some((lang) => lang.code === activeLang)) {
      setActiveLang(normalizedDefaultLanguage)
    }
  }, [activeLang, normalizedDefaultLanguage, visibleLanguages])

  const addDay = () => {
    setDays((prev) => {
      const nextIndex = prev.length
      setExpandedDayIndex(nextIndex)
      return [
        ...prev,
        {
          day: nextIndex + 1,
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
      ]
    })
  }

  const removeDay = (dayIndex: number) => {
    setDays((prev) => {
      const nextDays = prev
        .filter((_, index) => index !== dayIndex)
        .map((day, index) => ({ ...day, day: index + 1 }))

      setExpandedDayIndex((current) => {
        if (nextDays.length === 0) return 0
        if (current === dayIndex) return Math.max(0, dayIndex - 1)
        if (current > dayIndex) return current - 1
        return current
      })

      return nextDays
    })
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

  const scheduleDayAutoTranslate = (dayIndex: number, field: "title" | "description", value: string) => {
    const timerKey = `day:${dayIndex}:${field}:${normalizedDefaultLanguage}`
    if (translationTimersRef.current[timerKey]) {
      clearTimeout(translationTimersRef.current[timerKey])
    }

    if (!value.trim()) {
      setDays((prev) => {
        const updated = [...prev]
        for (const language of targetLanguages) {
          const manualKey = `day:${dayIndex}:${field}:${language}`
          if (!manualOverridesRef.current.has(manualKey)) {
            updated[dayIndex].translations[language] = {
              ...updated[dayIndex].translations[language],
              [field]: "",
            }
          }
        }
        return updated
      })
      return
    }

    translationTimersRef.current[timerKey] = setTimeout(async () => {
      try {
        const translations = await requestMerchantAutoTranslations({
          text: value,
          sourceLanguage: normalizedDefaultLanguage,
          targetLanguages,
        })

        setDays((prev) => {
          const updated = [...prev]
          for (const language of targetLanguages) {
            const translatedValue = translations[language]
            const manualKey = `day:${dayIndex}:${field}:${language}`
            if (!manualOverridesRef.current.has(manualKey) && typeof translatedValue === "string") {
              updated[dayIndex].translations[language] = {
                ...updated[dayIndex].translations[language],
                [field]: translatedValue,
              }
            }
          }
          return updated
        })
      } catch (error) {
        console.error("edit step4 day auto translate error:", error)
      }
    }, 700)
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

    if (activeLang !== normalizedDefaultLanguage) {
      manualOverridesRef.current.add(`day:${dayIndex}:${field}:${activeLang}`)
      return
    }

    scheduleDayAutoTranslate(dayIndex, field, value)
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

  const scheduleRouteAutoTranslate = (dayIndex: number, routeIndex: number, value: string) => {
    const timerKey = `route:${dayIndex}:${routeIndex}:${normalizedDefaultLanguage}`
    if (translationTimersRef.current[timerKey]) {
      clearTimeout(translationTimersRef.current[timerKey])
    }

    if (!value.trim()) {
      setDays((prev) => {
        const updated = [...prev]
        for (const language of targetLanguages) {
          const manualKey = `route:${dayIndex}:${routeIndex}:${language}`
          if (!manualOverridesRef.current.has(manualKey)) {
            updated[dayIndex].routes[routeIndex].translations[language] = ""
          }
        }
        return updated
      })
      return
    }

    translationTimersRef.current[timerKey] = setTimeout(async () => {
      try {
        const translations = await requestMerchantAutoTranslations({
          text: value,
          sourceLanguage: normalizedDefaultLanguage,
          targetLanguages,
        })

        setDays((prev) => {
          const updated = [...prev]
          for (const language of targetLanguages) {
            const translatedValue = translations[language]
            const manualKey = `route:${dayIndex}:${routeIndex}:${language}`
            if (!manualOverridesRef.current.has(manualKey) && typeof translatedValue === "string") {
              updated[dayIndex].routes[routeIndex].translations[language] = translatedValue
            }
          }
          return updated
        })
      } catch (error) {
        console.error("edit step4 route auto translate error:", error)
      }
    }, 700)
  }

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const dayTasks = days.flatMap((day, dayIndex) =>
          (["title", "description"] as const).map(async (field) => {
            const sourceValue = day.translations[normalizedDefaultLanguage][field]
            const pendingTargets = targetLanguages.filter(
              (language) =>
                !manualOverridesRef.current.has(`day:${dayIndex}:${field}:${language}`) &&
                !day.translations[language][field]?.trim(),
            )

            if (!sourceValue.trim() || pendingTargets.length === 0) return null

            const translations = await requestMerchantAutoTranslations({
              text: sourceValue,
              sourceLanguage: normalizedDefaultLanguage,
              targetLanguages: pendingTargets,
            })

            return { dayIndex, field, pendingTargets, translations }
          }),
        )

        const routeTasks = days.flatMap((day, dayIndex) =>
          day.routes.map(async (route, routeIndex) => {
            const sourceValue = route.translations[normalizedDefaultLanguage]
            const pendingTargets = targetLanguages.filter(
              (language) =>
                !manualOverridesRef.current.has(`route:${dayIndex}:${routeIndex}:${language}`) &&
                !route.translations[language]?.trim(),
            )

            if (!sourceValue.trim() || pendingTargets.length === 0) return null

            const translations = await requestMerchantAutoTranslations({
              text: sourceValue,
              sourceLanguage: normalizedDefaultLanguage,
              targetLanguages: pendingTargets,
            })

            return { dayIndex, routeIndex, pendingTargets, translations }
          }),
        )

        const [dayResults, routeResults] = await Promise.all([
          Promise.all(dayTasks),
          Promise.all(routeTasks),
        ])

        setDays((prev) => {
          const updated = [...prev]

          for (const result of dayResults) {
            if (!result) continue
            for (const language of result.pendingTargets) {
              const translatedValue = result.translations[language]
              if (
                !manualOverridesRef.current.has(`day:${result.dayIndex}:${result.field}:${language}`) &&
                typeof translatedValue === "string"
              ) {
                updated[result.dayIndex].translations[language] = {
                  ...updated[result.dayIndex].translations[language],
                  [result.field]:
                    updated[result.dayIndex].translations[language][result.field] || translatedValue,
                }
              }
            }
          }

          for (const result of routeResults) {
            if (!result) continue
            for (const language of result.pendingTargets) {
              const translatedValue = result.translations[language]
              if (
                !manualOverridesRef.current.has(`route:${result.dayIndex}:${result.routeIndex}:${language}`) &&
                typeof translatedValue === "string"
              ) {
                updated[result.dayIndex].routes[result.routeIndex].translations[language] =
                  updated[result.dayIndex].routes[result.routeIndex].translations[language] || translatedValue
              }
            }
          }

          return updated
        })
      } catch (error) {
        console.error("edit step4 publish auto translate error:", error)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [days, normalizedDefaultLanguage, targetLanguages])

  const updateRouteTranslation = (dayIndex: number, routeIndex: number, value: string) => {
    setDays((prev) => {
      const updated = [...prev]
      updated[dayIndex].routes[routeIndex].translations[activeLang] = value
      return updated
    })

    if (activeLang !== normalizedDefaultLanguage) {
      manualOverridesRef.current.add(`route:${dayIndex}:${routeIndex}:${activeLang}`)
      return
    }

    scheduleRouteAutoTranslate(dayIndex, routeIndex, value)
  }

  const retranslateLanguage = async (language: Locale) => {
    if (language === normalizedDefaultLanguage || !publishedLanguages.includes(language)) return

    setIsRetranslatingLanguage(language)
    try {
      const dayTasks = days.flatMap((day, dayIndex) =>
        (["title", "description"] as const).map(async (field) => {
          const sourceValue = day.translations[normalizedDefaultLanguage][field]
          if (!sourceValue.trim()) return { type: "day" as const, dayIndex, field, value: "" }

          const translations = await requestMerchantAutoTranslations({
            text: sourceValue,
            sourceLanguage: normalizedDefaultLanguage,
            targetLanguages: [language],
          })

          return { type: "day" as const, dayIndex, field, value: translations[language] || "" }
        }),
      )

      const routeTasks = days.flatMap((day, dayIndex) =>
        day.routes.map(async (route, routeIndex) => {
          const sourceValue = route.translations[normalizedDefaultLanguage]
          if (!sourceValue.trim()) return { type: "route" as const, dayIndex, routeIndex, value: "" }

          const translations = await requestMerchantAutoTranslations({
            text: sourceValue,
            sourceLanguage: normalizedDefaultLanguage,
            targetLanguages: [language],
          })

          return { type: "route" as const, dayIndex, routeIndex, value: translations[language] || "" }
        }),
      )

      const results = await Promise.all([...dayTasks, ...routeTasks])

      setDays((prev) => {
        const updated = [...prev]
        for (const result of results) {
          if (result.type === "day") {
            updated[result.dayIndex].translations[language] = {
              ...updated[result.dayIndex].translations[language],
              [result.field]: result.value,
            }
            continue
          }

          updated[result.dayIndex].routes[result.routeIndex].translations[language] = result.value
        }
        return updated
      })
    } catch (error) {
      console.error("edit step4 retranslate language error:", error)
    } finally {
      setIsRetranslatingLanguage(null)
    }
  }

  return (
    <form action={updatePackageStep4} className="space-y-12">
      <input type="hidden" name="package_id" value={packageId} />
      <input type="hidden" name="default_language" value={defaultLanguage} />

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {t.contentLanguage}: <strong>{activeLang}</strong>
          </p>
          {activeLang !== normalizedDefaultLanguage && publishedLanguages.includes(activeLang) && (
            <button
              type="button"
              onClick={() => void retranslateLanguage(activeLang)}
              disabled={isRetranslatingLanguage === activeLang}
              className="rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-600 transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRetranslatingLanguage === activeLang
                ? (t.retranslateInProgress || "Translating...")
                : (t.retranslate || "Retranslate")}
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {visibleLanguages.map((lang) => (
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
        <div key={dayIndex} className="rounded-2xl border border-slate-200 bg-slate-50">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <button
              type="button"
              onClick={() => setExpandedDayIndex((current) => (current === dayIndex ? -1 : dayIndex))}
              className="flex flex-1 items-center justify-between gap-4 text-left"
            >
              <div className="min-w-0">
                <h3 className="text-xl font-semibold text-slate-800">{t.dayLabel} {day.day}</h3>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {day.translations[activeLang].title || t.dayTitlePlaceholder}
                </p>
              </div>
              <span className="text-2xl font-light text-slate-400">
                {expandedDayIndex === dayIndex ? "−" : "+"}
              </span>
            </button>
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

          <div className={expandedDayIndex === dayIndex ? "space-y-8 p-8" : "hidden"}>
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              <h4 className="text-sm font-medium text-slate-600">{t.dayTitleLabel}</h4>
              <input
                value={day.translations[activeLang].title}
                onChange={(event) => updateDayTranslation(dayIndex, "title", event.target.value)}
                placeholder={t.dayTitlePlaceholder}
                className="w-full max-w-xl rounded-xl border p-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

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
                        placeholder="1:30"
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
          {t.saveAndNext}
        </button>
      </div>
    </form>
  )
}
