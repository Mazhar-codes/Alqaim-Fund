import { TERMS_INTRO, TERMS_SECTIONS, TERMS_CLOSING } from "@/lib/termsAndConditions";

/** Renders the full Terms & Conditions text — shared by the registration acceptance gate and the standalone /terms page. */
export default function TermsContent() {
  return (
    <div className="space-y-5 text-sm leading-relaxed text-gray-700">
      <p className="font-medium text-gray-900">{TERMS_INTRO}</p>
      {TERMS_SECTIONS.map((section) => (
        <div key={section.title}>
          <h3 className="font-semibold text-gray-900">{section.title}</h3>
          <p className="mt-1">{section.body}</p>
          {section.list && (
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {section.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
      <p className="text-gray-500">{TERMS_CLOSING}</p>
    </div>
  );
}
