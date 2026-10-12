(function (global) {
  "use strict";

  const FACTIONS = ["F", "V", "T"];
  const INITIAL_FACTIONS = Object.freeze({ F: 5, V: 5, T: 5 });
  const TEACHER_PIN = "1881";

  function requirePhase(state, phase) {
    if (!state || state.phase !== phase) {
      throw new Error(`Недопустимый переход: ожидалась фаза «${phase}»`);
    }
  }

  function validateState(state) {
    if (!state || !state.factions || !Number.isInteger(state.unity) ||
        state.unity < 0 || state.unity > 10) {
      throw new Error("Некорректное состояние игры");
    }
    const values = FACTIONS.map((faction) => state.factions[faction]);
    if (!values.every((value) => Number.isInteger(value) && value >= 0 && value <= 10) ||
        values.reduce((sum, value) => sum + value, 0) !== 15) {
      throw new Error("Нарушен инвариант влияния Ф/В/Т");
    }
  }

  function createInitialState() {
    return {
      phase: "home",
      teacherMode: false,
      pinError: false,
      rulesSlide: 0,
      crisisIndex: 0,
      factions: { ...INITIAL_FACTIONS },
      unity: 8,
      selectedOptionId: null,
      lastEffect: null,
      lastChanges: null,
      pendingFestival: false,
      ended: false
    };
  }

  function startGame(state) {
    requirePhase(state, "home");
    return { ...state, phase: state.teacherMode ? "game" : "rules" };
  }

  function nextRuleSlide(state) {
    requirePhase(state, "rules");
    if (state.rulesSlide >= 4) {
      return { ...state, phase: "game" };
    }
    return { ...state, rulesSlide: state.rulesSlide + 1 };
  }

  function previousRuleSlide(state) {
    requirePhase(state, "rules");
    return { ...state, rulesSlide: Math.max(0, state.rulesSlide - 1) };
  }

  function openTeacherGate(state) {
    requirePhase(state, "home");
    return { ...state, phase: "pin", pinError: false };
  }

  function unlockTeacher(state, pin) {
    requirePhase(state, "pin");
    if (String(pin) !== TEACHER_PIN) {
      return { ...state, pinError: true };
    }
    return { ...state, phase: "game", teacherMode: true, pinError: false };
  }

  function applyChoice(state, option) {
    requirePhase(state, "game");
    validateState(state);
    if (state.selectedOptionId !== null || state.ended) {
      throw new Error("Для этого кризиса выбор уже применён");
    }
    if (!option || typeof option.id !== "string" || !option.effect) {
      throw new Error("Неизвестный вариант ответа");
    }

    const effect = Object.fromEntries(
      ["F", "V", "T", "E"].map((key) => {
        const value = option.effect[key] === undefined ? 0 : option.effect[key];
        if (!Number.isInteger(value)) throw new Error(`Некорректный эффект шкалы ${key}`);
        return [key, value];
      })
    );
    const winnerCandidates = FACTIONS.filter((faction) => effect[faction] > 0);
    const payerCandidates = FACTIONS.filter((faction) => effect[faction] < 0);
    if (winnerCandidates.length !== 1 ||
        FACTIONS.reduce((sum, faction) => sum + effect[faction], 0) !== 0) {
      throw new Error("Эффект варианта не является сбалансированным переносом влияния");
    }

    const winner = winnerCandidates[0];
    const factions = { ...state.factions };
    const orderedPayers = payerCandidates.sort((left, right) =>
      Math.abs(effect[right]) - Math.abs(effect[left]) ||
      FACTIONS.indexOf(left) - FACTIONS.indexOf(right)
    );

    for (const payer of orderedPayers) {
      for (let unit = 0; unit < Math.abs(effect[payer]); unit += 1) {
        if (factions[winner] >= 10) break;
        let source = payer;
        if (factions[source] === 0) {
          source = FACTIONS.find((faction) =>
            faction !== winner && faction !== payer && factions[faction] > 0
          );
          if (!source) continue;
        }
        factions[source] -= 1;
        factions[winner] += 1;
      }
      if (factions[winner] >= 10) break;
    }

    const unity = Math.max(0, Math.min(10, state.unity + effect.E));
    const changes = {
      F: factions.F - state.factions.F,
      V: factions.V - state.factions.V,
      T: factions.T - state.factions.T,
      E: unity - state.unity
    };
    const ended = unity === 0 || state.crisisIndex === global.PolisData.crises.length - 1;
    const pendingFestival = !ended && [3, 7].includes(state.crisisIndex);
    const nextState = {
      ...state,
      phase: "debrief",
      factions,
      unity,
      selectedOptionId: option.id,
      lastEffect: effect,
      lastChanges: changes,
      pendingFestival,
      ended
    };
    validateState(nextState);
    return nextState;
  }

  function advanceAfterDebrief(state) {
    requirePhase(state, "debrief");
    if (state.ended) {
      return { ...state, phase: "result", pendingFestival: false };
    }
    if (state.pendingFestival) {
      return {
        ...state,
        phase: "festival",
        unity: Math.min(10, state.unity + 1),
        pendingFestival: false
      };
    }
    if (state.crisisIndex >= global.PolisData.crises.length - 1) {
      return { ...state, phase: "result", ended: true };
    }
    return {
      ...state,
      phase: "game",
      crisisIndex: state.crisisIndex + 1,
      selectedOptionId: null,
      lastEffect: null,
      lastChanges: null
    };
  }

  function advanceAfterFestival(state) {
    requirePhase(state, "festival");
    return {
      ...state,
      phase: "game",
      crisisIndex: state.crisisIndex + 1,
      selectedOptionId: null,
      lastEffect: null,
      lastChanges: null
    };
  }

  function restart(state) {
    const nextState = createInitialState();
    nextState.phase = "rules";
    nextState.teacherMode = Boolean(state && state.teacherMode);
    return nextState;
  }

  function getResult(state) {
    validateState(state);
    if (state.unity === 0) {
      return { name: "Раздор", description: "Единство обнулилось — город не выдержал раскола." };
    }
    if (state.unity <= 2) {
      return { name: "Тирания", description: "Город едва держится: единства почти не осталось." };
    }
    if (state.unity <= 4) {
      return { name: "Демократия", description: "Город пережил кризисы, хотя держаться вместе стало труднее." };
    }

    const maximum = Math.max(...FACTIONS.map((faction) => state.factions[faction]));
    const leaders = FACTIONS.filter((faction) => state.factions[faction] === maximum);
    if (leaders.length > 1) {
      return {
        name: "Смешанный строй",
        description: leaders.length === 3
          ? "Ни одна группа не перетянула власть на себя."
          : "У власти оказались сразу две группы."
      };
    }
    const regimes = {
      F: ["Аристократия", "В городе решающее слово за философами."],
      V: ["Тимократия", "В городе решающее слово за воинами."],
      T: ["Олигархия", "В городе решающее слово за торговцами."]
    };
    return { name: regimes[leaders[0]][0], description: regimes[leaders[0]][1] };
  }

  global.PolisGame = {
    createInitialState,
    startGame,
    nextRuleSlide,
    previousRuleSlide,
    openTeacherGate,
    unlockTeacher,
    applyChoice,
    advanceAfterDebrief,
    advanceAfterFestival,
    restart,
    getResult
  };
})(window);
