(function () {
  "use strict";

  const app = document.querySelector("#app");
  const game = window.PolisGame;
  const data = window.PolisData;
  let state = game.createInitialState();

  const CRISIS_ART = {
    1: "assets/img/1.png",
    2: "assets/img/2.png",
    3: "assets/img/3.png",
    4: "assets/img/4.png",
    5: "assets/img/5.png",
    6: "assets/img/6.png",
    7: "assets/img/7.png",
    8: "assets/img/8.png",
    9: "assets/img/9.png",
    10: "assets/img/10.png",
    11: "assets/img/11.png",
    12: "assets/img/12.png"
  };

  const RULE_ART = {
    0: "assets/img/faction_badges_row.png",
    1: "assets/img/status_sun_column_concord.png",
    2: "assets/img/olive_branch.png",
    3: "assets/img/banner_philosophers.png",
    4: "assets/img/olive_wreath.png"
  };

  const FACTION_BADGES = {
    F: { label: "Философы", src: "assets/img/faction_badge_philosophers.png" },
    V: { label: "Воины", src: "assets/img/faction_badge_warriors.png" },
    T: { label: "Торговцы", src: "assets/img/faction_badge_merchants.png" }
  };

  const SOUND_PATHS = {
    background: "assets/sound/background.mp3",
    click: "assets/sound/click.mp3",
    clickVar: "assets/sound/clickvar.mp3",
    festival: "assets/sound/VoicyCrowdCheering.mp3"
  };
  const BACKGROUND_VOLUME = 0.18;
  const DUCKED_BACKGROUND_VOLUME = BACKGROUND_VOLUME * 0.25;
  const FESTIVAL_VOLUME = 0.62 * 0.7;

  let soundEnabled = true;
  let backgroundAudio = null;
  let festivalAudio = null;
  let backgroundFadeFrame = 0;

  function getCrisisArtPath(crisisId) {
    return CRISIS_ART[crisisId] || "assets/img/ancient_coastal_city_map.png";
  }

  function ensureBackgroundAudio() {
    if (!backgroundAudio) {
      backgroundAudio = new Audio(SOUND_PATHS.background);
      backgroundAudio.loop = true;
      backgroundAudio.volume = BACKGROUND_VOLUME;
    }
    return backgroundAudio;
  }

  function setBackgroundAudioState() {
    if (!soundEnabled) {
      if (backgroundAudio) {
        backgroundAudio.pause();
        backgroundAudio.currentTime = 0;
      }
      return;
    }
    const audio = ensureBackgroundAudio();
    if (audio.paused) {
      audio.play().catch(() => {});
    }
  }

  function playUiSound(kind = "default") {
    if (!soundEnabled) return;
    const audio = new Audio(kind === "choice" ? SOUND_PATHS.clickVar : SOUND_PATHS.click);
    audio.volume = 0.38;
    audio.play().catch(() => {});
  }

  function fadeBackgroundAudio(targetVolume, duration) {
    if (!backgroundAudio) return;
    if (backgroundFadeFrame) cancelAnimationFrame(backgroundFadeFrame);
    const startVolume = backgroundAudio.volume;
    const startTime = performance.now();
    const animate = (currentTime) => {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      backgroundAudio.volume = startVolume + (targetVolume - startVolume) * progress;
      if (progress < 1) {
        backgroundFadeFrame = requestAnimationFrame(animate);
      } else {
        backgroundFadeFrame = 0;
      }
    };
    backgroundFadeFrame = requestAnimationFrame(animate);
  }

  function stopFestivalSound() {
    if (festivalAudio) {
      festivalAudio.pause();
      festivalAudio.currentTime = 0;
      festivalAudio = null;
    }
    if (backgroundFadeFrame) cancelAnimationFrame(backgroundFadeFrame);
    backgroundFadeFrame = 0;
    if (backgroundAudio) {
      if (soundEnabled) {
        fadeBackgroundAudio(BACKGROUND_VOLUME, 650);
      } else {
        backgroundAudio.volume = BACKGROUND_VOLUME;
      }
    }
  }

  function playFestivalSound() {
    if (!soundEnabled) return;
    stopFestivalSound();
    fadeBackgroundAudio(DUCKED_BACKGROUND_VOLUME, 450);
    const audio = new Audio(SOUND_PATHS.festival);
    festivalAudio = audio;
    audio.volume = FESTIVAL_VOLUME;
    const restoreBackground = () => {
      if (festivalAudio !== audio) return;
      festivalAudio = null;
      fadeBackgroundAudio(BACKGROUND_VOLUME, 650);
    };
    audio.addEventListener("ended", restoreBackground, { once: true });
    audio.addEventListener("error", restoreBackground, { once: true });
    audio.play().catch(restoreBackground);
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    if (!soundEnabled) stopFestivalSound();
    setBackgroundAudioState();
    if (app) {
      const toggle = app.querySelector("[data-action='toggle-sound']");
      if (toggle) {
        toggle.setAttribute("aria-label", soundEnabled ? "Выключить звук" : "Включить звук");
        toggle.innerHTML = `<span aria-hidden="true">${soundEnabled ? "🔊" : "🔇"}</span><span>${soundEnabled ? "Звук" : "Без звука"}</span>`;
      }
    }
  }

  const ruleSlides = [
    {
      title: "У кого какая власть?",
      text: "В городе спорят философы, воины и торговцы. В начале у каждой группы по 5 очков влияния.",
      art: RULE_ART[0]
    },
    {
      title: "Что держит город вместе?",
      text: "За это отвечает шкала единства: на старте у города 8 очков. Если она опустится до нуля, партия закончится.",
      art: RULE_ART[1]
    },
    {
      title: "Лёгкого выхода не будет",
      text: "В каждом кризисе — три решения. Выбирая одно, вы усиливаете одну группу и меняете жизнь всего города. Правильного ответа нет.",
      art: RULE_ART[2]
    },
    {
      title: "Сначала договоритесь",
      text: "Обсудите все три варианта и выберите один общий. Ведущий отметит его на экране.",
      art: RULE_ART[3]
    },
    {
      title: "Впереди двенадцать кризисов",
      text: "После четвёртого и восьмого город переведёт дух на празднике. В конце увидим, к чему привели ваши решения.",
      art: RULE_ART[4]
    }
  ];

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function factionBadgeRow() {
    return `
      <div class="faction-badge-row" aria-label="Фракции города">
        ${Object.entries(FACTION_BADGES).map(([key, badge]) => `
          <div class="faction-badge faction-${key.toLowerCase()}">
            <img src="${badge.src}" alt="${badge.label}">
            <span>${badge.label}</span>
          </div>`).join("")}
      </div>`;
  }

  function pageShell(content) {
    const teacherTag = state.teacherMode
      ? '<span class="mode-tag">Экран ведущего</span>'
      : "";
    const soundLabel = soundEnabled ? "Звук" : "Без звука";
    const soundIcon = soundEnabled ? "🔊" : "🔇";
    const unityMeter = ["game", "debrief", "festival", "result"].includes(state.phase)
      ? `
            <div class="topbar-unity" aria-label="Единство города">
              <div class="topbar-unity-label">Единство</div>
              <div class="topbar-unity-scale">
                <strong>${state.unity}</strong>
                <div class="topbar-unity-meter" role="meter" aria-label="Единство" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${state.unity}">
                  <span style="width:${state.unity * 10}%"></span>
                </div>
                <span class="topbar-unity-max">10</span>
              </div>
            </div>`
      : "";
    return `
      <div class="site-shell">
        <header class="topbar">
          <a class="wordmark" href="#" data-action="home" aria-label="Полис — главное меню">
            <span class="wordmark-seal" aria-hidden="true">Π</span>
            <span><strong>Полис</strong><small>Игра по «Государству» Платона</small></span>
          </a>
          ${unityMeter}
          <div class="topbar-actions">
            ${teacherTag}
            ${state.teacherMode && state.phase !== "home" ? '<button class="text-button" data-action="leave-teacher">Выйти в меню</button>' : ""}
            <button class="sound-toggle ${soundEnabled ? "active" : ""}" type="button" data-action="toggle-sound" aria-label="${soundEnabled ? "Выключить звук" : "Включить звук"}"><span aria-hidden="true">${soundIcon}</span><span>${soundLabel}</span></button>
          </div>
        </header>
        <main id="main-content" tabindex="-1">${content}</main>
      </div>`;
  }

  function factionMetrics() {
    const labels = [
      ["F", "Философы", "philosophers"],
      ["V", "Воины", "warriors"],
      ["T", "Торговцы", "merchants"]
    ];
    return `
      <div class="faction-metrics" aria-label="Влияние фракций">
        ${labels.map(([key, label, className]) => `
          <div class="faction-metric ${className}">
            <span class="metric-label">${label}</span>
            <strong>${state.factions[key]}<small> / 10</small></strong>
            <span class="mini-track" aria-hidden="true"><span style="width:${state.factions[key] * 10}%"></span></span>
          </div>`).join("")}
      </div>`;
  }

  function resultMetrics(statusArt) {
    const metrics = [
      ["F", FACTION_BADGES.F.label, "philosophers", FACTION_BADGES.F.src, state.factions.F],
      ["V", FACTION_BADGES.V.label, "warriors", FACTION_BADGES.V.src, state.factions.V],
      ["T", FACTION_BADGES.T.label, "merchants", FACTION_BADGES.T.src, state.factions.T],
      ["E", "Единство", "unity", statusArt, state.unity]
    ];
    return `
      <div class="result-metrics" aria-label="Итоговые шкалы">
        ${metrics.map(([key, label, className, icon, value]) => `
          <div class="result-metric ${className}" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${value}">
            <img src="${icon}" alt="">
            <span class="metric-label">${label}</span>
            <strong>${value}<small> / 10</small></strong>
            <span class="mini-track" aria-hidden="true"><span style="width:${value * 10}%"></span></span>
          </div>`).join("")}
      </div>`;
  }

  function unityCard() {
    const level = state.unity === 0 ? "zero" : state.unity <= 2 ? "critical" : state.unity <= 4 ? "warning" : "healthy";
    const statusArt = state.unity === 0
      ? "assets/img/status_column_ruined.png"
      : state.unity <= 4
        ? "assets/img/status_columns_balance.png"
        : "assets/img/status_sun_column_concord.png";
    return `
      <section class="unity-card ${level}" aria-label="Единство города">
        <div class="status-illustration">
          <img src="${statusArt}" alt="">
        </div>
        <div class="unity-heading">
          <div><span class="eyebrow">КАК ДЕРЖИТСЯ ГОРОД</span><h2>Единство</h2></div>
          <strong class="unity-value">${state.unity}<small> / 10</small></strong>
        </div>
        <div class="unity-track" role="meter" aria-label="Единство" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${state.unity}">
          <span style="width:${state.unity * 10}%"></span>
        </div>
        <div class="track-scale"><span>Раскол</span><span>Согласие</span></div>
      </section>`;
  }

  function teacherMetrics() {
    return `
      <section class="teacher-board">
        <div class="section-heading"><span class="eyebrow">СЕЙЧАС</span><h2>Шкалы города</h2></div>
        ${factionMetrics()}
        <div class="teacher-unity-row"><span>Единство</span><strong>${state.unity} / 10</strong></div>
      </section>`;
  }

  function homeScreen() {
    return `
      <section class="home-hero">
        <div class="hero-copy">
          <span class="eyebrow">Игра для разговора о городе</span>
          <h1>Каким будет<br><em>наш город?</em></h1>
          <p class="hero-intro">Обсудите решение всем классом. Каждый выбор что-то меняет — и у каждого есть своя цена.</p>
          <div class="hero-actions">
            <button class="primary-button" data-action="play">Начать <span aria-hidden="true">→</span></button>
            <button class="quiet-button" data-action="open-teacher">Ведущему <span aria-hidden="true">↗</span></button>
          </div>
          ${factionBadgeRow()}
        </div>
        <div class="city-illustration" aria-hidden="true">
          <span class="illustration-caption">ЗАПИСКА К ИГРЕ</span>
          <img src="assets/img/city_map_full.png" alt="" class="city-map-art">
          <span class="city-stamp">ГОРОД<br>НАШЕ<br>ОБЩЕЕ ДЕЛО</span>
          <span class="city-index">12 разговоров<br>об одном городе</span>
        </div>
      </section>
      <section class="home-note">
        <p>Философы, воины и торговцы хотят разного. А городу нужно как-то жить со всеми сразу.</p>
        <span class="note-signature">ПО МОТИВАМ «ГОСУДАРСТВА»</span>
      </section>`;
  }

  function pinScreen() {
    return `
      <section class="narrow-panel">
        <button class="back-link" data-action="back-home">← На главную</button>
        <span class="eyebrow">ДЛЯ ВЕДУЩЕГО</span>
        <h1 class="panel-title">Экран<br><em>преподавателя</em></h1>
        <p class="lead">Введите код — откроются все шкалы и последствия каждого решения.</p>
        <form data-form="teacher-pin" class="pin-form">
          <label for="teacher-pin">PIN-код</label>
          <div class="pin-row">
            <input id="teacher-pin" name="pin" type="password" inputmode="numeric" autocomplete="off" required aria-describedby="pin-note pin-error">
            <button class="primary-button" type="submit">Продолжить <span aria-hidden="true">→</span></button>
          </div>
          <p id="pin-error" class="form-error" role="alert">${state.pinError ? "Код не подошёл. Проверьте его и попробуйте ещё раз." : ""}</p>
        </form>
        <p id="pin-note" class="security-note"><strong>Важно:</strong> код только помогает не открыть этот экран случайно. Он виден в исходном коде сайта и не защищает данные.</p>
      </section>`;
  }

  function rulesScreen() {
    const slide = ruleSlides[state.rulesSlide];
    const progress = ((state.rulesSlide + 1) / ruleSlides.length) * 100;
    let visual;
    if (state.rulesSlide === 0) {
      visual = `
        <div class="faction-badge-row" aria-label="Фракции города">
          ${Object.entries(FACTION_BADGES).map(([key, badge]) => `
            <div class="faction-badge faction-${key.toLowerCase()}">
              <img src="${badge.src}" alt="${badge.label}">
              <span>${badge.label}</span>
            </div>`).join("")}
        </div>`;
    } else {
      visual = `<img src="${slide.art}" alt="">`;
    }
    return `
      <section class="rules-layout">
        <article class="rules-card">
          <div class="rules-card-inner">
            <div class="rules-copy">
              <div class="slide-meta"><span>ПРАВИЛА ИГРЫ</span></div>
              <div class="slide-progress" role="progressbar" aria-label="Ход правил" aria-valuemin="1" aria-valuemax="${ruleSlides.length}" aria-valuenow="${state.rulesSlide + 1}" aria-valuetext="Правило ${state.rulesSlide + 1} из ${ruleSlides.length}"><span style="width:${progress}%"></span></div>
              <h1>${escapeHtml(slide.title)}</h1>
              <p>${escapeHtml(slide.text)}</p>
              <div class="slide-controls">
                <button class="quiet-button" data-action="previous-slide" ${state.rulesSlide === 0 ? "disabled" : ""}>← Назад</button>
                <button class="primary-button" data-action="next-slide">${state.rulesSlide === ruleSlides.length - 1 ? "Пора начинать" : "Дальше"} <span aria-hidden="true">→</span></button>
              </div>
            </div>
            <div class="rules-visual" aria-hidden="true">
              ${visual}
            </div>
          </div>
        </article>
      </section>`;
  }

  function optionCards(crisis) {
    return `
      <div class="option-list" aria-label="Варианты решения">
        ${crisis.options.map((option) => `
          <button class="option-card" data-action="choose" data-option="${escapeHtml(option.id)}">
            <span class="option-letter">${escapeHtml(option.id)}</span>
            <span class="option-copy">${escapeHtml(option.text)}</span>
            ${state.teacherMode
              ? `<span class="effect-list">${escapeHtml(option.type)} · ${effectLabels(option.effect)}</span>`
              : ""}
            <span class="option-arrow" aria-hidden="true">↗</span>
          </button>`).join("")}
      </div>`;
  }

  function effectLabels(effect) {
    return [
      ["F", "Ф"], ["V", "В"], ["T", "Т"], ["E", "Е"]
    ].map(([key, label]) => `${label} ${effect[key] > 0 ? "+" : ""}${effect[key] || 0}`).join(" · ");
  }

  function gameScreen() {
    const crisis = data.crises[state.crisisIndex];
    return `
      <section class="game-layout${state.teacherMode ? " teacher-layout" : ""}">
        <div class="game-main">
          <div class="crisis-kicker"><span>КРИЗИС ${crisis.id} ИЗ ${data.crises.length}</span><span class="crisis-line"></span><span>ВАШ ХОД</span></div>
          <div class="crisis-visual" aria-label="Иллюстрация кризиса ${escapeHtml(crisis.title)}">
            <img src="${getCrisisArtPath(crisis.id)}" alt="Иллюстрация к кризису ${escapeHtml(crisis.title)}">
          </div>
          <div class="crisis-heading">
            <h1>${escapeHtml(crisis.title)}</h1>
            <p>${escapeHtml(crisis.scenario)}</p>
            <details class="mobile-reading"><summary>О чём этот кризис?</summary><p>${escapeHtml(crisis.scenario)}</p></details>
          </div>
          ${optionCards(crisis)}
          <p class="choice-hint">${state.teacherMode
            ? "Когда класс договорится, отметьте выбранный вариант."
            : "Обсудите варианты и выберите один общий ответ."}</p>
        </div>
        <aside class="game-sidebar">
          ${state.teacherMode ? teacherMetrics() : ""}
        </aside>
      </section>`;
  }

  function debriefScreen() {
    const crisis = data.crises[state.crisisIndex];
    const option = crisis.options.find((item) => item.id === state.selectedOptionId);
    return `
      <section class="debrief-layout${state.teacherMode ? " teacher-layout" : ""}">
        <div class="debrief-main">
          <div class="crisis-kicker"><span>КРИЗИС ${crisis.id} · ВЫБОР ${escapeHtml(option.id)}</span><span class="crisis-line"></span><span>ПОСЛЕ РЕШЕНИЯ</span></div>
          <div class="crisis-visual compact" aria-label="Иллюстрация кризиса ${escapeHtml(crisis.title)}">
            <img src="${getCrisisArtPath(crisis.id)}" alt="Иллюстрация к кризису ${escapeHtml(crisis.title)}">
          </div>
          <h1 class="debrief-title">А что на это<br><em>сказал бы Платон?</em></h1>
          <p class="plato-quote">${escapeHtml(crisis.quote)}</p>
          <details class="mobile-reading"><summary>Заглянуть в «Государство»</summary><p>${escapeHtml(crisis.quote)}</p></details>
          <div class="class-question"><span class="eyebrow">ОБСУДИТЕ ВМЕСТЕ</span><p>${escapeHtml(crisis.question)}</p></div>
          <button class="primary-button debrief-continue" data-action="continue-debrief">
            ${state.ended ? "Посмотреть итог" : state.pendingFestival ? "На праздник" : "Дальше"} <span aria-hidden="true">→</span>
          </button>
        </div>
        <aside class="debrief-sidebar">
          ${state.teacherMode ? teacherMetrics() : ""}
        </aside>
      </section>`;
  }

  function festivalScreen() {
    return `
      <section class="festival-screen">
        <div class="festival-art" role="img" aria-label="Античный праздник у храма">
          <img src="assets/img/celebrate.png" alt="celebrate.png">
        </div>
        <div class="festival-content">
          <span class="eyebrow">ЕСТЬ ПОВОД ВЫДОХНУТЬ</span>
          <h1>День<br><em>города</em></h1>
          <p>Кризис позади — горожане собрались вместе.</p>
          <p class="festival-unity">Единство прибавило очко: теперь <strong>${state.unity} из 10</strong>.</p>
          <button class="primary-button" data-action="continue-festival">К следующему кризису <span aria-hidden="true">→</span></button>
        </div>
      </section>`;
  }

  function resultScreen() {
    const result = game.getResult(state);
    let resultArt;
    switch (result.name) {
      case "Раздор": resultArt = "assets/img/razdor.png"; break;
      case "Тирания": resultArt = "assets/img/tiraniya.png"; break;
      case "Демократия": resultArt = "assets/img/democracy.png"; break;
      case "Аристократия": resultArt = "assets/img/aristokratiya.png"; break;
      case "Тимократия": resultArt = "assets/img/timokratiya.png"; break;
      case "Олигархия": resultArt = "assets/img/ologarxiya.png"; break;
      case "Смешанный строй": resultArt = "assets/img/edinstvo.png"; break;
      default: resultArt = "assets/img/gosstroi.png";
    }
    return `
      <section class="result-layout">
        <div class="result-copy">
          <span class="eyebrow">ПАРТИЯ ЗАВЕРШЕНА · КРИЗИСОВ ПРОЙДЕНО: ${state.unity === 0 ? state.crisisIndex + 1 : data.crises.length}</span>
          <img class="result-state-art" src="${resultArt}" alt="${escapeHtml(result.name)}">
          <h1>${escapeHtml(result.name)}</h1>
          <p>${escapeHtml(result.description)}</p>
        </div>
        <div class="result-board">
          <span class="eyebrow">ШКАЛЫ ГОРОДА</span>
          ${resultMetrics(resultArt)}
          <p class="result-reflection">Поговорите о том, кому досталась власть и чем за это пришлось заплатить.</p>
        </div>
        <button class="primary-button result-restart" data-action="restart">Начать заново <span aria-hidden="true">↻</span></button>
      </section>`;
  }

  function render() {
    let content;
    switch (state.phase) {
      case "home": content = homeScreen(); break;
      case "pin": content = pinScreen(); break;
      case "rules": content = rulesScreen(); break;
      case "game": content = gameScreen(); break;
      case "debrief": content = debriefScreen(); break;
      case "festival": content = festivalScreen(); break;
      case "result": content = resultScreen(); break;
      default: throw new Error(`Неизвестный экран: ${state.phase}`);
    }
    app.innerHTML = pageShell(content);
    const main = app.querySelector("#main-content");
    if (main && state.phase !== "home") main.focus({ preventScroll: true });
  }

  function returnHome() {
    if (["game", "debrief", "festival"].includes(state.phase) &&
        !window.confirm("Выйти в меню и начать заново? Текущая партия сбросится.")) return;
    stopFestivalSound();
    state = game.createInitialState();
    render();
  }

  app.addEventListener("submit", (event) => {
    if (event.target.dataset.form !== "teacher-pin") return;
    event.preventDefault();
    playUiSound();
    const pin = new FormData(event.target).get("pin");
    state = game.unlockTeacher(state, pin);
    render();
    if (state.phase === "pin") app.querySelector("#teacher-pin").focus();
  });

  app.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest("[data-action]");
    if (!button) return;

    if (button.dataset.action === "toggle-sound") {
      toggleSound();
      return;
    }

    const action = button.dataset.action;
    playUiSound(action === "choose" ? "choice" : "default");
    switch (action) {
      case "home":
      case "back-home":
        returnHome();
        break;
      case "play":
        setBackgroundAudioState();
        state = game.startGame(state);
        render();
        break;
      case "open-teacher":
        setBackgroundAudioState();
        state = game.openTeacherGate(state);
        render();
        break;
      case "next-slide":
        state = game.nextRuleSlide(state);
        render();
        break;
      case "previous-slide":
        state = game.previousRuleSlide(state);
        render();
        break;
      case "choose": {
        const crisis = data.crises[state.crisisIndex];
        const option = crisis.options.find((item) => item.id === button.dataset.option);
        if (!option) throw new Error("Выбранный вариант отсутствует в данных кризиса");
        state = game.applyChoice(state, option);
        render();
        break;
      }
      case "continue-debrief":
        state = game.advanceAfterDebrief(state);
        if (state.phase === "festival") playFestivalSound();
        render();
        break;
      case "continue-festival":
        stopFestivalSound();
        state = game.advanceAfterFestival(state);
        render();
        break;
      case "restart":
        stopFestivalSound();
        state = game.restart(state);
        render();
        break;
      case "leave-teacher":
        returnHome();
        break;
      default:
        throw new Error(`Неизвестное действие интерфейса: ${button.dataset.action}`);
    }
  });

  render();
  setBackgroundAudioState();
})();
