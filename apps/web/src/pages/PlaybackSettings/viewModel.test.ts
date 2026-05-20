import assert from "node:assert/strict";
import test from "node:test";
import type { DisplayRotationPreview, PlaybackPage, PlaybackSettings } from "@solar-display/shared";
import { buildPlaybackSettingsViewModel, reorderPlaybackPages } from "./viewModel";

const settings: PlaybackSettings = {
  autoplay: true,
  brightness: 88,
  idleMode: "return-to-start",
  idleTimeout: 90,
  loop: true,
  orientation: "landscape",
  repeatDays: [1, 3, 5],
  scheduleEnabled: true,
  scheduleEnd: "19:00",
  scheduleStart: "07:30",
  startPage: 2,
  transitionSpeed: 1500,
  transitionType: "slide",
  updatedAt: null
};

const pages: PlaybackPage[] = [
  {
    displayOrder: 2,
    durationSeconds: 20,
    enabled: true,
    id: 2,
    labelEn: "Solar",
    labelZh: "太陽能",
    pageKey: "solar",
    route: "/solar"
  },
  {
    displayOrder: 1,
    durationSeconds: 15,
    enabled: true,
    id: 1,
    labelEn: "Overview",
    labelZh: "總覽",
    pageKey: "overview",
    route: "/overview"
  },
  {
    displayOrder: 3,
    durationSeconds: 12,
    enabled: false,
    id: 3,
    labelEn: "Images",
    labelZh: "圖庫",
    pageKey: "images",
    route: "/images"
  }
];

const effectiveRotationPreview: DisplayRotationPreview = {
  evaluatedAt: "2026-05-18T09:30:00.000Z",
  fallbackRoute: null,
  playablePages: [
    {
      displayOrder: 1,
      durationSeconds: 15,
      enabled: true,
      id: 1,
      labelEn: "Overview",
      labelZh: "總覽",
      pageKey: "overview",
      route: "/overview"
    }
  ],
  skippedPages: [
    {
      detail: "尚未收到可用的即時資料",
      displayOrder: 2,
      durationSeconds: 20,
      enabled: true,
      id: 2,
      labelEn: "Solar",
      labelZh: "太陽能",
      pageKey: "solar",
      route: "/solar",
      skipReason: "stale-runtime"
    },
    {
      detail: null,
      displayOrder: 3,
      durationSeconds: 12,
      enabled: false,
      id: 3,
      labelEn: "Images",
      labelZh: "圖庫",
      pageKey: "images",
      route: "/images",
      skipReason: "disabled"
    }
  ]
};

test("reorderPlaybackPages rewrites display order after moving a page upward", () => {
  const reordered = reorderPlaybackPages(pages, 3, -1);

  assert.deepEqual(
    reordered.map((page) => ({
      displayOrder: page.displayOrder,
      id: page.id
    })),
    [
      { id: 1, displayOrder: 1 },
      { id: 3, displayOrder: 2 },
      { id: 2, displayOrder: 3 }
    ]
  );
});

test("buildPlaybackSettingsViewModel summarizes schedule, start page, and ordered page rows", () => {
  const model = buildPlaybackSettingsViewModel({
    errorMessage: "",
    isSaving: false,
    message: "播放設定已同步。",
    pages,
    rotationPreview: effectiveRotationPreview,
    settings
  });

  assert.equal(model.summary.enabledCount, 2);
  assert.equal(model.summary.totalPages, 3);
  assert.equal(model.summary.totalDurationSeconds, 47);
  assert.equal(model.summary.startPageLabel, "02. 太陽能");
  assert.equal(model.summary.scheduleLabel, "每週一、三、五 • 07:30 - 19:00");
  assert.equal(model.saveBanner.tone, "ready");
  assert.equal(model.pageRows[0]?.id, 1);
  assert.equal(model.pageRows[0]?.canMoveUp, false);
  assert.equal(model.pageRows[1]?.orderLabel, "02");
  assert.equal(model.pageRows[2]?.statusLabel, "已停用");
  assert.deepEqual(
    model.rotationPreviewRows,
    [
      {
        durationLabel: "15 秒",
        id: 1,
        labelEn: "Overview",
        labelZh: "總覽",
        orderLabel: "01",
        pageId: "overview",
        route: "/overview",
        templateKey: "overview"
      },
      {
        durationLabel: "20 秒",
        id: 2,
        labelEn: "Solar",
        labelZh: "太陽能",
        orderLabel: "02",
        pageId: "solar",
        route: "/solar",
        templateKey: "solar"
      }
    ]
  );
  assert.deepEqual(
    model.effectiveRotationRows,
    [
      {
        durationLabel: "15 秒",
        id: 1,
        labelEn: "Overview",
        labelZh: "總覽",
        orderLabel: "01",
        pageId: "overview",
        route: "/overview",
        templateKey: "overview"
      }
    ]
  );
  assert.deepEqual(
    model.skippedRotationRows,
    [
      {
        detail: "尚未收到可用的即時資料",
        labelEn: "Solar",
        labelZh: "太陽能",
        skipReasonLabel: "即時資料逾時",
        skipReasonText: "stale-runtime"
      },
      {
        detail: null,
        labelEn: "Images",
        labelZh: "圖庫",
        skipReasonLabel: "頁面已停用",
        skipReasonText: "disabled"
      }
    ]
  );
});

test("buildPlaybackSettingsViewModel maps dominant display faults into repair destinations", () => {
  const cases = [
    {
      code: "mqtt-mapping-missing" as const,
      expectedDestination: "MQTT Settings",
      expectedKind: "mqtt-mapping",
      message: "overview 缺少必要的 MQTT mapping",
      pageId: "overview" as const
    },
    {
      code: "slot-binding-missing" as const,
      expectedDestination: "Circuit Settings",
      expectedKind: "slot-binding",
      message: "solar 缺少必要的 circuit slot 綁定",
      pageId: "solar" as const
    },
    {
      code: "stale-runtime" as const,
      expectedDestination: "Playback Settings",
      expectedKind: "runtime-readiness",
      message: "images runtime 已逾時，暫時跳過輪播",
      pageId: "images" as const
    },
    {
      code: "unpublished" as const,
      expectedDestination: "Display Pages Editor",
      expectedKind: "publish-state",
      message: "factory-circuit 最新 draft 尚未發布，因此未進入正式輪播",
      pageId: "factory-circuit" as const
    }
  ];

  for (const testCase of cases) {
    const model = buildPlaybackSettingsViewModel({
      errorMessage: "",
      isSaving: false,
      message: "播放設定已同步。",
      pages,
      displayOpsSummary: {
        blockingIssues: [
          {
            code: testCase.code,
            message: testCase.message,
            pageId: testCase.pageId,
            severity: "blocking"
          }
        ],
        draftCount: 0,
        draftPending: false,
        generatedAt: "2026-05-20T02:45:00.000Z",
        lastPublishAt: "2026-05-20T01:30:00.000Z",
        liveVersion: 6,
        pages: [
          {
            blockingIssues: [
              {
                code: testCase.code,
                message: testCase.message,
                pageId: testCase.pageId,
                severity: "blocking"
              }
            ],
            draftPending: false,
            draftVersion: null,
            labelEn: testCase.pageId,
            labelZh: testCase.pageId,
            liveVersion: 6,
            pageId: testCase.pageId,
            publishState: testCase.code === "unpublished" ? "draft-only" : "live",
            route: `/${testCase.pageId}`,
            skipDetail: testCase.message,
            skipReason:
              testCase.code === "mqtt-mapping-missing"
                ? "mqtt-mapping-missing"
                : testCase.code === "slot-binding-missing"
                  ? "slot-binding-missing"
                  : testCase.code === "stale-runtime"
                    ? "stale-runtime"
                    : "unpublished",
            skipState: "skipped"
          }
        ],
        skipCount: 1
      },
      rotationPreview: effectiveRotationPreview,
      settings
    });

    assert.equal(model.triageSummary?.repairDestinationLabel, testCase.expectedDestination);
    assert.equal(model.triageSummary?.faultKind, testCase.expectedKind);
    assert.deepEqual(model.triageSummary?.affectedPages, [testCase.pageId]);
    assert.match(model.displayOpsBanner.detail, new RegExp(testCase.expectedDestination));
  }
});
