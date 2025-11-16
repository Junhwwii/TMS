// TMS Time Boxing 스크립트 (버전 1.0)
// - 하루 24시간을 10분 단위로 잘라 144개의 박스를 생성
// - 사용자(닉네임) + 날짜별로 계획을 localStorage에 저장
// - 개별 칸 클릭으로 수정 가능
// - 시작/끝 시간 + 내용 + 카테고리로 범위 입력 가능

document.addEventListener("DOMContentLoaded", function () {
  // ===== DOM 요소 가져오기 =====
  const grid = document.getElementById("timeboxing-grid");
  const userNameInput = document.getElementById("user-name-input");
  const userApplyBtn = document.getElementById("user-apply-btn");
  const currentUserLabel = document.getElementById("current-user-label");

  const planDateInput = document.getElementById("plan-date-input");
  const goTodayBtn = document.getElementById("go-today-btn");
  const resetDayBtn = document.getElementById("reset-day-btn");

  const startHourSelect = document.getElementById("start-hour-select");
  const startMinuteSelect = document.getElementById("start-minute-select");
  const endHourSelect = document.getElementById("end-hour-select");
  const endMinuteSelect = document.getElementById("end-minute-select");
  const rangeTaskInput = document.getElementById("range-task-input");
  const taskCategorySelect = document.getElementById("task-category-select");
  const applyRangeBtn = document.getElementById("apply-range-btn");

  if (!grid) {
    console.error("timeboxing-grid 요소를 찾을 수 없습니다.");
    return;
  }

  // ===== 상수 정의 =====
  const HOURS = 24;          // 0시 ~ 23시
  const SLOTS_PER_HOUR = 6;  // 0,10,20,30,40,50분
  const STORAGE_KEY = "tmsData_v1";

  // 각 칸을 쉽게 찾기 위한 맵 (slotId -> DOM element)
  const slotMap = {}; // 예: "9-3" => buttonElement

  // ===== localStorage 데이터 관리 =====
  function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        currentUser: "guest",
        users: {
          guest: {
            plans: {} // dateString -> { slotId: { text, category } }
          }
        }
      };
    }
    try {
      const parsed = JSON.parse(raw);
      // 최소 구조 보장
      if (!parsed.users) parsed.users = {};
      if (!parsed.currentUser) parsed.currentUser = "guest";
      if (!parsed.users[parsed.currentUser]) {
        parsed.users[parsed.currentUser] = { plans: {} };
      }
      return parsed;
    } catch (e) {
      console.error("저장된 데이터를 파싱하는 중 오류 발생. 초기화합니다.", e);
      return {
        currentUser: "guest",
        users: {
          guest: {
            plans: {}
          }
        }
      };
    }
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tmsData));
  }

  let tmsData = loadData();

  // ===== 유틸 함수들 =====
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
    // 사용자 변경 시 현재 날짜 계획 다시 렌더링
    renderPlanForCurrentUserAndDate();
  }

  function getCurrentDateString() {
    return planDateInput.value;
  }

  function ensurePlan(userName, dateString) {
    ensureUser(userName);
    const user = tmsData.users[userName];
    if (!user.plans[dateString]) {
      user.plans[dateString] = {}; // slotId -> { text, category }
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

  // 카테고리를 CSS 클래스 이름으로 변환
  function categoryToClass(category) {
    switch (category) {
      case "study": return "cat-study";
      case "work": return "cat-work";
      case "exercise": return "cat-exercise";
      case "rest": return "cat-rest";
      case "etc": return "cat-etc";
      case "default":
      default:
        return "cat-default";
    }
  }

  // 개별 박스에 텍스트 + 카테고리 스타일 적용
  function applySlotVisual(box, text, category) {
    // 기존 filled / cat-* 제거
    box.classList.remove(
      "filled",
      "cat-default",
      "cat-study",
      "cat-work",
      "cat-exercise",
      "cat-rest",
      "cat-etc"
    );

    if (!text || text.trim() === "") {
      // 내용 없으면 기본 스타일로
      box.textContent = "";
      return;
    }

    box.textContent = text;
    box.classList.add("filled");

    const catClass = categoryToClass(category || "default");
    box.classList.add(catClass);
  }

  // ===== 시간 선택 셀렉트 박스 초기화 =====
  function initTimeSelects() {
    // 시간: 0 ~ 23
    for (let h = 0; h < HOURS; h++) {
      const label = h.toString().padStart(2, "0");
      const opt1 = new Option(label, h);
      const opt2 = new Option(label, h);
      startHourSelect.add(opt1);
      endHourSelect.add(opt2);
    }
    // 분: 0, 10, 20, 30, 40, 50
    for (let s = 0; s < SLOTS_PER_HOUR; s++) {
      const minute = s * 10;
      const label = minute.toString().padStart(2, "0");
      const opt1 = new Option(label, minute);
      const opt2 = new Option(label, minute);
      startMinuteSelect.add(opt1);
      endMinuteSelect.add(opt2);
    }

    // 초기값: 09:00 ~ 12:00 정도로 설정
    startHourSelect.value = "9";
    startMinuteSelect.value = "0";
    endHourSelect.value = "12";
    endMinuteSelect.value = "0";
  }

  // ===== 24 x 6 타임박스 그리드 생성 =====
  function createGrid() {
    for (let hour = 0; hour < HOURS; hour++) {
      const row = document.createElement("div");
      row.classList.add("timeboxing-row");

      // 왼쪽 시간 라벨
      const hourLabel = document.createElement("div");
      hourLabel.classList.add("timeboxing-hour-label");
      hourLabel.textContent = hour.toString().padStart(2, "0") + ":00";
      row.appendChild(hourLabel);

      // 오른쪽 10분 박스들
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

        // 개별 클릭으로 수정
        box.addEventListener("click", function () {
          const user = getCurrentUser();
          const dateStr = getCurrentDateString();
          if (!dateStr) {
            alert("먼저 상단에서 날짜를 선택해 주세요.");
            return;
          }

          const plan = ensurePlan(user, dateStr);
          const current = plan[id] || { text: "", category: "default" };

          const newText = prompt(
            `${label} 시간대에 할 일을 입력하세요.\n(비워두고 확인을 누르면 삭제됩니다.)`,
            current.text || ""
          );

          if (newText === null) {
            // 취소
            return;
          }

          const trimmed = newText.trim();
          if (trimmed === "") {
            // 삭제
            delete plan[id];
            applySlotVisual(box, "", "default");
          } else {
            // 기존 카테고리가 없으면 default
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

  // ===== 현재 유저 + 현재 날짜에 해당하는 계획을 UI로 렌더링 =====
  function renderPlanForCurrentUserAndDate() {
    const user = getCurrentUser();
    const dateStr = getCurrentDateString();
    if (!dateStr) return;

    const plan = getPlan(user, dateStr);

    // 모든 칸을 한 번 초기화
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

  // ===== 사용자 UI 갱신 =====
  function updateUserUI() {
    const user = getCurrentUser();
    currentUserLabel.textContent = user;
    userNameInput.value = user;
  }

  // ===== 날짜 초기화 =====
  function initDate() {
    if (!planDateInput.value) {
      planDateInput.value = formatTodayDateString();
    }
  }

  // ===== 이벤트 핸들러 등록 =====
  userApplyBtn.addEventListener("click", function () {
    setCurrentUser(userNameInput.value);
  });

  goTodayBtn.addEventListener("click", function () {
    planDateInput.value = formatTodayDateString();
    renderPlanForCurrentUserAndDate();
  });

  resetDayBtn.addEventListener("click", function () {
    const user = getCurrentUser();
    const dateStr = getCurrentDateString();
    if (!dateStr) {
      alert("먼저 날짜를 선택해 주세요.");
      return;
    }
    const ok = confirm(
      `${user} 사용자의 ${dateStr} 계획을 모두 삭제하시겠습니까?`
    );
    if (!ok) return;

    clearPlan(user, dateStr);
    renderPlanForCurrentUserAndDate();
  });

  planDateInput.addEventListener("change", function () {
    renderPlanForCurrentUserAndDate();
  });

  // 범위 적용 버튼
  applyRangeBtn.addEventListener("click", function () {
    const user = getCurrentUser();
    const dateStr = getCurrentDateString();
    if (!dateStr) {
      alert("먼저 상단에서 날짜를 선택해 주세요.");
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
    if (to < from) {
      // 만약 끝 시간이 시작보다 앞이라면 스왑
      [from, to] = [to, from];
    }

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

   // ===== 초기 실행 순서 =====
  initTimeSelects();    // 범위 선택 셀렉트 채우기
  createGrid();         // 24 x 6 박스 생성
  initDate();           // 날짜 기본값 = 오늘
  updateUserUI();       // 현재 사용자 표시
  renderPlanForCurrentUserAndDate(); // 초기 계획 렌더링

  console.log("TMS Time Boxing initialized.");
});