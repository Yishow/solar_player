import { useState } from "react";
import { PanelCard } from "../../components/PanelCard";
import { PageScaffold } from "../shared/PageScaffold";
import { imageMocks } from "../../mocks/images";

export function Images() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = imageMocks[activeIndex]!;

  return (
    <PageScaffold
      path="/images"
      description="圖片輪播展示頁，支援手動切換與自動輪播。"
    >
      {/* Main Image Area */}
      <div className="flex gap-6">
        <div className="flex-1">
          <PanelCard title="展示圖片" subtitle="IMAGE SLIDESHOW">
            <div className="relative flex h-96 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200">
              <div className="text-center">
                <span className="text-6xl">🖼️</span>
                <p className="mt-4 text-xl font-semibold text-neutral-800">{active.title}</p>
                <p className="mt-1 text-sm text-neutral-500">{active.resolution}</p>
              </div>
              {/* Navigation overlay */}
              <button
                onClick={() => setActiveIndex((i) => (i > 0 ? i - 1 : imageMocks.length - 1))}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-2 text-xl font-bold text-neutral-700 shadow-lg transition hover:bg-white"
              >
                ‹
              </button>
              <button
                onClick={() => setActiveIndex((i) => (i < imageMocks.length - 1 ? i + 1 : 0))}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-2 text-xl font-bold text-neutral-700 shadow-lg transition hover:bg-white"
              >
                ›
              </button>
            </div>
            {/* Thumbnails */}
            <div className="mt-4 flex gap-3">
              {imageMocks.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveIndex(i)}
                  className={`h-16 w-24 rounded-lg border-2 transition ${
                    i === activeIndex
                      ? "border-brand-600 bg-brand-100"
                      : "border-transparent bg-neutral-100 hover:border-neutral-300"
                  }`}
                >
                  <span className="text-xs text-neutral-600">{img.id}</span>
                </button>
              ))}
            </div>
          </PanelCard>
        </div>

        {/* Info Card */}
        <div className="w-80">
          <PanelCard title="圖片資訊" subtitle="IMAGE INFO">
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-neutral-500">標題</p>
                <p className="mt-1 text-lg font-semibold text-neutral-800">{active.title}</p>
              </div>
              <div>
                <p className="font-medium text-neutral-500">編號</p>
                <p className="mt-1 font-mono text-neutral-700">{active.id}</p>
              </div>
              <div>
                <p className="font-medium text-neutral-500">使用區域</p>
                <p className="mt-1 text-neutral-700">{active.area}</p>
              </div>
              <div>
                <p className="font-medium text-neutral-500">解析度</p>
                <p className="mt-1 text-neutral-700">{active.resolution}</p>
              </div>
              <div>
                <p className="font-medium text-neutral-500">停留時間</p>
                <p className="mt-1 text-neutral-700">{active.durationSec} 秒</p>
              </div>
              <div>
                <p className="font-medium text-neutral-500">更新時間</p>
                <p className="mt-1 text-neutral-700">{active.updatedAt}</p>
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </PageScaffold>
  );
}
