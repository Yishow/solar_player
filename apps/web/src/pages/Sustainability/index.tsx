import { Sparkline } from "../../components/Sparkline";
import { MediaSlot } from "../../components/MediaSlot";
import { sustainabilityHighlights, sustainabilitySummary } from "../../mocks/sustainability";
import { trendSeries } from "../../mocks/metrics";
import { PageScaffold } from "../shared/PageScaffold";
import { buildSustainabilityViewModel } from "./viewModel";
import sustainHeroRef from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/provisional/sustain-hero-ref.jpg";

export function Sustainability() {
  const viewModel = buildSustainabilityViewModel({
    highlights: sustainabilityHighlights,
    summary: sustainabilitySummary
  });

  return (
    <PageScaffold
      path="/sustainability"
      description="永續成果 storytelling、big numbers 與 ESG 行動摘要。"
    >
      <section className="relative grid min-h-[620px] grid-cols-12 gap-6 overflow-hidden">
        <div className="pointer-events-none absolute left-[30%] top-[78%] h-24 w-56 rounded-full bg-brand-100/50 blur-3xl" />

        <div className="col-span-5 flex flex-col justify-between py-3">
          <div>
            <p className="font-en text-sm uppercase tracking-[0.28em] text-brand-700">
              {viewModel.hero.eyebrow}
            </p>
            <h2 className="mt-5 text-[64px] font-bold leading-[1.06] tracking-[0.08em] text-brand-900">
              {viewModel.hero.title.map((line) => (
                <span key={line} className="block">
                  {line === "永續成果" ? <em className="not-italic text-accent-sun-600">{line}</em> : line}
                </span>
              ))}
            </h2>
            <p className="mt-4 font-en text-xl tracking-[0.16em] text-neutral-500">
              {viewModel.hero.subtitle}
            </p>
            <div className="mt-8 space-y-2 text-[21px] leading-[1.6] text-neutral-700">
              {viewModel.hero.copyZhLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <div className="mt-6 space-y-1 font-en text-lg leading-[1.45] text-neutral-500">
              {viewModel.hero.copyEnLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-7 flex flex-col gap-5">
          <MediaSlot density="playback" className="h-[280px] rounded-[34px] p-0">
            <img
              alt="永續成果場域影像"
              className="h-full w-full object-cover object-center"
              src={sustainHeroRef}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white/16 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/28 via-white/8 to-transparent" />
          </MediaSlot>

          <div className="grid grid-cols-3 gap-4">
            {viewModel.bigNumbers.map((item) => (
              <article
                key={item.label}
                className="rounded-[28px] border border-white/75 bg-white/92 px-6 py-5 shadow-card backdrop-blur"
              >
                <p className="text-sm font-semibold tracking-[0.08em] text-neutral-600">{item.label}</p>
                <p className="mt-2 font-en text-xs uppercase tracking-[0.18em] text-brand-700">
                  {item.helper}
                </p>
                <div className="mt-7 flex items-end gap-3">
                  <p className="text-[54px] font-bold leading-none text-brand-900">{item.value}</p>
                  <span className="pb-1 font-en text-lg font-semibold uppercase tracking-[0.14em] text-brand-700">
                    {item.unit}
                  </span>
                </div>
                <Sparkline className="mt-4 h-14" values={trendSeries} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-4">
        {viewModel.esgCards.map((card, index) => (
          <article
            key={card.label}
            className="rounded-[28px] border border-white/75 bg-white/92 px-6 py-6 shadow-card backdrop-blur"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-2xl shadow-soft">
              {index === 0 ? "🛒" : index === 1 ? "📄" : "🌳"}
            </div>
            <p className="mt-5 text-[22px] font-semibold tracking-[0.08em] text-brand-900">{card.label}</p>
            <p className="mt-1 font-en text-sm uppercase tracking-[0.18em] text-neutral-500">
              {card.subtitle}
            </p>
            {"value" in card ? (
              <p className="mt-8 text-[48px] font-bold leading-none text-brand-900">{card.value}</p>
            ) : (
              <ul className="mt-6 space-y-3 text-base leading-7 text-neutral-600">
                {card.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </section>

      <section className="grid grid-cols-4 gap-4">
        {viewModel.highlights.map((item) => (
          <article
            key={item.label}
            className="rounded-[24px] border border-white/70 bg-white/84 px-5 py-5 shadow-card backdrop-blur"
          >
            <p className="text-sm font-semibold tracking-[0.08em] text-neutral-500">{item.label}</p>
            <div className="mt-4 flex items-end gap-2">
              <p className="text-[42px] font-bold leading-none text-brand-900">{item.value}</p>
              <span className="pb-1 font-en text-base uppercase tracking-[0.14em] text-brand-700">
                {item.unit}
              </span>
            </div>
          </article>
        ))}
      </section>
    </PageScaffold>
  );
}
