(function () {
  "use strict";

  const app = document.querySelector("#app");
  const game = window.PolisGame;
  const data = window.PolisData;
  let state = game.createInitialState();

  const ruleSlides = [
    {
      title: "У кого какая власть?",
      text: "В городе спорят философы, воины и торговцы. В начале у каждой группы по 5 очков влияния."
    },
    {
      title: "Что держит город вместе?",
      text: "За это отвечает шкала единства: на старте у города 8 очков. Если она опустится до нуля, партия закончится."
    },
    {
      title: "Лёгкого выхода не будет",
      text: "В каждом кризисе — три решения. Выбирая одно, вы усиливаете одну группу и меняете жизнь всего города. Правильного ответа нет."
    },
    {
      title: "Сначала договоритесь",
      text: "Обсудите все три варианта и выберите один общий. Ведущий отметит его на экране."
    },
    {
      title: "Впереди двенадцать кризисов",
      text: "После четвёртого и восьмого город переведёт дух на празднике. В конце увидим, к чему привели ваши решения."
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

  function pageShell(content) {
    const teacherTag = state.teacherMode
      ? '<span class="mode-tag">Экран ведущего</span>'
      : "";
    return `
      <div class="site-shell">
        <header class="topbar">
          <a class="wordmark" href="#" data-action="home" aria-label="Полис — главное меню">
            <span class="wordmark-seal" aria-hidden="true">Π</span>
            <span><strong>Полис</strong><small>Игра по «Государству» Платона</small></span>
          </a>
          <div class="topbar-actions">
            ${teacherTag}
            ${state.teacherMode && state.phase !== "home" ? '<button class="text-button" data-action="leave-teacher">Выйти в меню</button>' : ""}
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

  function unityCard() {
    const level = state.unity === 0 ? "zero" : state.unity <= 2 ? "critical" : state.unity <= 4 ? "warning" : "healthy";
    return `
      <section class="unity-card ${level}" aria-label="Единство города">
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
        </div>
        <div class="city-illustration" aria-hidden="true">
          <span class="illustration-caption">ЗАПИСКА К ИГРЕ</span>
          <svg class="city-drawing" viewBox="0 0 520 360">
            <path class="drawing-road" d="M-20 270C96 217 124 331 231 276s149-54 309 14M102 380c-10-107 57-106 64-198s48-91 81-168m-95 201c73 44 148 43 225-8s110-40 164-20"/>
            <path class="drawing-building" d="m61 97 49-27 47 26v58l-49 29-47-30zm196-17 48-26 48 27v57l-48 28-48-27zM334 207l47-27 49 28v55l-48 29-48-29zM148 240l48-27 48 28v55l-48 29-48-28z"/>
            <path class="drawing-detail" d="m77 101 33-18 33 18v39l-34 19-32-19zm195-17 33-18 33 19v38l-33 19-33-18zm76 127 33-19 33 19v36l-33 20-33-20zm-185 35 33-19 33 19v37l-33 20-33-20z"/>
            <path class="drawing-temple" d="m216 117 47-27 48 27-48 26zm10 8v45m18-45v45m18-45v45m18-45v45m-57 0h77m-89 12h101"/>
            <circle class="drawing-sun" cx="431" cy="81" r="31"/>
            <path class="drawing-ray" d="M431 31V15m0 132v-16m50-50h17m-134 0h17m85-35 12-12m-95 94 12-12m71 0 12 12m-95-95 12 12"/>
          </svg>
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
    return `
      <section class="rules-layout">
        <article class="rules-card">
          <div class="slide-meta"><span>ПРАВИЛА ИГРЫ</span></div>
          <div class="slide-progress" role="progressbar" aria-label="Ход правил" aria-valuemin="1" aria-valuemax="${ruleSlides.length}" aria-valuenow="${state.rulesSlide + 1}" aria-valuetext="Правило ${state.rulesSlide + 1} из ${ruleSlides.length}"><span style="width:${progress}%"></span></div>
          <h1>${escapeHtml(slide.title)}</h1>
          <p>${escapeHtml(slide.text)}</p>
          <div class="slide-controls">
            <button class="quiet-button" data-action="previous-slide" ${state.rulesSlide === 0 ? "disabled" : ""}>← Назад</button>
            <button class="primary-button" data-action="next-slide">${state.rulesSlide === ruleSlides.length - 1 ? "Пора начинать" : "Дальше"} <span aria-hidden="true">→</span></button>
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
      <section class="game-layout">
        <div class="game-main">
          <div class="crisis-kicker"><span>КРИЗИС ${crisis.id} ИЗ ${data.crises.length}</span><span class="crisis-line"></span><span>ВАШ ХОД</span></div>
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
          ${state.teacherMode ? teacherMetrics() : unityCard()}
        </aside>
      </section>`;
  }

  function debriefScreen() {
    const crisis = data.crises[state.crisisIndex];
    const option = crisis.options.find((item) => item.id === state.selectedOptionId);
    const unityChange = state.lastChanges.E;
    const unityMessage = unityChange === 0
      ? `Единство не изменилось: ${state.unity} из 10.`
      : `Единство ${unityChange > 0 ? "выросло" : "снизилось"} на ${Math.abs(unityChange)} — теперь ${state.unity} из 10.`;
    return `
      <section class="debrief-layout">
        <div class="debrief-main">
          <div class="crisis-kicker"><span>КРИЗИС ${crisis.id} · ВЫБОР ${escapeHtml(option.id)}</span><span class="crisis-line"></span><span>ПОСЛЕ РЕШЕНИЯ</span></div>
          <div class="quote-mark" aria-hidden="true">“</div>
          <h1 class="debrief-title">А что на это<br><em>сказал бы Платон?</em></h1>
          <p class="plato-quote">${escapeHtml(crisis.quote)}</p>
          <details class="mobile-reading"><summary>Заглянуть в «Государство»</summary><p>${escapeHtml(crisis.quote)}</p></details>
          <div class="class-question"><span class="eyebrow">ОБСУДИТЕ ВМЕСТЕ</span><p>${escapeHtml(crisis.question)}</p></div>
        </div>
        <aside class="debrief-sidebar">
          ${state.teacherMode ? teacherMetrics() : unityCard()}
          <div class="outcome-note">
            <span class="eyebrow">ЧТО СТАЛО С ЕДИНСТВОМ</span>
            <p>${escapeHtml(unityMessage)}</p>
            ${state.teacherMode ? `
              <div class="teacher-effects"><span>${escapeHtml(option.type)} · эффект по карточке: ${escapeHtml(effectLabels(state.lastEffect))}</span>
              <span>Что изменилось: ${escapeHtml(effectLabels(state.lastChanges))}</span></div>` : ""}
          </div>
          <button class="primary-button full-button" data-action="continue-debrief">
            ${state.ended ? "Посмотреть итог" : state.pendingFestival ? "На праздник" : "Дальше"} <span aria-hidden="true">→</span>
          </button>
        </aside>
      </section>`;
  }

  function festivalScreen() {
    return `
      <section class="festival-screen">
        <div class="festival-art" role="img" aria-label="Праздничные ленты и огни">
          <svg viewBox="0 0 240 160" aria-hidden="true">
            <path d="M22 120Q58 26 120 80Q182 26 218 120" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M42 83l-10 15 18 2m17-37-3 19 17-7m40-5 12 16 11-17m29-4 1 19 15-10m16 28 17 1-7-17" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
            <circle cx="33" cy="117" r="4"/><circle cx="70" cy="69" r="4"/><circle cx="120" cy="79" r="5"/><circle cx="169" cy="68" r="4"/><circle cx="207" cy="115" r="4"/>
          </svg>
        </div>
        <span class="eyebrow">ЕСТЬ ПОВОД ВЫДОХНУТЬ</span>
        <h1>День<br><em>города</em></h1>
        <p>Кризис позади — горожане собрались вместе. Единство прибавило очко: теперь <strong>${state.unity} из 10</strong>.</p>
        <button class="primary-button" data-action="continue-festival">К следующему кризису <span aria-hidden="true">→</span></button>
      </section>`;
  }

  function resultScreen() {
    const result = game.getResult(state);
    return `
      <section class="result-layout">
        <div class="result-copy">
          <span class="eyebrow">ПАРТИЯ ЗАВЕРШЕНА · КРИЗИСОВ ПРОЙДЕНО: ${state.unity === 0 ? state.crisisIndex + 1 : data.crises.length}</span>
          <h1>${escapeHtml(result.name)}</h1>
          <p>${escapeHtml(result.description)}</p>
          <button class="primary-button" data-action="restart">Начать заново <span aria-hidden="true">↻</span></button>
        </div>
        <div class="result-board">
          <span class="eyebrow">ЧТО ПОЛУЧИЛОСЬ</span>
          ${factionMetrics()}
          <div class="result-unity"><span>Единство</span><strong>${state.unity}<small> / 10</small></strong></div>
          <p class="result-reflection">Поговорите о том, кому досталась власть и чем за это пришлось заплатить.</p>
        </div>
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
    state = game.createInitialState();
    render();
  }

  app.addEventListener("submit", (event) => {
    if (event.target.dataset.form !== "teacher-pin") return;
    event.preventDefault();
    const pin = new FormData(event.target).get("pin");
    state = game.unlockTeacher(state, pin);
    render();
    if (state.phase === "pin") app.querySelector("#teacher-pin").focus();
  });

  app.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest("[data-action]");
    if (!button) return;
    switch (button.dataset.action) {
      case "home":
      case "back-home":
        returnHome();
        break;
      case "play":
        state = game.startGame(state);
        render();
        break;
      case "open-teacher":
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
        render();
        break;
      case "continue-festival":
        state = game.advanceAfterFestival(state);
        render();
        break;
      case "restart":
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
})();
