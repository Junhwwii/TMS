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
    "시간을 관리하지 못하면, 결국 시간에게 끌려다닌다.",
    "오늘 10분을 아끼면, 내일 한 시간을 벌 수 있다.",
    "하루를 설계하는 사람만이 일주일을 바꿀 수 있다.",
    "작은 블록 하나라도 채우면, 오늘은 이미 조금 전진한 것이다."
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
        dailyTodos: {}
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
      return parsed;
    } catch (e) {
      console.error("저장된 데이터를 파싱하는 중 오류 발생. 초기화합니다.", e);
      return {
        currentUser: "guest",
        users: {
          guest: { plans: {} }
        },
        categories: null,
        dailyTodos: {}
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
  }

  // ===== 명언 =====
  function initMotivation() {
    if (!motivationTextEl) return;
    const index = 0; // 나중에 랜덤으로 바꿔도 됨
    motivationTextEl.textContent = MOTIVATION_QUOTES[index];
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
      `${user} 사용자의 ${dateStr} 계획과 '오늘의 할 일'을 모두 삭제하시겠습니까?`
    );
    if (!ok) return;

    clearPlan(user, dateStr);
    setDailyTodo(user, dateStr, "");
    renderPlanForCurrentUserAndDate();
    renderTodayTodoForCurrentUserAndDate();
  });

  planDateInput.addEventListener("change", function () {
    renderPlanForCurrentUserAndDate();
    renderTodayTodoForCurrentUserAndDate();

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

  console.log("TMS Time Boxing initialized (DIY ver. with dashboard).");
});
