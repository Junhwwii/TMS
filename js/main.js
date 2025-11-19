// TMS Time Boxing 스크립트 (DIY 확장 버전)
// - 하루 24시간을 10분 단위로 잘라 144개의 박스를 생성
// - 사용자(닉네임) + 날짜별로 계획을 localStorage에 저장
// - 개별 칸 클릭 / 범위 입력 가능
// - 카테고리 직접 생성 + 색상 설정
// - 우측 상단 명언, 달력
// - "오늘의 할 일" 메모: 사용자 + 날짜별로 저장

document.addEventListener("DOMContentLoaded", function () {
  // ===== DOM 요소 가져오기 =====
  const grid = document.getElementById("timeboxing-grid");

  // 사용자
  const userNameInput = document.getElementById("user-name-input");
  const userApplyBtn = document.getElementById("user-apply-btn");
  const currentUserLabel = document.getElementById("current-user-label");

  // 날짜 (숨김 input)
  const planDateInput = document.getElementById("plan-date-input");
  const goTodayBtn = document.getElementById("go-today-btn");
  const resetDayBtn = document.getElementById("reset-day-btn");

  // 범위 입력
  const startHourSelect = document.getElementById("start-hour-select");
  const startMinuteSelect = document.getElementById("start-minute-select");
  const endHourSelect = document.getElementById("end-hour-select");
  const endMinuteSelect = document.getElementById("end-minute-select");
  const rangeTaskInput = document.getElementById("range-task-input");
  const taskCategorySelect = document.getElementById("task-category-select");
  const applyRangeBtn = document.getElementById("apply-range-btn");

  // 명언 + 달력
  const quoteEn = document.getElementById("quote-en");
  const quoteKr = document.getElementById("quote-kr");
  const motivationTextEl = document.getElementById("motivation-text");
  const calendarTitleEl = document.getElementById("calendar-title");
  const calendarBodyEl = document.getElementById("calendar-body");
  const calendarPrevBtn = document.getElementById("calendar-prev-btn");
  const calendarNextBtn = document.getElementById("calendar-next-btn");

  // 오늘의 할 일
  const todayTodoInput = document.getElementById("today-todo-input");

  // DIY 카테고리
  const newCategoryNameInput = document.getElementById("new-category-name");
  const newCategoryColorInput = document.getElementById("new-category-color");
  const addCategoryBtn = document.getElementById("add-category-btn");
  const categoryListEl = document.getElementById("category-list");
  // 디자인 설정
  const fontSelect = document.getElementById("font-select");
  const themeSelect = document.getElementById("theme-select");

  // 오늘 하루 평점
  const ratingStarsContainer = document.getElementById("daily-rating-stars");
  const ratingTextEl = document.getElementById("daily-rating-text");

  // 오늘 하루 회고 / 내일 목표
  const dailyReflectionInput = document.getElementById("daily-reflection");
  const dailyTomorrowGoalInput = document.getElementById("daily-tomorrow-goal");


  if (!grid) {
    console.error("timeboxing-grid 요소를 찾을 수 없습니다.");
    return;
  }

  // ===== 상수 =====
  const HOURS = 24;
  const SLOTS_PER_HOUR = 6;
  const STORAGE_KEY = "tmsData_v1";

  const slotMap = {};

  // 달력 상태
  let calendarYear;
  let calendarMonth; // 0~11

  // 명언들
  const MOTIVATION_QUOTES = [
  {
    en: "The future depends on what you do today.",
    kr: "오늘 당신이 무엇을 하느냐가 미래를 결정한다."
  },
  {
    en: "Small daily improvements lead to stunning results.",
    kr: "매일의 작은 개선이 놀라운 결과를 만든다."
  },
  {
    en: "Time is a created thing. Saying 'I don't have time' means 'I don't want to.'",
    kr: "시간은 만들어내는 것이다. ‘시간이 없다’는 말은 곧 ‘하고 싶지 않다’는 뜻이다."
  },
  {
    en: "Focus on being productive, not busy.",
    kr: "바빠 보이는 것이 아니라 생산적인 사람이 되어라."
  },
  {
    en: "A little progress each day adds up to big results.",
    kr: "매일의 작은 진전이 큰 결과를 만든다."
  }
  ];


  // ===== localStorage 데이터 =====
  function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
            return {
        currentUser: "guest",
        users: {
          guest: {
            plans: {}
          }
        },
        categories: null,
        dailyTodos: {},
        dailyRatings: {},
        dailyReviews: {},
        ui: {
          font: "system",
          theme: "light"
        }
      };

    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.users) parsed.users = {};
      if (!parsed.currentUser) parsed.currentUser = "guest";
      if (!parsed.users[parsed.currentUser]) {
        parsed.users[parsed.currentUser] = { plans: {} };
      }
      if (!parsed.categories) parsed.categories = null;
      if (!parsed.dailyTodos) parsed.dailyTodos = {};
      if (!parsed.dailyRatings) parsed.dailyRatings = {};
      if (!parsed.dailyReviews) parsed.dailyReviews = {};
      if (!parsed.ui) {
         parsed.ui = { font: "system", theme: "light" };
       }
      return parsed;
    } catch (e) {
      console.error("저장된 데이터를 파싱하는 중 오류 발생. 초기화합니다.", e);
            return {
        currentUser: "guest",
        users: {
          guest: { plans: {} }
        },
        categories: null,
        dailyTodos: {},
        dailyRatings: {},
        dailyReviews: {},
        ui: {
          font: "system",
          theme: "light"
        }
      };

    }
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tmsData));
  }

  let tmsData = loadData();

  // ===== 기본 카테고리 보장 =====
  function ensureCategories() {
    if (!tmsData.categories) {
      tmsData.categories = {
        default: { label: "기본", color: "#4a90e2" },
        study: { label: "공부", color: "#4caf50" },
        work: { label: "업무/프로젝트", color: "#2196f3" },
        exercise: { label: "운동", color: "#ff9800" },
        rest: { label: "휴식", color: "#9c27b0" },
        etc: { label: "기타", color: "#607d8b" }
      };
    }
  }
  ensureCategories();

    // ===== 폰트 / 테마 설정 =====
  const FONT_MAP = {
    system:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    rounded:
      '"Malgun Gothic", "Apple SD Gothic Neo", system-ui, -apple-system, sans-serif',
    serif:
      '"Georgia", "Times New Roman", serif',
    mono:
      '"Consolas", "Courier New", "Courier", monospace',
    casual:
      '"Trebuchet MS", "Verdana", system-ui, sans-serif'
  };

  function applyFontSetting(fontKey) {
    const fontValue = FONT_MAP[fontKey] || FONT_MAP.system;
    document.body.style.fontFamily = fontValue;
  }

  function applyThemeSetting(themeKey) {
    const header = document.querySelector(".main-header");

    let bg = "#f7f7f7";
    let text = "#333";
    let headerBg = "#4a90e2";

    switch (themeKey) {
      case "red":
        bg = "#ffe8ec";
        headerBg = "#f06277";
        break;
      case "orange":
        bg = "#fff3e0";
        headerBg = "#ffb74d";
        break;
      case "yellow":
        bg = "#fffde7";
        headerBg = "#fff176";
        break;
      case "green":
        bg = "#e8f5e9";
        headerBg = "#81c784";
        break;
      case "blue":
        bg = "#e3f2fd";
        headerBg = "#64b5f6";
        break;
      case "purple":
        bg = "#f3e5f5";
        headerBg = "#ba68c8";
        break;
      case "gray":
        bg = "#f0f0f0";
        headerBg = "#757575";
        break;
      case "dark":
        bg = "#222222";
        text = "#eeeeee";
        headerBg = "#333333";
        break;
      case "light":
      default:
        bg = "#f7f7f7";
        text = "#333333";
        headerBg = "#4a90e2";
        break;
    }

    document.body.style.backgroundColor = bg;
    document.body.style.color = text;

    if (header) {
      header.style.backgroundColor = headerBg;
      header.style.color = "#ffffff";
    }
  }

  function applyUISettingsFromData() {
    if (!tmsData.ui) {
      tmsData.ui = { font: "system", theme: "light" };
    }
    applyFontSetting(tmsData.ui.font);
    applyThemeSetting(tmsData.ui.theme);

    if (fontSelect) fontSelect.value = tmsData.ui.font;
    if (themeSelect) themeSelect.value = tmsData.ui.theme;
  }
  

  // ===== 유저 / 계획 / 오늘의 할 일 유틸 =====
  function ensureUser(userName) {
    if (!tmsData.users[userName]) {
      tmsData.users[userName] = { plans: {} };
    }
  }

  function getCurrentUser() {
    return tmsData.currentUser;
  }

  function setCurrentUser(userName) {
    const trimmed = userName.trim() || "guest";
    ensureUser(trimmed);
    tmsData.currentUser = trimmed;
    saveData();
    updateUserUI();
    renderPlanForCurrentUserAndDate();
    renderTodayTodoForCurrentUserAndDate();
    renderDailyRatingForCurrentUserAndDate();
    renderDailyReviewForCurrentUserAndDate();
  }

  function getCurrentDateString() {
    return planDateInput.value;
  }

  function ensurePlan(userName, dateString) {
    ensureUser(userName);
    const user = tmsData.users[userName];
    if (!user.plans[dateString]) {
      user.plans[dateString] = {};
    }
    return user.plans[dateString];
  }

  function getPlan(userName, dateString) {
    ensureUser(userName);
    const user = tmsData.users[userName];
    return user.plans[dateString] || {};
  }

  function clearPlan(userName, dateString) {
    ensureUser(userName);
    tmsData.users[userName].plans[dateString] = {};
    saveData();
  }

  function formatTodayDateString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function getPreviousDateString(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;

    d.setDate(d.getDate() - 1);

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }


  function slotId(hour, slot) {
    return `${hour}-${slot}`;
  }

  // 오늘의 할 일
  function ensureDailyTodosRoot() {
    if (!tmsData.dailyTodos) tmsData.dailyTodos = {};
  }

  function getDailyTodo(user, dateStr) {
    ensureDailyTodosRoot();
    const userTodos = tmsData.dailyTodos[user] || {};
    return userTodos[dateStr] || "";
  }

  function setDailyTodo(user, dateStr, text) {
    ensureDailyTodosRoot();
    if (!tmsData.dailyTodos[user]) tmsData.dailyTodos[user] = {};
    if (!dateStr) return;

    if (!text || text.trim() === "") {
      delete tmsData.dailyTodos[user][dateStr];
    } else {
      tmsData.dailyTodos[user][dateStr] = text;
    }
    saveData();
  }

  // 오늘 하루 평점
  function ensureDailyRatingsRoot() {
    if (!tmsData.dailyRatings) tmsData.dailyRatings = {};
  }

  function getDailyRating(user, dateStr) {
    ensureDailyRatingsRoot();
    const userRatings = tmsData.dailyRatings[user] || {};
    return userRatings[dateStr] ?? null;
  }

  function setDailyRating(user, dateStr, score) {
    ensureDailyRatingsRoot();
    if (!tmsData.dailyRatings[user]) tmsData.dailyRatings[user] = {};
    if (!dateStr) return;

    if (score === null || isNaN(score)) {
      delete tmsData.dailyRatings[user][dateStr];
    } else {
      tmsData.dailyRatings[user][dateStr] = score;
    }
    saveData();
  }

  // 오늘 하루 회고 / 내일 목표
  function ensureDailyReviewsRoot() {
    if (!tmsData.dailyReviews) tmsData.dailyReviews = {};
  }

  function getDailyReview(user, dateStr) {
    ensureDailyReviewsRoot();
    const userReviews = tmsData.dailyReviews[user] || {};
    return userReviews[dateStr] || { reflection: "", tomorrowGoal: "" };
  }

  function setDailyReview(user, dateStr, reflection, tomorrowGoal) {
    ensureDailyReviewsRoot();
    if (!tmsData.dailyReviews[user]) tmsData.dailyReviews[user] = {};
    if (!dateStr) return;

    const trimmedReflection = (reflection || "").trim();
    const trimmedTomorrow = (tomorrowGoal || "").trim();

    if (!trimmedReflection && !trimmedTomorrow) {
      // 둘 다 비어 있으면 기록 삭제
      delete tmsData.dailyReviews[user][dateStr];
    } else {
      tmsData.dailyReviews[user][dateStr] = {
        reflection: trimmedReflection,
        tomorrowGoal: trimmedTomorrow
      };
    }
    saveData();
  }



  // ===== 카테고리 관련 =====
  function applySlotVisual(box, text, categoryKey) {
    box.classList.remove("filled");
    box.style.backgroundColor = "";
    box.style.borderColor = "";

    if (!text || text.trim() === "") {
      box.textContent = "";
      return;
    }

    box.textContent = text;
    box.classList.add("filled");

    ensureCategories();
    let cat = tmsData.categories[categoryKey];
    if (!cat) cat = tmsData.categories["default"];

    box.style.backgroundColor = cat.color;
    box.style.borderColor = cat.color;
  }

  function refreshCategorySelect() {
    if (!taskCategorySelect) return;
    taskCategorySelect.innerHTML = "";
    ensureCategories();
    Object.entries(tmsData.categories).forEach(([key, cat]) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = cat.label;
      taskCategorySelect.appendChild(opt);
    });
  }

  function renderCategoryList() {
    if (!categoryListEl) return;
    categoryListEl.innerHTML = "";
    ensureCategories();

    Object.entries(tmsData.categories).forEach(([key, cat]) => {
      const li = document.createElement("li");
      li.classList.add("category-pill");

      const colorDot = document.createElement("span");
      colorDot.classList.add("color-dot");
      colorDot.style.backgroundColor = cat.color;

      const nameSpan = document.createElement("span");
      nameSpan.classList.add("category-name");
      nameSpan.textContent = cat.label;

      const idSpan = document.createElement("span");
      idSpan.classList.add("category-id");
      idSpan.textContent = `(${key})`;

      li.appendChild(colorDot);
      li.appendChild(nameSpan);
      li.appendChild(idSpan);

      if (!["default", "study", "work", "exercise", "rest", "etc"].includes(key)) {
        const delBtn = document.createElement("button");
        delBtn.classList.add("category-delete-btn");
        delBtn.textContent = "삭제";
        delBtn.addEventListener("click", function () {
          const ok = confirm(
            `"${cat.label}" 카테고리를 삭제할까요?\n이미 사용 중인 칸은 기본 색으로 표시됩니다.`
          );
          if (!ok) return;
          delete tmsData.categories[key];
          saveData();
          refreshCategorySelect();
          renderCategoryList();
          renderPlanForCurrentUserAndDate();
        });
        li.appendChild(delBtn);
      }

      categoryListEl.appendChild(li);
    });
  }

  // ===== 시간 선택 셀렉트 박스 초기화 =====
  function initTimeSelects() {
    for (let h = 0; h < HOURS; h++) {
      const label = h.toString().padStart(2, "0");
      const opt1 = new Option(label, h);
      const opt2 = new Option(label, h);
      startHourSelect.add(opt1);
      endHourSelect.add(opt2);
    }
    for (let s = 0; s < SLOTS_PER_HOUR; s++) {
      const minute = s * 10;
      const label = minute.toString().padStart(2, "0");
      const opt1 = new Option(label, minute);
      const opt2 = new Option(label, minute);
      startMinuteSelect.add(opt1);
      endMinuteSelect.add(opt2);
    }

    startHourSelect.value = "9";
    startMinuteSelect.value = "0";
    endHourSelect.value = "12";
    endMinuteSelect.value = "0";
  }

  // ===== 그리드 생성 =====
  function createGrid() {
    for (let hour = 0; hour < HOURS; hour++) {
      const row = document.createElement("div");
      row.classList.add("timeboxing-row");

      const hourLabel = document.createElement("div");
      hourLabel.classList.add("timeboxing-hour-label");
      hourLabel.textContent = hour.toString().padStart(2, "0") + ":00";
      row.appendChild(hourLabel);

      const slotsContainer = document.createElement("div");
      slotsContainer.classList.add("timeboxing-slots");

      for (let slot = 0; slot < SLOTS_PER_HOUR; slot++) {
        const box = document.createElement("button");
        box.classList.add("time-slot");

        box.dataset.hour = hour;
        box.dataset.slot = slot;

        const minute = slot * 10;
        const label =
          hour.toString().padStart(2, "0") +
          ":" +
          minute.toString().padStart(2, "0");
        box.title = label;

        const id = slotId(hour, slot);
        slotMap[id] = box;

        box.addEventListener("click", function () {
          const user = getCurrentUser();
          const dateStr = getCurrentDateString();
          if (!dateStr) {
            alert("먼저 날짜를 선택해 주세요.");
            return;
          }

          const plan = ensurePlan(user, dateStr);
          const current = plan[id] || { text: "", category: "default" };

          const newText = prompt(
            `${label} 시간대에 할 일을 입력하세요.\n(비워두고 확인을 누르면 삭제됩니다.)`,
            current.text || ""
          );
          if (newText === null) return;

          const trimmed = newText.trim();
          if (trimmed === "") {
            delete plan[id];
            applySlotVisual(box, "", "default");
          } else {
            const category = current.category || "default";
            plan[id] = { text: trimmed, category: category };
            applySlotVisual(box, trimmed, category);
          }
          saveData();
        });

        slotsContainer.appendChild(box);
      }

      row.appendChild(slotsContainer);
      grid.appendChild(row);
    }
  }

  // ===== 렌더링 =====
  function renderPlanForCurrentUserAndDate() {
    const user = getCurrentUser();
    const dateStr = getCurrentDateString();
    if (!dateStr) return;

    const plan = getPlan(user, dateStr);

    for (let hour = 0; hour < HOURS; hour++) {
      for (let slot = 0; slot < SLOTS_PER_HOUR; slot++) {
        const id = slotId(hour, slot);
        const box = slotMap[id];
        const data = plan[id];
        if (!box) continue;

        if (!data) {
          applySlotVisual(box, "", "default");
        } else {
          applySlotVisual(box, data.text, data.category);
        }
      }
    }
  }

  function updateUserUI() {
    const user = getCurrentUser();
    currentUserLabel.textContent = user;
    userNameInput.value = user;
  }

  function initDate() {
    if (!planDateInput.value) {
      planDateInput.value = formatTodayDateString();
    }
  }

  function renderTodayTodoForCurrentUserAndDate() {
    if (!todayTodoInput) return;
    const user = getCurrentUser();
    const dateStr = getCurrentDateString();
    if (!dateStr) {
      todayTodoInput.value = "";
      todayTodoInput.placeholder = "먼저 날짜를 선택해 주세요.";
      return;
    }
    const text = getDailyTodo(user, dateStr);
    todayTodoInput.value = text;

    // 오늘의 할 일이 비어 있다면, 어제의 '내일 목표'를 자동으로 가져오기
    if (!text || text.trim() === "") {
      autoFillTodayTodoFromYesterdayGoal();
    }
  }


  // 어제의 '내일 목표'를 오늘의 할 일에 자동 반영
  function autoFillTodayTodoFromYesterdayGoal() {
    if (!todayTodoInput) return;

    const user = getCurrentUser();
    const dateStr = getCurrentDateString();
    if (!dateStr) return;

    const currentTodo = getDailyTodo(user, dateStr);
    // 이미 오늘의 할 일이 있으면 건드리지 않음
    if (currentTodo && currentTodo.trim() !== "") return;

    const prevDateStr = getPreviousDateString(dateStr);
    if (!prevDateStr) return;

    const prevReview = getDailyReview(user, prevDateStr);
    const goal = (prevReview && prevReview.tomorrowGoal) || "";
    if (!goal || goal.trim() === "") return;

    // 어제의 '내일 목표'를 오늘의 할 일로 채움
    todayTodoInput.value = goal;
    setDailyTodo(user, dateStr, goal);
  }

  // 오늘 하루 평점 렌더링
  function renderDailyRatingForCurrentUserAndDate() {
    if (!ratingStarsContainer) return;
    const user = getCurrentUser();
    const dateStr = getCurrentDateString();

    const stars = ratingStarsContainer.querySelectorAll(".rating-star");

    if (!dateStr) {
      // 날짜가 없으면 별 비우고 텍스트도 초기화
      stars.forEach((star) => star.classList.remove("filled"));
      if (ratingTextEl) {
        ratingTextEl.textContent = "먼저 날짜를 선택해 주세요.";
      }
      return;
    }

    const score = getDailyRating(user, dateStr);

    let filledCount = 0;
    if (typeof score === "number") {
      // 0~10 점수를 0~5개의 별로 매핑 (반올림)
      filledCount = Math.round(score / 2);
      if (filledCount < 0) filledCount = 0;
      if (filledCount > 5) filledCount = 5;
    }

    stars.forEach((star) => {
      const starIndex = parseInt(star.dataset.star, 10);
      if (starIndex <= filledCount) {
        star.classList.add("filled");
      } else {
        star.classList.remove("filled");
      }
    });

    if (ratingTextEl) {
      if (typeof score === "number") {
        ratingTextEl.textContent = `오늘 점수: ${score.toFixed(1)} / 10`;
      } else {
        ratingTextEl.textContent = "아직 오늘 점수를 남기지 않았어요.";
      }
    }
  }


  // 오늘 하루 회고 / 내일 목표 렌더링
  function renderDailyReviewForCurrentUserAndDate() {
    if (!dailyReflectionInput || !dailyTomorrowGoalInput) return;

    const user = getCurrentUser();
    const dateStr = getCurrentDateString();

    if (!dateStr) {
      dailyReflectionInput.value = "";
      dailyReflectionInput.placeholder = "먼저 날짜를 선택해 주세요.";
      dailyTomorrowGoalInput.value = "";
      dailyTomorrowGoalInput.placeholder = "먼저 날짜를 선택해 주세요.";
      return;
    }

    const review = getDailyReview(user, dateStr);
    dailyReflectionInput.value = review.reflection || "";
    dailyTomorrowGoalInput.value = review.tomorrowGoal || "";
  }


  // ===== 명언 =====
  function initMotivation() {
  if (!quoteEn || !quoteKr) return;

  const today = new Date();
  const dayIndex = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
  const index = dayIndex % MOTIVATION_QUOTES.length;

  quoteEn.textContent = MOTIVATION_QUOTES[index].en;
  quoteKr.textContent = MOTIVATION_QUOTES[index].kr;
  }


  // ===== 달력 =====
  function initCalendar() {
    const baseDateStr = getCurrentDateString() || formatTodayDateString();
    const baseDate = new Date(baseDateStr);
    if (isNaN(baseDate.getTime())) {
      const today = new Date();
      calendarYear = today.getFullYear();
      calendarMonth = today.getMonth();
    } else {
      calendarYear = baseDate.getFullYear();
      calendarMonth = baseDate.getMonth();
    }
    renderCalendar();
  }

  function renderCalendar() {
    if (!calendarTitleEl || !calendarBodyEl) return;

    const year = calendarYear;
    const month = calendarMonth;

    calendarTitleEl.textContent =
      `${year}년 ${String(month + 1).padStart(2, "0")}월`;

    calendarBodyEl.innerHTML = "";

    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let day = 1;
    const selectedDateStr = getCurrentDateString();
    const todayStr = formatTodayDateString();

    for (let rowIndex = 0; rowIndex < 6; rowIndex++) {
      const tr = document.createElement("tr");
      for (let col = 0; col < 7; col++) {
        const td = document.createElement("td");
        const span = document.createElement("div");
        span.classList.add("calendar-day");

        if (rowIndex === 0 && col < startWeekday) {
          span.classList.add("empty");
        } else if (day > daysInMonth) {
          span.classList.add("empty");
        } else {
          const dateStr =
            `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          span.textContent = day;

          if (dateStr === todayStr) span.classList.add("today");
          if (dateStr === selectedDateStr) span.classList.add("selected");

          span.dataset.date = dateStr;
          span.addEventListener("click", function () {
            planDateInput.value = dateStr;
            renderPlanForCurrentUserAndDate();
            renderTodayTodoForCurrentUserAndDate();

            const d = new Date(dateStr);
            calendarYear = d.getFullYear();
            calendarMonth = d.getMonth();
            renderCalendar();
          });

          day++;
        }

        td.appendChild(span);
        tr.appendChild(td);
      }
      calendarBodyEl.appendChild(tr);
    }
  }

  // ===== 이벤트 핸들러 =====
  userApplyBtn.addEventListener("click", function () {
    setCurrentUser(userNameInput.value);
  });

  goTodayBtn.addEventListener("click", function () {
    const todayStr = formatTodayDateString();
    planDateInput.value = todayStr;
    renderPlanForCurrentUserAndDate();
    renderTodayTodoForCurrentUserAndDate();
    renderDailyRatingForCurrentUserAndDate();
    renderDailyReviewForCurrentUserAndDate();

    const d = new Date(todayStr);
    calendarYear = d.getFullYear();
    calendarMonth = d.getMonth();
    renderCalendar();
  });

  resetDayBtn.addEventListener("click", function () {
    const user = getCurrentUser();
    const dateStr = getCurrentDateString();
    if (!dateStr) {
      alert("먼저 날짜를 선택해 주세요.");
      return;
    }
    const ok = confirm(
      `${user} 사용자의 ${dateStr} 계획, '오늘의 할 일', 하루 평점, 회고 및 내일 목표를 모두 삭제하시겠습니까?`
    );
    if (!ok) return;

    clearPlan(user, dateStr);
    setDailyTodo(user, dateStr, "");
    setDailyRating(user, dateStr, null);
    setDailyReview(user, dateStr, "", "");
    renderPlanForCurrentUserAndDate();
    renderTodayTodoForCurrentUserAndDate();
    renderDailyRatingForCurrentUserAndDate();
    renderDailyReviewForCurrentUserAndDate();
  });



  planDateInput.addEventListener("change", function () {
    renderPlanForCurrentUserAndDate();
    renderTodayTodoForCurrentUserAndDate();
    renderDailyRatingForCurrentUserAndDate();
    renderDailyReviewForCurrentUserAndDate();

    const d = new Date(this.value);
    if (!isNaN(d.getTime())) {
      calendarYear = d.getFullYear();
      calendarMonth = d.getMonth();
      renderCalendar();
    }
  });

  applyRangeBtn.addEventListener("click", function () {
    const user = getCurrentUser();
    const dateStr = getCurrentDateString();
    if (!dateStr) {
      alert("먼저 날짜를 선택해 주세요.");
      return;
    }

    const taskText = rangeTaskInput.value.trim();
    if (taskText === "") {
      alert("할 일 내용을 입력해 주세요.");
      return;
    }

    const category = taskCategorySelect.value || "default";

    const sh = parseInt(startHourSelect.value, 10);
    const sm = parseInt(startMinuteSelect.value, 10);
    const eh = parseInt(endHourSelect.value, 10);
    const em = parseInt(endMinuteSelect.value, 10);

    const startIndex = sh * SLOTS_PER_HOUR + sm / 10;
    const endIndex = eh * SLOTS_PER_HOUR + em / 10;

    let from = startIndex;
    let to = endIndex;
    if (to < from) [from, to] = [to, from];

    const plan = ensurePlan(user, dateStr);

    for (let idx = from; idx <= to; idx++) {
      const hour = Math.floor(idx / SLOTS_PER_HOUR);
      const slot = idx % SLOTS_PER_HOUR;
      const id = slotId(hour, slot);
      const box = slotMap[id];
      if (!box) continue;

      plan[id] = { text: taskText, category: category };
    }

    saveData();
    renderPlanForCurrentUserAndDate();
  });

    // 오늘 하루 평점 - 별 클릭 이벤트
  if (ratingStarsContainer) {
    ratingStarsContainer.addEventListener("click", function (event) {
      const target = event.target;
      if (!target.classList.contains("rating-star")) return;

      const user = getCurrentUser();
      const dateStr = getCurrentDateString();
      if (!dateStr) {
        alert("먼저 날짜를 선택해 주세요.");
        return;
      }

      const currentScore = getDailyRating(user, dateStr);
      const input = prompt(
        "오늘 하루 점수를 0~10 사이의 숫자로 입력해 주세요.\n소수점도 입력할 수 있습니다.",
        typeof currentScore === "number" ? String(currentScore) : ""
      );
      if (input === null) return;

      const score = parseFloat(input);
      if (isNaN(score) || score < 0 || score > 10) {
        alert("0 이상 10 이하의 숫자를 입력해 주세요.");
        return;
      }

      setDailyRating(user, dateStr, score);
      renderDailyRatingForCurrentUserAndDate();
    });
  }


  // 카테고리 추가
  addCategoryBtn.addEventListener("click", function () {
    const name = (newCategoryNameInput.value || "").trim();
    const color = newCategoryColorInput.value || "#4a90e2";

    if (name === "") {
      alert("카테고리 이름을 입력해 주세요.");
      return;
    }

    let id = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    if (!id) id = "cat_" + Date.now();

    ensureCategories();
    let baseId = id;
    let counter = 1;
    while (tmsData.categories[id]) {
      id = baseId + "_" + counter;
      counter++;
    }

    tmsData.categories[id] = { label: name, color: color };

    saveData();
    newCategoryNameInput.value = "";
    refreshCategorySelect();
    renderCategoryList();
    renderPlanForCurrentUserAndDate();
  });

    // 폰트 선택 변경
  if (fontSelect) {
    fontSelect.addEventListener("change", function () {
      const key = this.value;
      tmsData.ui.font = key;
      applyFontSetting(key);
      saveData();
    });
  }

  // 테마 선택 변경
  if (themeSelect) {
    themeSelect.addEventListener("change", function () {
      const key = this.value;
      tmsData.ui.theme = key;
      applyThemeSetting(key);
      saveData();
    });
  }


  // 달력 이전/다음
  calendarPrevBtn.addEventListener("click", function () {
    calendarMonth--;
    if (calendarMonth < 0) {
      calendarMonth = 11;
      calendarYear--;
    }
    renderCalendar();
  });

  calendarNextBtn.addEventListener("click", function () {
    calendarMonth++;
    if (calendarMonth > 11) {
      calendarMonth = 0;
      calendarYear++;
    }
    renderCalendar();
  });

  // 오늘의 할 일 입력 → 실시간 저장
  if (todayTodoInput) {
    todayTodoInput.addEventListener("input", function () {
      const user = getCurrentUser();
      const dateStr = getCurrentDateString();
      if (!dateStr) return;
      setDailyTodo(user, dateStr, this.value);
    });
  }

  // 오늘 하루 회고 / 내일 목표 입력 → 실시간 저장
  if (dailyReflectionInput || dailyTomorrowGoalInput) {
    const saveReview = function () {
      const user = getCurrentUser();
      const dateStr = getCurrentDateString();
      if (!dateStr) return;

      const reflection = dailyReflectionInput ? dailyReflectionInput.value : "";
      const tomorrowGoal = dailyTomorrowGoalInput ? dailyTomorrowGoalInput.value : "";
      setDailyReview(user, dateStr, reflection, tomorrowGoal);
    };

    if (dailyReflectionInput) {
      dailyReflectionInput.addEventListener("input", saveReview);
    }
    if (dailyTomorrowGoalInput) {
      dailyTomorrowGoalInput.addEventListener("input", saveReview);
    }
  }


  // ===== 초기 실행 순서 =====
  initTimeSelects();
  createGrid();
  initDate();
  updateUserUI();
  refreshCategorySelect();
  renderCategoryList();
  initMotivation();
  initCalendar();
  renderPlanForCurrentUserAndDate();
  renderTodayTodoForCurrentUserAndDate();
  renderDailyRatingForCurrentUserAndDate();
  renderDailyReviewForCurrentUserAndDate();
  applyUISettingsFromData();

  console.log("TMS Time Boxing initialized (DIY ver. with dashboard).");
});
