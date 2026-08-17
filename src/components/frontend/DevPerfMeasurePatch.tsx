/**
 * Dev-only workaround for Next.js/React Turbopack bug:
 * https://github.com/vercel/next.js/issues/86060
 *
 * When `notFound()` / early abort runs, React calls `performance.measure` with
 * `childrenEndTime === -Infinity` → browser throws → noisy red overlay.
 * Production builds are unaffected; this only suppresses the bad measure call.
 */
import Script from 'next/script'

const PATCH = `(function(){try{var p=window.performance;if(!p||typeof p.measure!=="function"||p.__nazemiPerfPatched)return;var o=p.measure.bind(p);p.measure=function(){try{return o.apply(p,arguments)}catch(e){var m=(e&&e.message)||"";if(m.indexOf("negative time stamp")!==-1||m.indexOf("cannot be negative")!==-1)return;throw e}};p.__nazemiPerfPatched=true}catch(_){}})();`

export function DevPerfMeasurePatch() {
  if (process.env.NODE_ENV !== 'development') return null

  return (
    <Script id="nazemi-dev-perf-measure-patch" strategy="beforeInteractive">
      {PATCH}
    </Script>
  )
}
