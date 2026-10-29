/**
 * ШПИОН: СЕКРЕТНОЕ ДЕЙСТВИЕ
 * Мобильная веб-игра в стиле секретных служб и спецопераций
 * Агентурная сеть, шифробуквы, условные сигналы и вражеские шпионы
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. АУДИО-СИНТЕЗАТОР (Web Audio API)
  // =========================================================================
  class SoundManager {
    constructor() {
      this.enabled = localStorage.getItem('spy_sound_enabled') !== 'false';
      this.ctx = null;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      localStorage.setItem('spy_sound_enabled', this.enabled);
      return this.enabled;
    }

    playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.2) {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {}
    }

    playClick() {
      this.playTone(420, 'triangle', 0.05, 0.2);
      if (navigator.vibrate) navigator.vibrate(10);
    }

    playFlip() {
      this.playTone(280, 'sine', 0.16, 0.25);
      if (navigator.vibrate) navigator.vibrate(25);
    }

    playWarning() {
      this.playTone(800, 'square', 0.09, 0.2);
      if (navigator.vibrate) navigator.vibrate([20, 20, 20]);
    }

    playAlarm() {
      if (!this.enabled) return;
      this.init();
      [550, 700, 850, 550].forEach((freq, idx) => {
        setTimeout(() => this.playTone(freq, 'sawtooth', 0.2, 0.25), idx * 180);
      });
      if (navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 160]);
    }

    playVictory() {
      if (!this.enabled) return;
      this.init();
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        setTimeout(() => this.playTone(freq, 'triangle', 0.3, 0.22), idx * 120);
      });
      if (navigator.vibrate) navigator.vibrate([60, 40, 90]);
    }

    playSpyWin() {
      if (!this.enabled) return;
      this.init();
      [440, 415.3, 392, 349.2].forEach((freq, idx) => {
        setTimeout(() => this.playTone(freq, 'sawtooth', 0.3, 0.2), idx * 160);
      });
      if (navigator.vibrate) navigator.vibrate([90, 40, 120]);
    }
  }

  const sound = new SoundManager();

  // =========================================================================
  // 2. СЛОВАРЬ (111 182 СЛОВА ВСТРОЕНО)
  // =========================================================================
  class WordDictionaryManager {
    constructor() {
      this.wordsByLength = (typeof window !== 'undefined' && window.DEFAULT_WORDS_BY_LENGTH)
        ? window.DEFAULT_WORDS_BY_LENGTH
        : ((typeof DEFAULT_WORDS_BY_LENGTH !== 'undefined') ? DEFAULT_WORDS_BY_LENGTH : {});
    }

    getRandomWord(length) {
      const list = this.wordsByLength[length];
      if (!list || list.length === 0) return null;
      const idx = Math.floor(Math.random() * list.length);
      return list[idx];
    }
  }

  const wordManager = new WordDictionaryManager();

  // =========================================================================
  // 3. СОСТОЯНИЕ ИГРЫ
  // =========================================================================
  const state = {
    // Список оперативников
    players: [
      { id: 1, name: '1', avatar: '🐼' },
      { id: 2, name: '2', avatar: '🤠' },
      { id: 3, name: '3', avatar: '🍉' },
      { id: 4, name: '4', avatar: '🧃' },
      { id: 5, name: '5', avatar: '🍩' }
    ],

    spiesCount: 1,
    roundTimeSeconds: 180, // 03:00
    actionEnabled: true,
    spyGuessWin: localStorage.getItem('spy_guess_win') !== 'false',

    // Текущая операция
    round: {
      word: '',
      action: null,
      assigned: [], // { id, name, avatar, isSpy, letter, guess }
      passIndex: 0,
      guessIndex: 0,
      cardFlipped: false,
      revealFlipped: false
    },

    // Таймер
    timer: {
      remaining: 0,
      intervalId: null,
      isRunning: false
    }
  };

  const AVATAR_OPTIONS = [
    '🐼', '🤠', '🍉', '🧃', '🍩', '🏴‍☠️', '🤪', '👑', '👻', '🐸',
    '🦄', '🍕', '🍔', '🧁', '😎', '🤓', '😈', '🦁', '🐱', '🐶', '🚀', '⭐', '💎'
  ];

  // =========================================================================
  // 4. ЭЛЕМЕНТЫ DOM
  // =========================================================================
  const dom = {
    // Экраны
    screenSetup: document.getElementById('screen-setup'),
    screenPass: document.getElementById('screen-pass'),
    screenDiscussion: document.getElementById('screen-discussion'),
    screenGuess: document.getElementById('screen-guess'),
    screenReveal: document.getElementById('screen-reveal'),

    // Верхние кнопки
    btnSound: document.getElementById('btn-sound'),
    btnRules: document.getElementById('btn-rules'),
    btnDictModal: document.getElementById('btn-dict-modal'),
    cardRulesBtn: document.getElementById('card-rules-btn'),

    // Меню и настройки
    playersListChips: document.getElementById('players-list-chips'),
    cardSpies: document.getElementById('card-spies'),
    btnSpiesMinus: document.getElementById('btn-spies-minus'),
    btnSpiesPlus: document.getElementById('btn-spies-plus'),
    valSpies: document.getElementById('val-spies'),
    btnSpiesCustom: document.getElementById('btn-spies-custom'),
    cardRoundBtn: document.getElementById('card-round-btn'),
    valRoundTime: document.getElementById('val-round-time'),
    toggleAction: document.getElementById('toggle-action'),
    toggleSpyGuessWin: document.getElementById('toggle-spy-guess-win'),
    btnStartGame: document.getElementById('btn-start-game'),

    // Выдача досье (Pass & Play)
    btnCancelGame: document.getElementById('btn-cancel-game'),
    passPlayerBadge: document.getElementById('pass-player-badge'),
    cardScene: document.getElementById('card-scene'),
    secretCard: document.getElementById('secret-card'),
    cardBack: document.getElementById('card-back'),
    cardRoleBadge: document.getElementById('card-role-badge'),
    cardPlayerContent: document.getElementById('card-player-content'),
    cardSpyContent: document.getElementById('card-spy-content'),
    cardLetterDisplay: document.getElementById('card-letter-display'),
    cardActionBox: document.getElementById('card-action-box'),
    cardActionText: document.getElementById('card-action-text'),
    cardActionHint: document.getElementById('card-action-hint'),
    passInstructionText: document.getElementById('pass-instruction-text'),
    btnNextPlayer: document.getElementById('btn-next-player'),

    // Обсуждение и кольцевой таймер
    btnCancelDiscussion: document.getElementById('btn-cancel-discussion'),
    btnRulesDiscussion: document.getElementById('btn-rules-discussion'),
    ringTimerClickable: document.getElementById('ring-timer-clickable'),
    timerProgress: document.getElementById('timer-progress'),
    timerDisplay: document.getElementById('timer-display'),
    timerStatusHint: document.getElementById('timer-status-hint'),
    labelPlayersCount: document.getElementById('label-players-count'),
    btnShowPlayersModal: document.getElementById('btn-show-players-modal'),
    btnFinishDiscussion: document.getElementById('btn-finish-discussion'),

    // Ввод ответов (Расшифровка)
    guessPlayerBadge: document.getElementById('guess-player-badge'),
    guessPromptTitle: document.getElementById('guess-prompt-title'),
    guessInput: document.getElementById('guess-input'),
    btnSubmitGuess: document.getElementById('btn-submit-guess'),

    // Финал и рассекречивание
    revealScene: document.getElementById('reveal-scene'),
    revealCard: document.getElementById('reveal-card'),
    finalSecretWord: document.getElementById('final-secret-word'),
    finalActionContainer: document.getElementById('final-action-container'),
    finalSecretAction: document.getElementById('final-secret-action'),
    winnerBannerWrap: document.getElementById('winner-banner-wrap'),
    winnerBanner: document.getElementById('winner-banner'),
    winnerTitle: document.getElementById('winner-title'),
    winnerReason: document.getElementById('winner-reason'),
    resultsList: document.getElementById('results-list'),
    btnPlayAgain: document.getElementById('btn-play-again'),
    btnBackToSetup: document.getElementById('btn-back-to-setup'),

    // Модальные окна
    modalRules: document.getElementById('modal-rules'),
    modalDict: document.getElementById('modal-dict'),
    modalAddPlayer: document.getElementById('modal-add-player'),
    inputNewPlayerName: document.getElementById('input-new-player-name'),
    avatarChoices: document.getElementById('avatar-choices'),
    btnConfirmAddPlayer: document.getElementById('btn-confirm-add-player'),
    modalSpiesPicker: document.getElementById('modal-spies-picker'),
    btnModalSpyMinus: document.getElementById('btn-modal-spy-minus'),
    btnModalSpyPlus: document.getElementById('btn-modal-spy-plus'),
    inputModalSpies: document.getElementById('input-modal-spies'),
    spiesQuickPresets: document.getElementById('spies-quick-presets'),
    btnSaveSpiesCount: document.getElementById('btn-save-spies-count'),
    modalRoundPicker: document.getElementById('modal-round-picker')
  };

  let selectedAvatar = '🐼';

  // =========================================================================
  // 5. НАВИГАЦИЯ МЕЖДУ ЭКРАНАМИ
  // =========================================================================
  function showScreen(screen) {
    [
      dom.screenSetup,
      dom.screenPass,
      dom.screenDiscussion,
      dom.screenGuess,
      dom.screenReveal
    ].forEach(s => s && s.classList.remove('active'));

    screen.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // =========================================================================
  // 6. УПРАВЛЕНИЕ АГЕНТУРНОЙ СЕТЬЮ (ОПЕРАТИВНИКИ)
  // =========================================================================
  function renderPlayersChips() {
    dom.playersListChips.innerHTML = '';

    state.players.forEach((p, idx) => {
      const chip = document.createElement('div');
      chip.className = 'agent-chip';
      chip.innerHTML = `<span>${p.avatar}</span> <span>${escapeHtml(p.name)}</span>`;
      chip.title = 'Нажмите, чтобы удалить оперативника';
      chip.addEventListener('click', () => removePlayer(idx));
      dom.playersListChips.appendChild(chip);
    });

    // Кнопка добавления нового оперативника (+)
    if (state.players.length < 15) {
      const addBtn = document.createElement('div');
      addBtn.className = 'agent-chip-add';
      addBtn.textContent = '+';
      addBtn.title = 'Добавить оперативника';
      addBtn.addEventListener('click', openAddPlayerModal);
      dom.playersListChips.appendChild(addBtn);
    }

    dom.labelPlayersCount.textContent = `Оперативники • ${state.players.length}`;
    ensureValidSpiesCount();
    updateSetupLabels();
  }

  function removePlayer(idx) {
    sound.playClick();
    if (state.players.length <= 4) {
      alert('Минимум 4 оперативника для игры в слова!');
      return;
    }
    const removed = state.players[idx];
    if (confirm(`Удалить оперативника ${removed.avatar} ${removed.name}?`)) {
      state.players.splice(idx, 1);
      ensureValidSpiesCount();
      renderPlayersChips();
    }
  }

  function openAddPlayerModal() {
    sound.playClick();
    const nextNum = state.players.length + 1;
    dom.inputNewPlayerName.value = `${nextNum}`;

    const unusedAvatars = AVATAR_OPTIONS.filter(a => !state.players.some(p => p.avatar === a));
    selectedAvatar = unusedAvatars.length > 0 ? unusedAvatars[0] : AVATAR_OPTIONS[0];

    renderAvatarPicker();
    openModal(dom.modalAddPlayer);
    setTimeout(() => dom.inputNewPlayerName.focus(), 150);
  }

  function renderAvatarPicker() {
    dom.avatarChoices.innerHTML = '';
    AVATAR_OPTIONS.forEach(av => {
      const btn = document.createElement('div');
      btn.className = `avatar-choice-btn ${av === selectedAvatar ? 'selected' : ''}`;
      btn.textContent = av;
      btn.addEventListener('click', () => {
        sound.playClick();
        selectedAvatar = av;
        renderAvatarPicker();
      });
      dom.avatarChoices.appendChild(btn);
    });
  }

  function confirmAddPlayer() {
    sound.playClick();
    const name = dom.inputNewPlayerName.value.trim() || `${state.players.length + 1}`;
    state.players.push({
      id: state.players.length + 1,
      name: name,
      avatar: selectedAvatar
    });
    closeModal(dom.modalAddPlayer);
    renderPlayersChips();
  }

  // =========================================================================
  // 7. СВОБОДНЫЙ ВЫБОР КОЛИЧЕСТВА ШПИОНОВ
  // =========================================================================
  function getMaxSpies() {
    // Для слова необходимо минимум 3 буквы (3 мирных агента)
    return Math.max(1, state.players.length - 3);
  }

  function ensureValidSpiesCount() {
    const max = getMaxSpies();
    if (state.spiesCount > max) {
      state.spiesCount = max;
    }
    if (state.spiesCount < 1) {
      state.spiesCount = 1;
    }
  }

  function changeSpiesCount(delta) {
    sound.playClick();
    const max = getMaxSpies();
    const next = state.spiesCount + delta;
    if (next >= 1 && next <= max) {
      state.spiesCount = next;
      updateSetupLabels();
    } else if (next > max) {
      alert(`Для ${state.players.length} оперативников максимум ${max} шпиона(ов).\n(Необходимо минимум 3 мирных агента связи для слова)`);
    }
  }

  function openSpiesModal() {
    sound.playClick();
    ensureValidSpiesCount();
    const max = getMaxSpies();

    dom.inputModalSpies.value = state.spiesCount;
    dom.inputModalSpies.max = max;

    // Генерация быстрых пресетов
    dom.spiesQuickPresets.innerHTML = '';
    const presetMax = Math.min(max, 6);
    for (let i = 1; i <= presetMax; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `spies-preset-btn ${i === state.spiesCount ? 'active' : ''}`;
      btn.textContent = `${i}`;
      btn.addEventListener('click', () => {
        sound.playClick();
        dom.inputModalSpies.value = i;
        document.querySelectorAll('.spies-preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
      dom.spiesQuickPresets.appendChild(btn);
    }

    openModal(dom.modalSpiesPicker);
  }

  function saveSpiesFromModal() {
    sound.playClick();
    const val = parseInt(dom.inputModalSpies.value, 10);
    const max = getMaxSpies();

    if (isNaN(val) || val < 1) {
      alert('Количество шпионов должно быть не менее 1!');
      return;
    }
    if (val > max) {
      alert(`Слишком много шпионов! Для ${state.players.length} оперативников допустимо от 1 до ${max} шпионов.`);
      dom.inputModalSpies.value = max;
      return;
    }

    state.spiesCount = val;
    updateSetupLabels();
    closeModal(dom.modalSpiesPicker);
  }

  function updateSetupLabels() {
    dom.valSpies.textContent = state.spiesCount;
    const mins = Math.floor(state.roundTimeSeconds / 60);
    const secs = state.roundTimeSeconds % 60;
    dom.valRoundTime.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // =========================================================================
  // 8. СТАРТ СПЕЦОПЕРАЦИИ И ГЕНЕРАЦИЯ РОЛЕЙ
  // =========================================================================
  function startNewRound() {
    sound.playClick();
    ensureValidSpiesCount();
    const innocentsCount = state.players.length - state.spiesCount;

    const chosenWord = wordManager.getRandomWord(innocentsCount);
    if (!chosenWord) {
      alert(`Не удалось найти слово длины ${innocentsCount}!`);
      return;
    }

    let roundAction = null;
    if (state.actionEnabled && window.actionPool) {
      const drawn = window.actionPool.drawAction();
      roundAction = drawn.action;
    }

    const letters = chosenWord.split('');
    shuffleArray(letters);

    const roles = [];
    for (let i = 0; i < innocentsCount; i++) {
      roles.push({ isSpy: false, letter: letters[i] });
    }
    for (let i = 0; i < state.spiesCount; i++) {
      roles.push({ isSpy: true, letter: null });
    }
    shuffleArray(roles);

    state.round.assigned = state.players.map((p, idx) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isSpy: roles[idx].isSpy,
      letter: roles[idx].letter,
      guess: ''
    }));

    state.round.word = chosenWord;
    state.round.action = roundAction;
    state.round.passIndex = 0;
    state.round.guessIndex = 0;
    state.round.cardFlipped = false;
    state.round.revealFlipped = false;

    setupPassScreen();
    showScreen(dom.screenPass);
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // =========================================================================
  // 9. РАЗДАЧА ДОСЬЕ (PASS & PLAY)
  // =========================================================================
  function setupPassScreen() {
    const curIdx = state.round.passIndex;
    const curPlayer = state.round.assigned[curIdx];

    dom.passPlayerBadge.innerHTML = `<span>${curPlayer.avatar}</span> <span>${escapeHtml(curPlayer.name)}</span>`;
    dom.passInstructionText.textContent = '👆 Нажмите на досье, чтобы раскрыть его';

    state.round.cardFlipped = false;
    dom.secretCard.classList.remove('flipped');
    dom.btnNextPlayer.disabled = true;
    dom.btnNextPlayer.style.opacity = '0.5';
    dom.btnNextPlayer.innerHTML = '<span>Сначала изучите досье</span>';

    if (curPlayer.isSpy) {
      dom.cardBack.className = 'card-side card-side-front spy-theme';
      dom.cardRoleBadge.className = 'card-role-title spy';
      dom.cardRoleBadge.textContent = 'ВРАЖЕСКИЙ ШПИОН';

      dom.cardPlayerContent.classList.add('hidden');
      dom.cardSpyContent.classList.remove('hidden');
      dom.cardActionBox.classList.add('hidden');
    } else {
      dom.cardBack.className = 'card-side card-side-front';
      dom.cardRoleBadge.className = 'card-role-title player';
      dom.cardRoleBadge.textContent = 'АГЕНТ СВЯЗИ';

      dom.cardPlayerContent.classList.remove('hidden');
      dom.cardSpyContent.classList.add('hidden');
      dom.cardLetterDisplay.textContent = curPlayer.letter;

      if (state.round.action) {
        dom.cardActionBox.classList.remove('hidden');
        dom.cardActionText.textContent = state.round.action.text;
        dom.cardActionHint.textContent = state.round.action.hint || 'Выполняйте его незаметно во время беседы.';
      } else {
        dom.cardActionBox.classList.add('hidden');
      }
    }
  }

  function flipSecretCard() {
    if (!state.round.cardFlipped) {
      sound.playFlip();
      state.round.cardFlipped = true;
      dom.secretCard.classList.add('flipped');

      dom.passInstructionText.textContent = 'Запомните данные и передайте телефон дальше';

      const isLast = state.round.passIndex === state.round.assigned.length - 1;
      dom.btnNextPlayer.disabled = false;
      dom.btnNextPlayer.style.opacity = '1';

      if (isLast) {
        dom.btnNextPlayer.innerHTML = '<span>ВСЕ ДОСЬЕ ИЗУЧЕНЫ ➔</span>';
      } else {
        const nextPlayer = state.round.assigned[state.round.passIndex + 1];
        dom.btnNextPlayer.innerHTML = `<span>Передать ${nextPlayer.avatar} ${escapeHtml(nextPlayer.name)} ➔</span>`;
      }
    }
  }

  function nextPlayerCard() {
    sound.playClick();
    const isLast = state.round.passIndex === state.round.assigned.length - 1;

    if (isLast) {
      // Все изучили досье -> СРАЗУ переходим к оперативному совещанию и таймеру
      startDiscussion();
    } else {
      dom.secretCard.classList.remove('flipped');
      setTimeout(() => {
        state.round.passIndex++;
        setupPassScreen();
      }, 250);
    }
  }

  // =========================================================================
  // 10. ОБСУЖДЕНИЕ И ЧИСТЫЙ КОЛЬЦЕВОЙ ТАЙМЕР
  // =========================================================================
  function startDiscussion() {
    showScreen(dom.screenDiscussion);

    state.timer.remaining = state.roundTimeSeconds;
    state.timer.isRunning = true;
    dom.timerStatusHint.textContent = 'НАЖМИТЕ ДЛЯ ПАУЗЫ';

    updateTimerDisplay();
    startTimerInterval();
  }

  function startTimerInterval() {
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = setInterval(() => {
      if (state.timer.isRunning && state.timer.remaining > 0) {
        state.timer.remaining--;
        updateTimerDisplay();

        if (state.timer.remaining <= 5 && state.timer.remaining > 0) {
          sound.playWarning();
        } else if (state.timer.remaining === 0) {
          clearInterval(state.timer.intervalId);
          sound.playAlarm();
          dom.timerStatusHint.textContent = 'ВРЕМЯ ВЫШЛО';
        }
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const mins = Math.floor(state.timer.remaining / 60);
    const secs = state.timer.remaining % 60;
    dom.timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Длина окружности 2 * PI * 120 ≈ 754
    const total = state.roundTimeSeconds || 1;
    const offset = 754 - (state.timer.remaining / total) * 754;
    dom.timerProgress.style.strokeDashoffset = offset;

    dom.timerProgress.classList.toggle('danger', state.timer.remaining <= 15);
  }

  function toggleTimer() {
    sound.playClick();
    if (state.timer.remaining === 0) return;

    state.timer.isRunning = !state.timer.isRunning;
    dom.timerStatusHint.textContent = state.timer.isRunning ? 'НАЖМИТЕ ДЛЯ ПАУЗЫ' : 'ПАУЗА • НАЖМИТЕ ДЛЯ СТАРТА';
  }

  function finishDiscussion() {
    sound.playClick();
    clearInterval(state.timer.intervalId);
    startGuessStage();
  }

  // =========================================================================
  // 11. ВВОД СЛОВ (РАСШИФРОВКА)
  // =========================================================================
  function startGuessStage() {
    state.round.guessIndex = 0;
    setupGuessScreen();
    showScreen(dom.screenGuess);
  }

  function setupGuessScreen() {
    const curIdx = state.round.guessIndex;
    const curPlayer = state.round.assigned[curIdx];
    const total = state.round.assigned.length;

    dom.guessPlayerBadge.innerHTML = `<span>${curPlayer.avatar}</span> <span>${escapeHtml(curPlayer.name)}</span>`;
    dom.guessPromptTitle.textContent = `${curPlayer.name}, введите слово:`;
    dom.guessInput.value = '';

    const isLast = curIdx === total - 1;
    dom.btnSubmitGuess.innerHTML = isLast
      ? '<span>🏁 ЗАВЕРШИТЬ И УЗНАТЬ ИТОГИ</span>'
      : `<span>ПОДТВЕРДИТЬ И ПЕРЕДАТЬ ДАЛЬШЕ ➔</span>`;

    setTimeout(() => dom.guessInput.focus(), 150);
  }

  function submitGuess() {
    sound.playClick();
    const rawWord = dom.guessInput.value.trim().toUpperCase();
    if (!rawWord) {
      alert('Пожалуйста, введите слово!');
      dom.guessInput.focus();
      return;
    }

    const curPlayer = state.round.assigned[state.round.guessIndex];
    curPlayer.guess = rawWord;

    const isLast = state.round.guessIndex === state.round.assigned.length - 1;
    if (isLast) {
      startRevealStage();
    } else {
      state.round.guessIndex++;
      setupGuessScreen();
    }
  }

  // =========================================================================
  // 12. ФИНАЛЬНЫЙ РАСКЛАД И ИТОГИ МИССИИ
  // =========================================================================
  function startRevealStage() {
    state.round.revealFlipped = false;
    dom.revealCard.classList.remove('flipped');
    dom.winnerBannerWrap.classList.add('hidden');

    dom.finalSecretWord.textContent = state.round.word.split('').join(' ');

    if (state.round.action) {
      dom.finalActionContainer.classList.remove('hidden');
      dom.finalSecretAction.textContent = state.round.action.text;
    } else {
      dom.finalActionContainer.classList.add('hidden');
    }

    showScreen(dom.screenReveal);
  }

  function flipRevealCard() {
    if (!state.round.revealFlipped) {
      sound.playFlip();
      state.round.revealFlipped = true;
      dom.revealCard.classList.add('flipped');

      calculateAndDisplayResults();
      dom.winnerBannerWrap.classList.remove('hidden');
    }
  }

  function calculateAndDisplayResults() {
    const secretWord = state.round.word;
    const players = state.round.assigned;

    let spiesGuessed = [];
    let innocentsGuessed = [];
    let innocentsWrong = [];

    players.forEach(p => {
      const isCorrect = p.guess.trim().toUpperCase() === secretWord;
      if (p.isSpy) {
        if (isCorrect) spiesGuessed.push(p);
      } else {
        if (isCorrect) innocentsGuessed.push(p);
        else innocentsWrong.push(p);
      }
    });

    let spiesWon = false;
    let reasonText = '';

    if (state.spyGuessWin && spiesGuessed.length > 0) {
      spiesWon = true;
      const spyNames = spiesGuessed.map(s => `${s.avatar} ${s.name}`).join(', ');
      reasonText = `Шпион (${spyNames}) успешно вычислил кодовое слово «${secretWord}»!`;
    } else if (innocentsWrong.length > innocentsGuessed.length || innocentsGuessed.length === 0) {
      spiesWon = true;
      reasonText = `Шпионам удалось запутать агентурную сеть. Кодовое слово не было составлено!`;
    } else {
      spiesWon = false;
      if (spiesGuessed.length > 0 && !state.spyGuessWin) {
        reasonText = `Агенты связи составили слово «${secretWord}»! (Шпион тоже угадал, но победа шпиона при расшифровке отключена в настройках).`;
      } else {
        reasonText = `Агенты связи успешно составили кодовое слово «${secretWord}», а шпионы не смогли сорвать операцию!`;
      }
    }

    if (spiesWon) {
      sound.playSpyWin();
      dom.winnerBanner.style.borderColor = '#ef4444';
      dom.winnerTitle.style.color = '#f87171';
      dom.winnerTitle.textContent = '🕵️ ПОБЕДИЛИ ШПИОНЫ!';
    } else {
      sound.playVictory();
      dom.winnerBanner.style.borderColor = '#22c55e';
      dom.winnerTitle.style.color = '#4ade80';
      dom.winnerTitle.textContent = '🏆 ПОБЕДИЛИ АГЕНТЫ СВЯЗИ!';
    }

    dom.winnerReason.textContent = reasonText;

    // Отрисовка досье участников
    dom.resultsList.innerHTML = '';
    players.forEach(p => {
      const isCorrect = p.guess.trim().toUpperCase() === secretWord;
      const row = document.createElement('div');
      row.className = 'voting-player-card';

      const roleBadge = p.isSpy
        ? '<strong style="color: #f87171;">ВРАЖЕСКИЙ ШПИОН 🕵️</strong>'
        : `Шифробуква «<strong>${p.letter}</strong>»`;

      row.innerHTML = `
        <div class="voting-player-left">
          <div class="voting-player-avatar">${p.avatar}</div>
          <div>
            <div class="voting-player-name">${escapeHtml(p.name)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${roleBadge}</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 800; font-size: 1rem; color: #fff;">${escapeHtml(p.guess || '—')}</div>
          <div style="font-size: 0.78rem; font-weight: 700; color: ${isCorrect ? '#4ade80' : '#f87171'};">
            ${isCorrect ? 'ВЕРНО ✓' : 'НЕВЕРНО ✗'}
          </div>
        </div>
      `;

      dom.resultsList.appendChild(row);
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }

  // =========================================================================
  // 13. МОДАЛЬНЫЕ ОКНА
  // =========================================================================
  function openModal(modal) {
    sound.playClick();
    modal.classList.add('active');
  }

  function closeModal(modal) {
    sound.playClick();
    modal.classList.remove('active');
  }

  // =========================================================================
  // 14. СЛУШАТЕЛИ СОБЫТИЙ
  // =========================================================================
  function initEventListeners() {
    dom.btnSound.addEventListener('click', () => {
      const active = sound.toggle();
      dom.btnSound.textContent = active ? '🔊' : '🔇';
    });
    dom.btnSound.textContent = sound.enabled ? '🔊' : '🔇';

    dom.btnRules.addEventListener('click', () => openModal(dom.modalRules));
    dom.cardRulesBtn.addEventListener('click', () => openModal(dom.modalRules));
    dom.btnRulesDiscussion.addEventListener('click', () => openModal(dom.modalRules));

    dom.btnDictModal.addEventListener('click', () => openModal(dom.modalDict));

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-overlay');
        if (modal) closeModal(modal);
      });
    });

    // Управление количеством шпионов со степперами и модалкой
    dom.btnSpiesMinus.addEventListener('click', (e) => {
      e.stopPropagation();
      changeSpiesCount(-1);
    });
    dom.btnSpiesPlus.addEventListener('click', (e) => {
      e.stopPropagation();
      changeSpiesCount(1);
    });
    dom.valSpies.addEventListener('click', openSpiesModal);
    dom.btnSpiesCustom.addEventListener('click', openSpiesModal);

    // Модалка шпионов
    dom.btnModalSpyMinus.addEventListener('click', () => {
      sound.playClick();
      const val = parseInt(dom.inputModalSpies.value, 10) || 1;
      if (val > 1) dom.inputModalSpies.value = val - 1;
    });
    dom.btnModalSpyPlus.addEventListener('click', () => {
      sound.playClick();
      const val = parseInt(dom.inputModalSpies.value, 10) || 1;
      const max = getMaxSpies();
      if (val < max) dom.inputModalSpies.value = val + 1;
      else alert(`Максимум ${max} шпионов для ${state.players.length} оперативников!`);
    });
    dom.btnSaveSpiesCount.addEventListener('click', saveSpiesFromModal);

    // Время раунда
    dom.cardRoundBtn.addEventListener('click', () => openModal(dom.modalRoundPicker));
    document.querySelectorAll('.btn-pick-time').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        state.roundTimeSeconds = parseInt(btn.getAttribute('data-time'), 10);
        document.querySelectorAll('.btn-pick-time').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateSetupLabels();
        closeModal(dom.modalRoundPicker);
      });
    });

    // Тумблеры
    dom.toggleAction.addEventListener('change', () => {
      sound.playClick();
      state.actionEnabled = dom.toggleAction.checked;
    });

    dom.toggleSpyGuessWin.checked = state.spyGuessWin;
    dom.toggleSpyGuessWin.addEventListener('change', () => {
      sound.playClick();
      state.spyGuessWin = dom.toggleSpyGuessWin.checked;
      localStorage.setItem('spy_guess_win', state.spyGuessWin);
    });

    // Добавление оперативника
    dom.btnConfirmAddPlayer.addEventListener('click', confirmAddPlayer);
    dom.inputNewPlayerName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmAddPlayer();
    });

    // Жизненный цикл операции
    dom.btnStartGame.addEventListener('click', startNewRound);
    dom.btnCancelGame.addEventListener('click', () => {
      sound.playClick();
      if (confirm('Прервать операцию и вернуться в штаб?')) showScreen(dom.screenSetup);
    });

    dom.cardScene.addEventListener('click', flipSecretCard);
    dom.btnNextPlayer.addEventListener('click', nextPlayerCard);

    // Экран обсуждения: нажатие на таймер переключает паузу
    dom.btnCancelDiscussion.addEventListener('click', () => {
      sound.playClick();
      if (confirm('Завершить совещание и вернуться в штаб?')) {
        clearInterval(state.timer.intervalId);
        showScreen(dom.screenSetup);
      }
    });

    dom.ringTimerClickable.addEventListener('click', toggleTimer);

    dom.btnShowPlayersModal.addEventListener('click', () => {
      sound.playClick();
      const list = state.players.map(p => `${p.avatar} ${p.name}`).join('\n');
      alert(`🛡️ ОПЕРАТИВНИКИ В СЕТИ (${state.players.length}):\n\n${list}`);
    });

    dom.btnFinishDiscussion.addEventListener('click', finishDiscussion);

    // Ввод ответов
    dom.btnSubmitGuess.addEventListener('click', submitGuess);
    dom.guessInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitGuess();
    });

    // Финал
    dom.revealScene.addEventListener('click', flipRevealCard);
    dom.btnPlayAgain.addEventListener('click', startNewRound);
    dom.btnBackToSetup.addEventListener('click', () => {
      sound.playClick();
      showScreen(dom.screenSetup);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    renderPlayersChips();
  });

})();
