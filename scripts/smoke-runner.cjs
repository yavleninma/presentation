const fs = require("fs");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("playwright");

const rootDir = path.resolve(__dirname, "..");
const smokeOutDir = path.join(rootDir, "test-results", "smoke");
const screenshotsDir = path.join(smokeOutDir, "screenshots");
const resultsPath = path.join(smokeOutDir, "results.json");
const explicitBaseUrl = process.env.AUDIT_BASE_URL || null;
let port = Number(process.env.AUDIT_PORT || 3100);
let baseUrl = explicitBaseUrl || `http://127.0.0.1:${port}`;

const prompt =
  "Нужно показать сервис Внятно: что это за сервис, как мы его создаём и как развиваем дальше. Для команд и руководителей. Уже видно, что человек получает первый черновик за 90 секунд и быстрее понимает главное и следующий шаг.";

const baseSlides = [
  {
    id: "slide-1",
    railTitle: "Обложка",
    title: "Внятно как рабочий сервис",
    subtitle: "Что это и кому помогает",
    bullets: [
      "Сервис для рабочих презентаций",
      "Из сырой мысли в понятный черновик",
      "Для команд и руководителей",
    ],
  },
  {
    id: "slide-2",
    railTitle: "Проблема",
    title: "Почему презентации буксуют",
    subtitle: "Слишком много шума до первого результата",
    bullets: [
      "1 — сырая мысль без структуры",
      "2 — лишние решения до пользы",
      "3 — неясно, что главное",
    ],
  },
  {
    id: "slide-3",
    railTitle: "Три шага",
    title: "Как работает поток",
    subtitle: "От запроса к рабочему черновику",
    bullets: [
      "01 Уточняем главное",
      "02 Собираем черновик",
      "03 Доводим в редакторе",
    ],
  },
  {
    id: "slide-4",
    railTitle: "Результат",
    title: "Что уже даёт сервис",
    subtitle: "Путь становится понятнее",
    bullets: [
      "Человек быстрее видит структуру",
      "Главный акцент появляется раньше",
      "Следующий шаг звучит явно",
    ],
  },
  {
    id: "slide-5",
    railTitle: "Для кого",
    title: "Кому это нужно",
    subtitle: "Три типовых роли",
    bullets: [
      "Сотрудник — быстро собрать основу",
      "Тимлид — показать прогресс без шума",
      "Руководитель — принять решение по следующему шагу",
    ],
  },
  {
    id: "slide-6",
    railTitle: "След. шаг",
    title: "Что развиваем дальше",
    subtitle: "Один рабочий вектор",
    bullets: [
      "Согласовать пилот с одной командой",
      "Усилить верификацию контракта",
      "Дожать сценарии до editor",
    ],
  },
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resetResults() {
  ensureDir(screenshotsDir);
  fs.writeFileSync(
    resultsPath,
    JSON.stringify({ desktop: null, mobile: null }, null, 2),
    "utf8",
  );
}

function assertAudit(condition, message, payload) {
  if (condition) {
    return;
  }

  const details = payload ? `\n${JSON.stringify(payload, null, 2)}` : "";
  throw new Error(`${message}${details}`);
}

function collectConsole(page) {
  const errors = [];

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      errors.push({
        type: message.type(),
        text: message.text(),
      });
    }
  });

  page.on("pageerror", (error) => {
    errors.push({
      type: "pageerror",
      text: error.message,
    });
  });

  return errors;
}

function cloneSlides(slides) {
  return slides.map((slide) => ({
    ...slide,
    bullets: [...slide.bullets],
  }));
}

const SLOT_CONFIG = [
  {
    slotId: 1,
    slideFunctionId: "open_topic",
    canvasLayoutId: "cover",
    defaultIcon: "spark",
    blockType: "focus",
    speakerAngle: "Открываем тему одним тезисом.",
  },
  {
    slotId: 2,
    slideFunctionId: "main_point",
    canvasLayoutId: "checklist",
    defaultIcon: "check",
    blockType: "fact",
    speakerAngle: "Показываем, где сейчас главный разрыв.",
  },
  {
    slotId: 3,
    slideFunctionId: "movement",
    canvasLayoutId: "steps",
    defaultIcon: "arrow",
    blockType: "movement",
    speakerAngle: "Собираем путь по шагам.",
  },
  {
    slotId: 4,
    slideFunctionId: "evidence",
    canvasLayoutId: "split",
    defaultIcon: "trend",
    blockType: "proof",
    speakerAngle: "Фиксируем, что уже получилось.",
  },
  {
    slotId: 5,
    slideFunctionId: "tension",
    canvasLayoutId: "personas",
    defaultIcon: "people",
    blockType: "fact",
    speakerAngle: "Показываем, кому это полезно.",
  },
  {
    slotId: 6,
    slideFunctionId: "next_step",
    canvasLayoutId: "features",
    defaultIcon: "flag",
    blockType: "decision",
    speakerAngle: "Закрываем одним следующим шагом.",
  },
];

function buildMockBlocks(slide, config) {
  return slide.bullets.map((bullet, index) => {
    const block = {
      id: `${slide.id}-block-${index}`,
      type: index === 0 ? config.blockType : "fact",
      icon: config.defaultIcon,
      title: bullet,
      body: "",
    };

    if (config.canvasLayoutId === "steps") {
      const match = bullet.match(/^(\d{1,2})\s*[—-]?\s*(.+)$/);
      return {
        ...block,
        type: "movement",
        icon: "arrow",
        title: match ? match[2] : bullet,
        stepNumber: match ? match[1].padStart(2, "0") : String(index + 1).padStart(2, "0"),
      };
    }

    if (config.canvasLayoutId === "personas") {
      const [title, tagline = ""] = bullet.split(" — ");
      const trimmedTagline = tagline.trim();

      return {
        ...block,
        icon: "people",
        title: title?.trim() || bullet,
        body: trimmedTagline,
        ...(trimmedTagline ? { tagline: trimmedTagline } : {}),
      };
    }

    return block;
  });
}

function buildMockWorkingDraft(sourcePrompt, slides) {
  const safeSlides = cloneSlides(slides);
  const slidePlan = SLOT_CONFIG.map((config, index) => {
    const slide = safeSlides[index];
    const blockPlan = buildMockBlocks(slide, config);

    return {
      slotId: config.slotId,
      slideFunctionId: config.slideFunctionId,
      canvasLayoutId: config.canvasLayoutId,
      coreMessage: slide.subtitle || slide.title,
      blockPlan,
      placeholderPlan: [],
      speakerAngle: config.speakerAngle,
      lastTransformId: null,
    };
  });

  return {
    sourcePrompt,
    audience: "Команды и руководители",
    presentationIntent: "explain",
    desiredOutcome: "Показать пользу и назвать следующий шаг.",
    knownFacts: [
      "Первый черновик появляется быстро.",
      "Главное становится яснее уже на первом проходе.",
    ],
    missingFacts: [],
    confidence: 0.84,
    slidePlan,
    visibleSlideTitles: safeSlides.map((slide) => slide.title),
    templateId: "cards",
    colorThemeId: "indigo",
  };
}

function buildSmokeClarifySession(promptText, userMessage) {
  const safePrompt = promptText || prompt;
  const messages = [{ role: "user", text: safePrompt }];

  if (userMessage) {
    messages.push({ role: "user", text: userMessage });
  }

  messages.push({
    role: "assistant",
    text: userMessage
      ? "Контекст стал точнее. Можно собирать черновик уже сейчас."
      : "Тема и аудитория уже понятны. Если хотите, можно коротко уточнить акцент и сразу перейти к сборке.",
  });

  return {
    workingDraft: buildMockWorkingDraft(safePrompt, baseSlides),
    slideTexts: [],
    messages,
    quickReplies: [
      "Сделай акцент на главном выводе.",
      "В конце оставь один ясный следующий шаг.",
    ],
    readyToGenerate: true,
    missingFacts: [],
    summary:
      "Тема: Внятно как рабочий сервис. Кому: Команды и руководители. Опора: Первый черновик появляется быстро. Финал: Показать пользу и назвать следующий шаг.",
  };
}

function buildSmokeGeneratedSession(session) {
  const slideTexts = cloneSlides(baseSlides);

  return {
    ...session,
    workingDraft: buildMockWorkingDraft(session.workingDraft.sourcePrompt, slideTexts),
    slideTexts,
    messages: [
      ...session.messages,
      {
        role: "assistant",
        text: "Черновик готов. Смотрите слайды — можно уточнять или менять через чат.",
      },
    ],
  };
}

function buildSmokeRevisedSession(session, userMessage) {
  const slideTexts = buildChatSlides();

  return {
    ...session,
    workingDraft: buildMockWorkingDraft(session.workingDraft.sourcePrompt, slideTexts),
    slideTexts,
    messages: [
      ...session.messages,
      { role: "user", text: userMessage },
      { role: "assistant", text: "Усилил проблемный слайд и общий акцент." },
    ],
    summary:
      "Тема и аудитория уже понятны. Черновик усилен: в проблеме теперь явнее названо, где продукт шумит до пользы.",
  };
}

function buildChatSlides() {
  const nextSlides = cloneSlides(baseSlides);
  nextSlides[1] = {
    ...nextSlides[1],
    title: "Главный риск — шум до пользы",
    bullets: [
      "1 — сырая мысль без структуры",
      "2 — лишние решения до результата",
      "3 — человек теряет главный акцент",
    ],
  };

  return nextSlides;
}

function buildClarifySession(promptText, userMessage) {
  const safePrompt = promptText || prompt;
  const messages = [{ role: "user", text: safePrompt }];

  if (userMessage) {
    messages.push({ role: "user", text: userMessage });
  }

  messages.push({
    role: "assistant",
    text: userMessage
      ? "Контекст стал точнее. Можно собирать черновик уже сейчас."
      : "Тема и аудитория уже понятны. Если хотите, можно коротко уточнить акцент и сразу перейти к сборке.",
  });

  return {
    workingDraft: {
      sourcePrompt: safePrompt,
      templateId: "cards",
      colorThemeId: "indigo",
      audience: "Команды и руководители",
      presentationIntent: "explain",
      desiredOutcome: "Показать пользу и назвать следующий шаг.",
      knownFacts: [
        "Первый черновик появляется быстро.",
        "Главное становится яснее уже на первом проходе.",
      ],
      missingFacts: [],
      confidence: 0.84,
    },
    slideTexts: [],
    messages,
    quickReplies: [
      "Сделай акцент на главном выводе.",
      "В конце оставь один ясный следующий шаг.",
    ],
    readyToGenerate: true,
    missingFacts: [],
    summary:
      "Тема: Внятно как рабочий сервис. Кому: Команды и руководители. Опора: Первый черновик появляется быстро. Финал: Показать пользу и назвать следующий шаг.",
  };
}

function buildGeneratedSession(session) {
  return {
    ...session,
    slideTexts: cloneSlides(baseSlides),
    messages: [
      ...session.messages,
      {
        role: "assistant",
        text: "Черновик готов. Смотрите слайды — можно уточнять или менять через чат.",
      },
    ],
  };
}

function buildRevisedSession(session, userMessage) {
  return {
    ...session,
    slideTexts: buildChatSlides(),
    messages: [
      ...session.messages,
      { role: "user", text: userMessage },
      { role: "assistant", text: "Усилил проблемный слайд и общий акцент." },
    ],
    summary:
      "Тема и аудитория уже понятны. Черновик усилен: в проблеме теперь явнее названо, где продукт шумит до пользы.",
  };
}

async function installDraftMocks(page, { failFirstClarify = false } = {}) {
  let clarifyCallCount = 0;

  await page.route("**/api/draft", async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");

    if (body.mode === "clarify") {
      clarifyCallCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 350));

      if (failFirstClarify && clarifyCallCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Временная ошибка старта." }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          buildSmokeClarifySession(
            body.prompt ?? body.session?.workingDraft?.sourcePrompt,
            body.userMessage,
          ),
        ),
      });
      return;
    }

    if (body.mode === "generate") {
      await new Promise((resolve) => setTimeout(resolve, 900));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildSmokeGeneratedSession(body.session)),
      });
      return;
    }

    if (body.mode === "revise") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildSmokeRevisedSession(body.session, body.userMessage)),
      });
      return;
    }

    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "Unknown mode" }),
    });
  });
}

function startServer() {
  const nextCliPath = path.join(
    rootDir,
    "node_modules",
    "next",
    "dist",
    "bin",
    "next",
  );

  const child = spawn(
    process.execPath,
    [
      nextCliPath,
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: path.join(rootDir, "presentations-frontend"),
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    },
  );

  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });

  return child;
}

async function isPortBusy(candidatePort) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (error) => {
      resolve(error.code === "EADDRINUSE");
    });

    server.once("listening", () => {
      server.close(() => resolve(false));
    });

    server.listen(candidatePort, "127.0.0.1");
  });
}

async function ensureAvailableBaseUrl() {
  if (explicitBaseUrl) {
    return;
  }

  while (await isPortBusy(port)) {
    port += 1;
  }

  baseUrl = `http://127.0.0.1:${port}`;
}

async function waitForServer(serverProcess) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 30_000) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`Smoke server exited early with code ${serverProcess.exitCode}.`);
    }

    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Smoke server did not become ready at ${baseUrl}.`);
}

async function collectDesktop(browser) {
  console.log("[smoke] desktop: open start");
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  const page = await context.newPage();
  const consoleErrors = collectConsole(page);

  await installDraftMocks(page, { failFirstClarify: true });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByRole("heading", { name: "О чём презентация?" }).waitFor();

  await page.screenshot({
    path: path.join(screenshotsDir, "desktop-start.png"),
    fullPage: true,
  });

  const start = await page.evaluate(() => ({
    heading: document.querySelector("h2")?.textContent?.trim() ?? null,
    exampleCount: document.querySelectorAll(".example-chip").length,
    promptVisible: !!document.querySelector("textarea"),
  }));

  assertAudit(start.heading === "О чём презентация?", "Smoke: стартовый экран не загрузился.", start);
  assertAudit(start.promptVisible, "Smoke: на старте нет поля ввода.", start);
  assertAudit(start.exampleCount === 1, "Smoke: на старте должен остаться один сценарий.", start);

  await page.locator("textarea").fill(prompt);
  await page.getByRole("button", { name: /Отправить/i }).click();
  await page.getByText("Уточняем, что важно для первого черновика.").waitFor();
  await page.getByText("Временная ошибка старта.").waitFor();

  const startAfterError = await page.evaluate(() => ({
    stillOnStart: !!document.querySelector(".composer-form"),
    hasDraftCards: document.querySelectorAll(".slide-text-card").length,
  }));

  assertAudit(startAfterError.stillOnStart, "Smoke: после ошибки старт пропал.", startAfterError);
  assertAudit(startAfterError.hasDraftCards === 0, "Smoke: после ошибки внезапно появился draft.", startAfterError);

  await page.getByRole("button", { name: /Отправить/i }).click();
  await page.getByRole("heading", { name: "Уточним главное перед черновиком" }).waitFor();

  const clarify = await page.evaluate(() => ({
    messageCount: document.querySelectorAll(".chat-msg").length,
    quickReplyCount: document.querySelectorAll(".chat-suggestion-chip").length,
    buildVisible: !!Array.from(document.querySelectorAll("button")).find((button) =>
      /Собрать черновик/.test(button.textContent || ""),
    ),
  }));

  assertAudit(clarify.messageCount >= 2, "Smoke: clarify не показал переписку.", clarify);
  assertAudit(clarify.quickReplyCount >= 1, "Smoke: clarify не показал быстрые ответы.", clarify);
  assertAudit(clarify.buildVisible, "Smoke: в clarify нет кнопки сборки черновика.", clarify);

  await page.getByRole("button", { name: "Назад" }).click();
  await page.getByRole("heading", { name: "О чём презентация?" }).waitFor();

  const startAfterBack = await page.evaluate(() => ({
    promptValue: document.querySelector("textarea")?.value ?? "",
  }));

  assertAudit(startAfterBack.promptValue === prompt, "Smoke: back из clarify потерял запрос.", startAfterBack);

  await page.getByRole("button", { name: /Отправить/i }).click();
  await page.getByRole("heading", { name: "Уточним главное перед черновиком" }).waitFor();

  const clarifyMessagesBeforeReply = await page.locator(".chat-msg").count();
  await page.locator(".chat-suggestion-chip").first().click();
  await page.waitForFunction(
    (expected) => document.querySelectorAll(".chat-msg").length > expected,
    clarifyMessagesBeforeReply,
  );

  await page.getByRole("button", { name: /Собрать черновик/i }).click();
  await page.getByRole("heading", { name: "Собираем черновик" }).waitFor();
  await page.getByText("Раскладываем историю по слайдам").waitFor();

  const building = await page.evaluate(() => ({
    hasFakeCounter: /из 6/.test(document.body.textContent || ""),
    hasProgressTrack: !!document.querySelector(".build-status__progress-track"),
  }));

  assertAudit(!building.hasFakeCounter, "Smoke: building показывает фальшивый счётчик.", building);
  assertAudit(!building.hasProgressTrack, "Smoke: building показывает псевдопрогресс.", building);

  await page.getByRole("button", { name: /Открыть редактор/i }).waitFor();

  const draft = await page.evaluate(() => ({
    slideCount: document.querySelectorAll(".slide-text-card").length,
    messageCount: document.querySelectorAll(".draft-screen__chat-messages .chat-msg").length,
    summaryVisible: !!document.querySelector(".draft-screen__context-summary"),
    buildButton: document.querySelector(".draft-screen__build-btn")?.textContent?.trim() ?? null,
  }));

  assertAudit(draft.slideCount === 6, "Smoke: draft не показал 6 карточек слайдов.", draft);
  assertAudit(draft.messageCount >= 3, "Smoke: draft не показал накопленную переписку.", draft);
  assertAudit(draft.summaryVisible, "Smoke: draft не показал смысловую сводку.", draft);
  assertAudit(
    typeof draft.buildButton === "string" && /Открыть редактор/.test(draft.buildButton),
    "Smoke: на draft нет честной кнопки перехода в editor.",
    draft,
  );

  await page.getByRole("button", { name: "К уточнению" }).click();
  await page.getByRole("heading", { name: "Уточним главное перед черновиком" }).waitFor();

  const clarifyAfterDraftBack = await page.evaluate(() => ({
    messageCount: document.querySelectorAll(".chat-msg").length,
    quickReplyCount: document.querySelectorAll(".chat-suggestion-chip").length,
  }));

  assertAudit(
    clarifyAfterDraftBack.messageCount >= clarifyMessagesBeforeReply + 2,
    "Smoke: back из draft потерял переписку.",
    clarifyAfterDraftBack,
  );
  assertAudit(
    clarifyAfterDraftBack.quickReplyCount >= 1,
    "Smoke: back из draft потерял быстрые ответы.",
    clarifyAfterDraftBack,
  );

  await page.getByRole("button", { name: /Собрать черновик/i }).click();
  await page.getByRole("button", { name: /Открыть редактор/i }).waitFor();

  await page.locator(".draft-screen__chat-input").fill("Сделай проблемный слайд жёстче.");
  await page.getByRole("button", { name: /Отправить/i }).click();
  await page.getByText("Усилил проблемный слайд и общий акцент.").waitFor();
  await page.getByText("Главный риск — шум до пользы").waitFor();

  const revisedDraft = await page.evaluate(() => ({
    summary: document.querySelector(".draft-screen__context-summary")?.textContent?.trim() ?? null,
  }));

  assertAudit(
    typeof revisedDraft.summary === "string" &&
      revisedDraft.summary.includes("Тема и аудитория уже понятны"),
    "Smoke: после revise summary не обновился.",
    revisedDraft,
  );

  await page.locator(".slide-text-card__title").first().click();
  await page.locator(".slide-text-card__edit-input--title").fill(
    "Внятно: путь от мысли к слайдам",
  );
  await page.locator(".slide-text-card__edit-input--title").press("Enter");
  await page.locator(".slide-text-card__title").first().waitFor();

  await page.screenshot({
    path: path.join(screenshotsDir, "desktop-draft.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: /Открыть редактор/i }).click();
  try {
    await page.locator(".editor-shell").waitFor({ timeout: 30_000 });
  } catch (error) {
    const editorDebug = await page.evaluate(() => ({
      hasDraftScreen: !!document.querySelector(".draft-screen"),
      hasEditorShell: !!document.querySelector(".editor-shell"),
      buildButtonText:
        document.querySelector(".draft-screen__build-btn")?.textContent?.trim() ?? null,
      bodyText: (document.body.textContent || "").slice(0, 400),
    }));
    throw new Error(
      `Editor transition failed: ${JSON.stringify({ editorDebug, consoleErrors, error }, null, 2)}`,
    );
  }

  const editor = await page.evaluate(() => ({
    documentTitle: document.querySelector(".editor-title-field input")?.value ?? null,
    thumbnailCount: document.querySelectorAll(".editor-rail-thumb").length,
    drawerTriggerVisible: !!document.querySelector(".drawer-trigger"),
    activeSlideTitle: document.querySelector(".slide-canvas__title")?.textContent?.trim() ?? null,
  }));

  assertAudit(editor.thumbnailCount === 6, "Smoke: editor не показал 6 миниатюр.", editor);
  assertAudit(editor.drawerTriggerVisible, "Smoke: в editor не видно drawer-trigger.", editor);
  assertAudit(
    editor.activeSlideTitle === "Внятно: путь от мысли к слайдам",
    "Smoke: editor не взял актуальный текст из draft.",
    editor,
  );

  await page.getByRole("button", { name: "Доработка слайда" }).click();
  await page.getByRole("heading", { name: "Доработка слайда" }).waitFor();

  const drawer = await page.evaluate(() => ({
    actionCount: document.querySelectorAll(".regen-button").length,
    hasNotesField: !!document.querySelector("#drawer-slide-notes"),
  }));

  assertAudit(drawer.actionCount >= 1, "Smoke: drawer открылся без действий.", drawer);
  assertAudit(drawer.hasNotesField, "Smoke: drawer открылся без заметок к слайду.", drawer);

  await page.getByRole("button", { name: /Показать презентацию/i }).click();
  await page.locator(".presenter-overlay").waitFor();
  const presenter = page.getByRole("dialog", { name: "Показ презентации" });
  await presenter.getByRole("button", { name: /Следующий слайд/i }).click();
  await presenter.getByRole("button", { name: /Выйти из показа/i }).click();
  await page.locator(".presenter-overlay").waitFor({ state: "hidden" });

  await page.screenshot({
    path: path.join(screenshotsDir, "desktop-editor.png"),
    fullPage: true,
  });

  const filteredConsoleErrors = consoleErrors.filter(
    (entry) =>
      entry.text !==
      "Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
  );

  assertAudit(
    filteredConsoleErrors.length === 0,
    "Smoke: на desktop есть console/page errors.",
    filteredConsoleErrors,
  );

  await context.close();

  return {
    start,
    building,
    draft,
    editor,
    drawer,
    consoleErrors: filteredConsoleErrors,
  };
}

async function collectMobile(browser) {
  console.log("[smoke] mobile: open start");
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const consoleErrors = collectConsole(page);

  await installDraftMocks(page);
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByRole("heading", { name: "О чём презентация?" }).waitFor();

  await page.locator("textarea").fill(prompt);
  await page.getByRole("button", { name: /Отправить/i }).click();
  await page.getByRole("button", { name: /Собрать черновик/i }).waitFor();
  await page.getByRole("button", { name: /Собрать черновик/i }).click();
  await page.getByRole("heading", { name: "Собираем черновик" }).waitFor();
  await page.getByRole("button", { name: /Открыть редактор/i }).waitFor();
  await page.getByRole("button", { name: /Открыть редактор/i }).click();
  await page.locator(".editor-shell").waitFor({ timeout: 30_000 });

  const editor = await page.evaluate(() => ({
    viewport: { width: window.innerWidth, height: window.innerHeight },
    thumbnailCount: document.querySelectorAll(".editor-rail-thumb").length,
    drawerTriggerVisible: !!document.querySelector(".drawer-trigger"),
    activeSlideTitle: document.querySelector(".slide-canvas__title")?.textContent?.trim() ?? null,
  }));

  assertAudit(editor.thumbnailCount === 6, "Smoke: mobile editor не показал 6 миниатюр.", editor);
  assertAudit(editor.drawerTriggerVisible, "Smoke: mobile editor без drawer-trigger.", editor);
  assertAudit(
    typeof editor.activeSlideTitle === "string" && editor.activeSlideTitle.length > 0,
    "Smoke: mobile editor не показал активный слайд.",
    editor,
  );
  assertAudit(
    consoleErrors.length === 0,
    "Smoke: на mobile есть console/page errors.",
    consoleErrors,
  );

  await context.close();

  return {
    editor,
    consoleErrors,
  };
}

async function main() {
  resetResults();

  await ensureAvailableBaseUrl();
  const server = startServer();
  let browser;

  try {
    console.log("[smoke] wait server");
    await waitForServer(server);
    console.log("[smoke] launch browser");
    browser = await chromium.launch({ headless: true });

    const desktop = await collectDesktop(browser);
    const mobile = await collectMobile(browser);

    const results = {
      baseUrl,
      desktop,
      mobile,
      screenshots: fs
        .readdirSync(screenshotsDir)
        .map((name) => path.join(screenshotsDir, name)),
    };

    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), "utf8");
    process.stdout.write(JSON.stringify(results, null, 2));
  } finally {
    if (browser) {
      await browser.close();
    }

    if (process.platform === "win32" && server.pid) {
      spawn("taskkill", ["/pid", String(server.pid), "/t", "/f"], {
        stdio: "ignore",
      });
    } else {
      server.kill();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
