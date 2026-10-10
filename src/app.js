(function () {
  "use strict";

  const app = document.querySelector("#app");
  const game = window.PolisGame;
  const data = window.PolisData;
  let state = game.createInitialState();

  const ruleSlides = [
    {
      title: "Три фракции",
      text: "Философы (Ф), Воины (В) и Торговцы (Т) спорят за влияние. В начале у каждой фракции по 5 очков."
    },
    {
      title: "Единство — здоровье города",
      text: "Шкала Единства (Е) начинается с 8 и меняется от 0 до 10. Если она падает до нуля, город погибает."
    },
    {
      title: "У каждого решения есть цена",
      text: "В каждом кризисе три варианта. Они по-разному меняют влияние и Единство; правильного ответа нет."
    },
    {
      title: "Обсудите и выберите общий ответ",
      text: "Класс обсуждает варианты вслух, затем один человек отмечает общий выбор. Сайт не собирает голоса учеников."
    },
    {
      title: "Договоритесь и посмотрите на результат",
      text: "Впереди 12 кризисов и праздники после 4-го и 8-го. В конце город получит свой строй — или погибнет от раздора."
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
      ? '<span class="mode-tag">Панель ведущего</span>'
      : "";
    return `
      <div class="site-shell">
        <header class="topbar">
          <a class="wordmark" href="#" data-action="home" aria-label="Полис — главное меню">
            <span class="wordmark-seal" aria-hidden="true">Π</span>
            <span><strong>ПОЛИС</strong><small>ИГРА ПО «ГОСУДАРСТВУ» ПЛАТОНА</small></span>
          </a>
          <div class="topbar-actions">
            ${teacherTag}
            ${state.teacherMode && state.phase !== "home" ? '<button class="text-button" data-action="leave-teacher">В меню</button>' : ""}
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
          <div><span class="eyebrow">ЗДОРОВЬЕ ГОРОДА</span><h2>Единство</h2></div>
          <strong class="unity-value">${state.unity}<small> / 10</small></strong>
        </div>
        <div class="unity-track" role="meter" aria-label="Единство" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${state.unity}">
          <span style="width:${state.unity * 10}%"></span>
        </div>
        <div class="track-scale"><span>Раздор</span><span>Сплочённость</span></div>
      </section>`;
  }

  function teacherMetrics() {
    return `
      <section class="teacher-board">
        <div class="section-heading"><span class="eyebrow">ТЕКУЩЕЕ СОСТОЯНИЕ</span><h2>Шкалы города</h2></div>
        ${factionMetrics()}
        <div class="teacher-unity-row"><span>Единство</span><strong>${state.unity} / 10</strong></div>
      </section>`;
  }

  function homeScreen() {
    return `
      <section class="home-hero">
        <div class="hero-copy">
          <span class="eyebrow">УЧЕБНАЯ ПЕРЕГОВОРНАЯ ИГРА</span>
          <h1>Какой город<br><em>мы построим?</em></h1>
          <p class="hero-intro">Двенадцать кризисов. Три силы. Одно общее решение — и судьба города в ваших руках.</p>
          <div class="hero-actions">
            <button class="primary-button" data-action="play">Начать игру <span aria-hidden="true">→</span></button>
            <button class="quiet-button" data-action="open-teacher">Меню преподавателя <span aria-hidden="true">↗</span></button>
          </div>
        </div>
        <div class="city-illustration" aria-hidden="true">
          <div class="sun-disc"></div><div class="mountain mountain-back"></div><div class="mountain mountain-front"></div>
          <div class="temple"><span></span><span></span><span></span><span></span><b></b></div>
          <div class="city-ground"></div>
          <span class="illustration-caption">ПОЛИС · ГОРОД И ЕГО ГРАЖДАНЕ</span>
        </div>
      </section>
      <section class="home-note">
        <span class="note-mark">01</span>
        <p>Философы, воины и торговцы спорят о власти. Но выдержит ли город цену их решений?</p>
        <span class="note-signature">ПО МОТИВАМ ПЛАТОНА</span>
      </section>`;
  }

  function pinScreen() {
    return `
      <section class="narrow-panel">
        <button class="back-link" data-action="back-home">← Главное меню</button>
        <span class="eyebrow">ДЛЯ ВЕДУЩЕГО</span>
        <h1 class="panel-title">Панель<br><em>преподавателя</em></h1>
        <p class="lead">Введите PIN, чтобы открыть шкалы города и эффекты вариантов.</p>
        <form data-form="teacher-pin" class="pin-form">
          <label for="teacher-pin">PIN-код</label>
          <div class="pin-row">
            <input id="teacher-pin" name="pin" type="password" inputmode="numeric" autocomplete="off" required aria-describedby="pin-note pin-error">
            <button class="primary-button" type="submit">Войти <span aria-hidden="true">→</span></button>
          </div>
          <p id="pin-error" class="form-error" role="alert">${state.pinError ? "PIN не подошёл. Попробуйте ещё раз." : ""}</p>
        </form>
        <p id="pin-note" class="security-note"><strong>Важно:</strong> на статическом сайте PIN — только барьер от случайного перехода. Это не защита: код сайта доступен в браузере.</p>
      </section>`;
  }

  function rulesScreen() {
    const slide = ruleSlides[state.rulesSlide];
    const progress = ((state.rulesSlide + 1) / ruleSlides.length) * 100;
    return `
      <section class="rules-layout">
        <div class="rules-aside"><span class="eyebrow">ПЕРЕД НАЧАЛОМ</span><p>Пять коротких правил — и город готов к испытаниям.</p></div>
        <article class="rules-card">
          <div class="slide-meta"><span>ПРАВИЛА</span><span>${String(state.rulesSlide + 1).padStart(2, "0")} / 05</span></div>
          <div class="slide-progress" aria-hidden="true"><span style="width:${progress}%"></span></div>
          <span class="slide-number">${String(state.rulesSlide + 1).padStart(2, "0")}</span>
          <h1>${escapeHtml(slide.title)}</h1>
          <p>${escapeHtml(slide.text)}</p>
          <div class="slide-controls">
            <button class="quiet-button" data-action="previous-slide" ${state.rulesSlide === 0 ? "disabled" : ""}>← Назад</button>
            <button class="primary-button" data-action="next-slide">${state.rulesSlide === ruleSlides.length - 1 ? "Начать игру" : "Далее"} <span aria-hidden="true">→</span></button>
          </div>
        </article>
      </section>`;
  }

  function optionCards(crisis) {
    return `
      <div class="option-list">
        ${crisis.options.map((option) => `
          <button class="option-card" data-action="choose" data-option="${escapeHtml(option.id)}">
            <span class="option-letter">${escapeHtml(option.id)}</span>
            <span class="option-copy">${escapeHtml(option.text)}</span>
            ${state.teacherMode
              ? `<span class="effect-list" aria-label="Тип и эффект варианта">${escapeHtml(option.type)} · ${effectLabels(option.effect)}</span>`
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
          <div class="crisis-kicker"><span>КРИЗИС ${String(crisis.id).padStart(2, "0")}</span><span class="crisis-line"></span><span>${String(data.crises.length).padStart(2, "0")} ВСЕГО</span></div>
          <div class="crisis-heading">
            <h1>${escapeHtml(crisis.title)}</h1>
            <p>${escapeHtml(crisis.scenario)}</p>
            <details class="mobile-reading"><summary>Показать сценарий</summary><p>${escapeHtml(crisis.scenario)}</p></details>
          </div>
          ${optionCards(crisis)}
          <p class="choice-hint">Обсудите варианты и выберите одно общее решение.</p>
        </div>
        <aside class="game-sidebar">
          ${state.teacherMode ? teacherMetrics() : unityCard()}
          <div class="sidebar-note"><span class="note-mark">✳</span><p>${state.teacherMode
            ? "Повторите выбор класса на его экране."
            : "Влияние фракций скрыто. За ходом Единства следит весь город."}</p></div>
        </aside>
      </section>`;
  }

  function debriefScreen() {
    const crisis = data.crises[state.crisisIndex];
    const option = crisis.options.find((item) => item.id === state.selectedOptionId);
    const unityChange = state.lastChanges.E;
    const unityMessage = unityChange === 0
      ? `Единство осталось ${state.unity}.`
      : `Единство ${unityChange > 0 ? "выросло" : "снизилось"} на ${Math.abs(unityChange)}: теперь ${state.unity}.`;
    return `
      <section class="debrief-layout">
        <div class="debrief-main">
          <div class="crisis-kicker"><span>КРИЗИС ${String(crisis.id).padStart(2, "0")} · ВЫБОР ${escapeHtml(option.id)}</span><span class="crisis-line"></span><span>РАЗБОР</span></div>
          <div class="quote-mark" aria-hidden="true">“</div>
          <h1 class="debrief-title">Платон<br><em>об этом</em></h1>
          <p class="plato-quote">${escapeHtml(crisis.quote)}</p>
          <details class="mobile-reading"><summary>Открыть текст</summary><p>${escapeHtml(crisis.quote)}</p></details>
          <div class="class-question"><span class="eyebrow">ВОПРОС КЛАССУ</span><p>${escapeHtml(crisis.question)}</p></div>
        </div>
        <aside class="debrief-sidebar">
          ${state.teacherMode ? teacherMetrics() : unityCard()}
          <div class="outcome-note">
            <span class="eyebrow">ПОСЛЕДСТВИЕ ВЫБОРА</span>
            <p>${escapeHtml(unityMessage)}</p>
            ${state.teacherMode ? `
              <div class="teacher-effects"><span>${escapeHtml(option.type)} · вариант: ${escapeHtml(effectLabels(state.lastEffect))}</span>
              <span>Применено: ${escapeHtml(effectLabels(state.lastChanges))}</span></div>` : ""}
          </div>
          <button class="primary-button full-button" data-action="continue-debrief">
            ${state.ended ? "К итогу" : state.pendingFestival ? "К празднику" : "Продолжить"} <span aria-hidden="true">→</span>
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
        <span class="eyebrow">ГОРОД СОХРАНИЛ ЕДИНСТВО</span>
        <h1>Праздник<br><em>города</em></h1>
        <p>После общего испытания город собирается вместе. Единство выросло на одно очко — теперь <strong>${state.unity} / 10</strong>.</p>
        <button class="primary-button" data-action="continue-festival">Продолжить <span aria-hidden="true">→</span></button>
      </section>`;
  }

  function resultScreen() {
    const result = game.getResult(state);
    return `
      <section class="result-layout">
        <div class="result-copy">
          <span class="eyebrow">ИТОГ ПАРТИИ · КРИЗИСОВ ПРОЙДЕНО ${state.unity === 0 ? state.crisisIndex + 1 : data.crises.length}</span>
          <h1>${escapeHtml(result.name)}</h1>
          <p>${escapeHtml(result.description)}</p>
          <button class="primary-button" data-action="restart">Играть снова <span aria-hidden="true">↻</span></button>
        </div>
        <div class="result-board">
          <span class="eyebrow">СОСТОЯНИЕ ГОРОДА</span>
          ${factionMetrics()}
          <div class="result-unity"><span>Единство</span><strong>${state.unity}<small> / 10</small></strong></div>
          <p class="result-reflection">Результат — не победа одной группы, а повод обсудить, какой ценой он достигнут.</p>
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
        !window.confirm("Вернуться в меню? Текущая независимая партия будет сброшена.")) return;
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
