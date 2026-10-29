/**
 * IILM Smart Room Finder
 * School of Computer Science & Engineering, IILM University Greater Noida
 * Client-Side Timetable, Room Occupancy & Section Locator Application
 */

/**
 * Normalizes category and group labels globally across all timetable records.
 * Resolves repeated values like "CPP/JAVA-Gold, CPP/JAVA-Gold" into clean labels
 * like "Java/C++ Gold", "Java/C++ Silver", "Java/C++ Bronze", "Java", "C++", etc.
 */
function formatCategory(rawGroup, subject = '') {
  const isPalb = /PALB/i.test(subject);
  const isPps = /Programming for Problem Solving|PPS/i.test(subject);

  if (!rawGroup || typeof rawGroup !== 'string' || !rawGroup.trim()) {
    if (isPalb) {
      return 'Category unavailable';
    }
    return null;
  }

  // Split comma-separated tokens and trim
  const rawTokens = rawGroup.split(',').map(t => t.trim()).filter(Boolean);
  if (rawTokens.length === 0) {
    if (isPalb) {
      return 'Category unavailable';
    }
    return null;
  }

  // Check for Gold / Silver / Bronze levels
  const hasGold = rawTokens.some(t => /gold/i.test(t));
  const hasSilver = rawTokens.some(t => /silver/i.test(t));
  const hasBronze = rawTokens.some(t => /bronze/i.test(t));

  if (hasGold) return 'Java/C++ Gold';
  if (hasSilver) return 'Java/C++ Silver';
  if (hasBronze) return 'Java/C++ Bronze';

  // Check for Java / C++ tracks
  const hasG1 = rawTokens.some(t => /\bg1\b|group\s*1\b/i.test(t));
  const hasG2 = rawTokens.some(t => /\bg2\b|group\s*2\b/i.test(t));
  const hasJava = rawTokens.some(t => /\bjava\b/i.test(t));
  const hasCpp = rawTokens.some(t => /\bcpp\b|\bc\+\+/i.test(t));

  if (hasJava && hasG1 && !hasG2) return 'Java (G1)';
  if (hasJava && hasG2 && !hasG1) return 'Java (G2)';
  if (hasJava && !hasCpp && !hasG1 && !hasG2) return 'Java';
  if (hasCpp && !hasJava && !hasG1 && !hasG2) return 'C++';

  // For other group strings, deduplicate tokens preserving order
  const uniqueTokens = [];
  for (const token of rawTokens) {
    if (!uniqueTokens.includes(token)) {
      uniqueTokens.push(token);
    }
  }

  return uniqueTokens.join(', ');
}

/**
 * Returns a styled HTML badge for a category label
 */
function renderCategoryBadge(groupLabel) {
  if (!groupLabel) return '';
  if (groupLabel === 'Java/C++ Gold') {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">🥇 Java/C++ Gold</span>`;
  }
  if (groupLabel === 'Java/C++ Silver') {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800 border border-slate-300 shadow-2xs">🥈 Java/C++ Silver</span>`;
  }
  if (groupLabel === 'Java/C++ Bronze') {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-600/30 shadow-2xs">🥉 Java/C++ Bronze</span>`;
  }
  if (groupLabel === 'Category unavailable') {
    return `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] italic bg-slate-100 text-slate-500 border border-slate-300">Category unavailable</span>`;
  }
  if (groupLabel === 'Java' || groupLabel === 'C++' || groupLabel.startsWith('Java (')) {
    return `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">${escapeHtml(groupLabel)}</span>`;
  }
  return `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">${escapeHtml(groupLabel)}</span>`;
}

// Standard Time Table Metadata
const PERIOD_TIMINGS = {
  1: { start: '09:00', end: '09:55', label: 'Period 1 (09:00 - 09:55)' },
  2: { start: '09:55', end: '10:50', label: 'Period 2 (09:55 - 10:50)' },
  3: { start: '10:50', end: '11:45', label: 'Period 3 (10:50 - 11:45)' },
  4: { start: '11:45', end: '12:40', label: 'Period 4 (11:45 - 12:40)' },
  5: { start: '12:40', end: '13:35', label: 'Period 5 (12:40 - 13:35)' },
  6: { start: '13:35', end: '14:30', label: 'Period 6 (13:35 - 14:30)' },
  7: { start: '14:30', end: '15:25', label: 'Period 7 (14:30 - 15:25)' },
  8: { start: '15:25', end: '16:20', label: 'Period 8 (15:25 - 16:20)' },
  9: { start: '16:20', end: '17:15', label: 'Period 9 (16:20 - 17:15)' }
};

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Retrieves the current date and time components in the Asia/Kolkata timezone.
 */
function getKolkataTimeInfo() {
  const now = new Date();

  // Extract date and time parts in Asia/Kolkata timezone
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parts = dtf.formatToParts(now);
  let weekday = 'Monday';
  let hour = 0;
  let minute = 0;
  let second = 0;

  for (const part of parts) {
    if (part.type === 'weekday') weekday = part.value;
    if (part.type === 'hour') {
      const parsed = parseInt(part.value, 10);
      hour = parsed === 24 ? 0 : parsed;
    }
    if (part.type === 'minute') minute = parseInt(part.value, 10);
    if (part.type === 'second') second = parseInt(part.value, 10);
  }

  // 12-hour formatted time with AM/PM for UI header display
  const dtf12 = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  const timeStr = dtf12.format(now);

  const totalMinutes = hour * 60 + minute;
  return {
    weekday,
    hour,
    minute,
    second,
    totalMinutes,
    timeStr
  };
}

/**
 * Determines the current period and class status based on Asia/Kolkata time.
 * Period rules:
 * - Before first period (< 09:00): Period 1
 * - Scheduled class hours (09:00 - 17:15): Period 1 through 9
 * - After final period until midnight (>= 17:15): Period 9
 * - At midnight (00:00): Automatically rolls into new calendar day, resetting to Period 1
 * - Saturday / Sunday: Uses actual weekday without falsely reporting classes in progress
 */
function determineCurrentPeriod(kolkataInfo) {
  const info = kolkataInfo || getKolkataTimeInfo();
  const totalMins = info.totalMinutes;
  const isSunday = info.weekday === 'Sunday';

  const periodRanges = [
    { p: 1, start: 540, end: 595, sStr: '09:00', eStr: '09:55' },
    { p: 2, start: 595, end: 650, sStr: '09:55', eStr: '10:50' },
    { p: 3, start: 650, end: 705, sStr: '10:50', eStr: '11:45' },
    { p: 4, start: 705, end: 760, sStr: '11:45', eStr: '12:40' },
    { p: 5, start: 760, end: 815, sStr: '12:40', eStr: '13:35' },
    { p: 6, start: 815, end: 870, sStr: '13:35', eStr: '14:30' },
    { p: 7, start: 870, end: 925, sStr: '14:30', eStr: '15:25' },
    { p: 8, start: 925, end: 980, sStr: '15:25', eStr: '16:20' },
    { p: 9, start: 980, end: 1035, sStr: '16:20', eStr: '17:15' }
  ];

  // Before first period (< 09:00 AM)
  if (totalMins < 540) {
    return {
      isClassHour: false,
      period: 1,
      start: '09:00',
      end: '09:55',
      minsRemaining: 540 - totalMins,
      fraction: 0,
      statusText: isSunday ? 'Sunday • No scheduled classes' : 'Classes begin at 09:00 AM (Period 1 selected)'
    };
  }

  // After final period until midnight (>= 17:15)
  if (totalMins >= 1035) {
    return {
      isClassHour: false,
      period: 9,
      start: '16:20',
      end: '17:15',
      minsRemaining: 0,
      fraction: 1,
      statusText: isSunday ? 'Sunday • No scheduled classes' : 'Academic day concluded (Period 9 selected)'
    };
  }

  // During scheduled period hours (540 <= totalMins < 1035)
  for (const r of periodRanges) {
    if (totalMins >= r.start && totalMins < r.end) {
      if (isSunday) {
        return {
          isClassHour: false,
          period: r.p,
          start: r.sStr,
          end: r.eStr,
          minsRemaining: r.end - totalMins,
          fraction: (totalMins - r.start) / (r.end - r.start),
          statusText: 'Sunday • No scheduled classes'
        };
      }
      return {
        isClassHour: true,
        period: r.p,
        start: r.sStr,
        end: r.eStr,
        minsRemaining: r.end - totalMins,
        fraction: (totalMins - r.start) / (r.end - r.start),
        statusText: `Period ${r.p} in progress`
      };
    }
  }

  return {
    isClassHour: false,
    period: 1,
    start: '09:00',
    end: '09:55',
    minsRemaining: 0,
    fraction: 0,
    statusText: isSunday ? 'Sunday • No scheduled classes' : 'Between scheduled periods'
  };
}

const initialKolkata = getKolkataTimeInfo();
const initialPeriodInfo = determineCurrentPeriod(initialKolkata);

// Application State
const state = {
  data: null,
  periods: [],
  buildings: [],
  rooms: [],
  classes: [],
  sections: [],
  teachers: [],
  
  // Lookup Indexes
  scheduleByRoomSlot: {},    // [room][day][period] -> [session1, session2]
  scheduleBySection: {},     // [section][day][period] -> [session1]
  scheduleByTeacher: {},     // [teacher][day][period] -> [session1]
  roomsByBuildingFloor: {},  // [bldg][floor] -> [room1, room2]

  // Active UI Context (Live Now by default, auto-selected Asia/Kolkata day & period)
  activeTab: 'dashboard',
  isLiveMode: true,
  selectedDay: initialKolkata.weekday,
  selectedPeriod: initialPeriodInfo.period,
  
  // Multi-Room Search State
  selectedRooms: ['EB 301', 'EB 302', 'EB 303', 'EB 304', 'EB 402', 'EB 403'],
  multiRoomViewMode: 'table', // 'table' or 'cards'
  
  // Floor Explorer State
  selectedFloorBuilding: 'EB',
  selectedFloor: 3,

  // Vacant Rooms State
  vacantConsecutive: 1,

  // Section Lookup State
  selectedSection: '2CSE10',

  // Master Timetable State
  masterMode: 'room', // 'room', 'section', 'faculty'
  masterTarget: 'EB 301'
};

// ========================================================
// 1. DATA INITIALIZATION & INDEX BUILDING
// ========================================================

async function initApp() {
  try {
    let rawData = null;

    // Attempt 1: Fetch normalized timetable.json
    try {
      const res = await fetch('./timetable.json');
      if (res.ok) {
        rawData = await res.json();
      }
    } catch (e) {
      console.warn('Direct fetch for timetable.json failed, checking fallback...', e);
    }

    // Attempt 2: Fallback to window.MASTER_TIMETABLE_DATA (from timetable-data.js)
    if (!rawData && window.MASTER_TIMETABLE_DATA) {
      rawData = transformRawTimetableData(window.MASTER_TIMETABLE_DATA);
    }

    // Attempt 3: Fetch timetable-data.json if still null
    if (!rawData) {
      try {
        const res2 = await fetch('./timetable-data.json');
        if (res2.ok) {
          const json2 = await res2.json();
          rawData = transformRawTimetableData(json2);
        }
      } catch (e2) {
        console.error('All data loading attempts failed', e2);
      }
    }

    if (!rawData) {
      showFatalError('Failed to load timetable data. Ensure timetable.json or timetable-data.json is accessible.');
      return;
    }

    processDataset(rawData);
    setupEventListeners();
    initClockTicker();
    
    // Initial Render
    updateSharedControls();
    renderAllViews();

    const badge = document.getElementById('dataLoadedBadge');
    if (badge) badge.textContent = `● 127 Sections (${state.rooms.length} Rooms Ready)`;

  } catch (err) {
    console.error('Initialization error:', err);
    showFatalError('Error initializing application: ' + err.message);
  }
}

/**
 * Transforms raw timetable-data.json format into normalized model if needed
 */
function transformRawTimetableData(data) {
  const periods = Object.entries(data.periods || PERIOD_TIMINGS).map(([p, time]) => {
    const [start, end] = time.split('-');
    return { period: parseInt(p), start, end, label: `Period ${p} (${time})` };
  });

  const roomsMap = {};
  const classes = [];
  let classId = 1;

  const timetables = data.timetables || {};
  for (const [sec, days] of Object.entries(timetables)) {
    for (const [day, periodsObj] of Object.entries(days)) {
      for (const [pStr, entries] of Object.entries(periodsObj)) {
        const p = parseInt(pStr);
        const pInfo = PERIOD_TIMINGS[p] || { start: '', end: '' };

        for (const e of entries) {
          const teachers = (e.teachers || []).filter(t => t && t.trim().length > 0);
          const roomList = (e.rooms || []).filter(r => r && r.trim().length > 0);

          let courseCode = e.subject_code || '';
          const subject = e.subject || '';
          if (subject.includes('-')) {
            const parts = subject.split('-');
            if (!courseCode) courseCode = parts[0].trim();
          }

          if (roomList.length === 0) {
            classes.push({
              id: classId++,
              section: sec,
              day,
              period: p,
              start: pInfo.start,
              end: pInfo.end,
              courseCode,
              subject,
              teachers,
              room: null,
              building: null,
              floor: null,
              group: formatCategory(e.group, subject),
              type: subject.toLowerCase().includes('lab') ? 'lab' : 'lecture',
              verificationStatus: 'unassigned-room'
            });
          } else {
            for (const r of roomList) {
              const cls = classifyRoom(r);
              if (!roomsMap[r]) {
                roomsMap[r] = {
                  room: r,
                  building: cls.building,
                  floor: cls.floor,
                  roomType: cls.type,
                  inventoryVerified: true
                };
              }
              classes.push({
                id: classId++,
                section: sec,
                day,
                period: p,
                start: pInfo.start,
                end: pInfo.end,
                courseCode,
                subject,
                teachers,
                room: r,
                building: cls.building,
                floor: cls.floor,
                group: formatCategory(e.group, subject),
                type: subject.toLowerCase().includes('lab') || cls.type === 'Lab' ? 'lab' : 'lecture',
                verificationStatus: 'verified'
              });
            }
          }
        }
      }
    }
  }

  return {
    metadata: {
      university: data.university,
      timetableName: data.timetable_name,
      validity: data.validity,
      totalSections: data.classes_count || Object.keys(timetables).length
    },
    periods,
    rooms: Object.values(roomsMap),
    classes
  };
}

/**
 * Classifies room into Building, Floor, and Room Type
 */
function classifyRoom(room) {
  let building = 'Specialized Labs';
  let floor = null;
  let type = 'Classroom';

  if (/lab|digital electronics|physics/i.test(room)) {
    type = 'Lab';
  }

  // Match Engineering Block: EB 201, EB 301, LAB EB 102
  const ebMatch = room.match(/^(?:LAB\s+)?EB\s*(\d)(\d{2})$/i);
  if (ebMatch) {
    building = 'Engineering Block (EB)';
    floor = parseInt(ebMatch[1]);
  }
  // Match Foundation Block: Foundation Block 101
  else if (/^Foundation Block\s*(\d)(\d{2})$/i.test(room)) {
    const fbMatch = room.match(/^Foundation Block\s*(\d)(\d{2})$/i);
    building = 'Foundation Block';
    floor = parseInt(fbMatch[1]);
  }
  // Match Law Block: Law Block 301, LAB Law Block 103
  else if (/^(?:LAB\s+)?Law Block\s*(\d)(\d{2})$/i.test(room)) {
    const lbMatch = room.match(/^(?:LAB\s+)?Law Block\s*(\d)(\d{2})$/i);
    building = 'Law Block';
    floor = parseInt(lbMatch[1]);
  }
  // Match SVH: SVH 201, LAB SVH 102
  else if (/^(?:LAB\s+)?SVH\s*(\d)(\d{2})$/i.test(room)) {
    const svhMatch = room.match(/^(?:LAB\s+)?SVH\s*(\d)(\d{2})$/i);
    building = 'Sir Vishveshwarya Hall (SVH)';
    floor = parseInt(svhMatch[1]);
  }
  // Special Labs
  else if (/^Digital Electronics-(\d)$/i.test(room)) {
    building = 'Engineering Block (EB)';
    floor = null;
    type = 'Lab';
  }
  else if (/^Physics Lab/i.test(room)) {
    building = 'Foundation Block';
    floor = null;
    type = 'Lab';
  }
  else if (/Apple Lab|Dell Lab/i.test(room)) {
    building = 'Specialized Labs';
    floor = null;
    type = 'Lab';
  }

  return { building, floor, type };
}

/**
 * Process normalized dataset into fast in-memory indexing structures
 */
function processDataset(data) {
  state.data = data;
  state.periods = data.periods || [];
  state.rooms = (data.rooms || []).sort((a, b) => a.room.localeCompare(b.room));
  state.classes = data.classes || [];

  // Reset indexes
  state.scheduleByRoomSlot = {};
  state.scheduleBySection = {};
  state.scheduleByTeacher = {};
  state.roomsByBuildingFloor = {};

  const sectionSet = new Set();
  const teacherSet = new Set();

  // Initialize room index for every room
  for (const rObj of state.rooms) {
    const r = rObj.room;
    state.scheduleByRoomSlot[r] = {};
    for (const d of DAYS_OF_WEEK) {
      state.scheduleByRoomSlot[r][d] = {};
      for (let p = 1; p <= 9; p++) {
        state.scheduleByRoomSlot[r][d][p] = [];
      }
    }

    // Group into Building/Floor index
    const bldgKey = getBuildingShortKey(rObj.building);
    const fKey = rObj.floor !== null ? rObj.floor : 'other';
    if (!state.roomsByBuildingFloor[bldgKey]) state.roomsByBuildingFloor[bldgKey] = {};
    if (!state.roomsByBuildingFloor[bldgKey][fKey]) state.roomsByBuildingFloor[bldgKey][fKey] = [];
    state.roomsByBuildingFloor[bldgKey][fKey].push(rObj);
  }

  // Populate sessions into indexes
  for (const cls of state.classes) {
    cls.group = formatCategory(cls.group, cls.subject);
    if (cls.section) sectionSet.add(cls.section);

    // Section index
    if (cls.section) {
      if (!state.scheduleBySection[cls.section]) state.scheduleBySection[cls.section] = {};
      if (!state.scheduleBySection[cls.section][cls.day]) state.scheduleBySection[cls.section][cls.day] = {};
      if (!state.scheduleBySection[cls.section][cls.day][cls.period]) {
        state.scheduleBySection[cls.section][cls.day][cls.period] = [];
      }
      state.scheduleBySection[cls.section][cls.day][cls.period].push(cls);
    }

    // Room Slot index
    if (cls.room && state.scheduleByRoomSlot[cls.room]) {
      if (state.scheduleByRoomSlot[cls.room][cls.day] && state.scheduleByRoomSlot[cls.room][cls.day][cls.period]) {
        state.scheduleByRoomSlot[cls.room][cls.day][cls.period].push(cls);
      }
    }

    // Teacher index
    if (cls.teachers) {
      for (const t of cls.teachers) {
        if (!t) continue;
        teacherSet.add(t);
        if (!state.scheduleByTeacher[t]) state.scheduleByTeacher[t] = {};
        if (!state.scheduleByTeacher[t][cls.day]) state.scheduleByTeacher[t][cls.day] = {};
        if (!state.scheduleByTeacher[t][cls.day][cls.period]) {
          state.scheduleByTeacher[t][cls.day][cls.period] = [];
        }
        state.scheduleByTeacher[t][cls.day][cls.period].push(cls);
      }
    }
  }

  state.sections = Array.from(sectionSet).sort();
  state.teachers = Array.from(teacherSet).sort();

  console.log(`Processed: ${state.sections.length} sections, ${state.rooms.length} rooms, ${state.classes.length} classes, ${state.teachers.length} teachers.`);
}

function getBuildingShortKey(bldg) {
  if (!bldg) return 'Specialized Labs';
  if (bldg.includes('EB') || bldg.includes('Engineering')) return 'EB';
  if (bldg.includes('Foundation')) return 'Foundation Block';
  if (bldg.includes('Law')) return 'Law Block';
  if (bldg.includes('SVH') || bldg.includes('Vishveshwarya')) return 'SVH';
  return 'Specialized Labs';
}

// ========================================================
// 2. TIME CONTROLLER & LIVE TICKER (Asia/Kolkata IST)
// ========================================================

function initClockTicker() {
  updateLiveClock();
  setInterval(updateLiveClock, 1000);
}

function updateLiveClock() {
  const kInfo = getKolkataTimeInfo();
  
  // Format current live time in IST
  const clockEl = document.getElementById('liveClockText');
  if (clockEl) {
    clockEl.textContent = `${kInfo.weekday}, ${kInfo.timeStr} (IST)`;
  }

  const currentPeriodInfo = determineCurrentPeriod(kInfo);
  const badgeEl = document.getElementById('currentPeriodBadge');
  if (badgeEl) {
    if (currentPeriodInfo.isClassHour) {
      badgeEl.innerHTML = `<span class="text-amber-300 font-bold">Period ${currentPeriodInfo.period}</span> (${currentPeriodInfo.start}–${currentPeriodInfo.end})`;
    } else {
      badgeEl.textContent = currentPeriodInfo.statusText;
    }
  }

  // If in Live Mode, auto-update selected day and period when period or day boundary is crossed
  if (state.isLiveMode) {
    const dayToUse = kInfo.weekday;
    const periodToUse = currentPeriodInfo.period;

    if (state.selectedDay !== dayToUse || state.selectedPeriod !== periodToUse) {
      state.selectedDay = dayToUse;
      state.selectedPeriod = periodToUse;
      updateSharedControls();
      renderAllViews();
    }
    
    // Update progress bar
    updatePeriodProgress(kInfo, currentPeriodInfo);
  }
}

function updatePeriodProgress(kInfo, info) {
  const bar = document.getElementById('periodProgressBar');
  const txt = document.getElementById('periodRemainingText');
  const heroTime = document.getElementById('heroSlotTime');

  if (info.isClassHour) {
    if (bar) bar.style.width = `${Math.min(100, Math.max(0, info.fraction * 100))}%`;
    if (txt) txt.textContent = `Period in progress • ${info.minsRemaining} mins remaining`;
    if (heroTime) heroTime.textContent = `${info.start} - ${info.end}`;
  } else {
    if (bar) bar.style.width = '0%';
    if (txt) txt.textContent = info.statusText;
    if (heroTime && info.start && info.end) heroTime.textContent = `${info.start} - ${info.end}`;
  }
}

function setLiveMode(isLive) {
  state.isLiveMode = isLive;
  const liveBtn = document.getElementById('modeLiveBtn');
  const manualBtn = document.getElementById('modeManualBtn');

  if (isLive) {
    if (liveBtn) liveBtn.className = 'px-2.5 py-1 rounded-md font-semibold bg-white text-blue-900 shadow-sm transition';
    if (manualBtn) manualBtn.className = 'px-2.5 py-1 rounded-md font-semibold text-slate-600 hover:text-slate-900 transition';
    jumpToCurrentTime();
  } else {
    if (liveBtn) liveBtn.className = 'px-2.5 py-1 rounded-md font-semibold text-slate-600 hover:text-slate-900 transition';
    if (manualBtn) manualBtn.className = 'px-2.5 py-1 rounded-md font-semibold bg-white text-blue-900 shadow-sm transition';
  }
}

function jumpToCurrentTime() {
  const kInfo = getKolkataTimeInfo();
  const curPeriod = determineCurrentPeriod(kInfo);
  state.selectedDay = kInfo.weekday;
  state.selectedPeriod = curPeriod.period;

  updateSharedControls();
  renderAllViews();
}

function onSharedTimeChange() {
  state.isLiveMode = false;
  const liveBtn = document.getElementById('modeLiveBtn');
  const manualBtn = document.getElementById('modeManualBtn');
  if (liveBtn) liveBtn.className = 'px-2.5 py-1 rounded-md font-semibold text-slate-600 hover:text-slate-900 transition';
  if (manualBtn) manualBtn.className = 'px-2.5 py-1 rounded-md font-semibold bg-white text-blue-900 shadow-sm transition';

  const daySelect = document.getElementById('sharedDaySelect');
  const periodSelect = document.getElementById('sharedPeriodSelect');

  state.selectedDay = daySelect.value;
  state.selectedPeriod = parseInt(periodSelect.value);

  updateSharedControls();
  renderAllViews();
}

function updateSharedControls() {
  const daySelect = document.getElementById('sharedDaySelect');
  const periodSelect = document.getElementById('sharedPeriodSelect');

  if (daySelect) daySelect.value = state.selectedDay;
  if (periodSelect) periodSelect.value = state.selectedPeriod;

  const revDay = document.getElementById('reverseDaySelect');
  const revPeriod = document.getElementById('reversePeriodSelect');
  if (revDay && state.isLiveMode) revDay.value = state.selectedDay;
  if (revPeriod && state.isLiveMode) revPeriod.value = state.selectedPeriod;

  const heroDayPeriodText = document.getElementById('heroDayPeriodText');
  const pInfo = PERIOD_TIMINGS[state.selectedPeriod];
  if (heroDayPeriodText && pInfo) {
    heroDayPeriodText.textContent = `${state.selectedDay}, Period ${state.selectedPeriod} (${pInfo.start} - ${pInfo.end})`;
  }

  const heroSlotTime = document.getElementById('heroSlotTime');
  if (heroSlotTime && pInfo) {
    heroSlotTime.textContent = `${pInfo.start} - ${pInfo.end}`;
  }
}

// ========================================================
// 3. TAB SWITCHING
// ========================================================

function switchTab(tabId) {
  state.activeTab = tabId;

  // Update tabs active state
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(`tab-${tabId}`);
  if (activeBtn) activeBtn.classList.add('active');

  // Hide all sections, show active
  const views = ['dashboard', 'multiroom', 'floors', 'vacant', 'sections', 'timetable', 'about'];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) {
      if (v === tabId) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
  });

  // Re-render specific view
  renderView(tabId);
}

function toggleMobileMenu() {
  const drawer = document.getElementById('mobileDrawer');
  if (drawer) {
    drawer.classList.toggle('hidden');
  }
}

function renderAllViews() {
  renderDashboard();
  renderMultiRoomSearch();
  renderFloorExplorer();
  renderVacantRooms();
  renderSectionLookup();
  renderMasterTimetable();
}

function renderView(viewName) {
  switch (viewName) {
    case 'dashboard': renderDashboard(); break;
    case 'multiroom': renderMultiRoomSearch(); break;
    case 'floors': renderFloorExplorer(); break;
    case 'vacant': renderVacantRooms(); break;
    case 'sections': renderSectionLookup(); break;
    case 'timetable': renderMasterTimetable(); break;
    case 'about': break;
  }
}

// ========================================================
// 4. TAB 1: DASHBOARD ("What's Happening Now?")
// ========================================================

function renderDashboard() {
  const day = state.selectedDay;
  const period = state.selectedPeriod;

  // Calculate statistics across all 83 rooms
  let occupiedCount = 0;
  let vacantCount = 0;
  let sharedCount = 0;

  for (const r of state.rooms) {
    const sessions = state.scheduleByRoomSlot[r.room]?.[day]?.[period] || [];
    if (sessions.length > 0) {
      occupiedCount++;
      if (sessions.length > 1) sharedCount++;
    } else {
      vacantCount++;
    }
  }

  // Update KPI cards
  const kpiTotal = document.getElementById('kpiTotalRooms');
  const kpiOcc = document.getElementById('kpiOccupiedRooms');
  const kpiVac = document.getElementById('kpiVacantRooms');
  const kpiShared = document.getElementById('kpiSharedSessions');

  if (kpiTotal) kpiTotal.textContent = state.rooms.length;
  if (kpiOcc) kpiOcc.textContent = occupiedCount;
  if (kpiVac) kpiVac.textContent = vacantCount;
  if (kpiShared) kpiShared.textContent = sharedCount;

  renderDashboardTable();
}

function renderDashboardTable() {
  const day = state.selectedDay;
  const period = state.selectedPeriod;
  const tbody = document.getElementById('dashboardTableBody');
  const empty = document.getElementById('dashboardEmptyState');
  if (!tbody) return;

  const query = (document.getElementById('dashboardSearchRoom')?.value || '').toLowerCase().trim();
  const bldgFilter = document.getElementById('dashboardBuildingFilter')?.value || 'ALL';
  const statusFilter = document.getElementById('dashboardStatusFilter')?.value || 'ALL';

  let filteredRooms = state.rooms.filter(r => {
    // Search query
    if (query) {
      const matchName = r.room.toLowerCase().includes(query);
      const sessions = state.scheduleByRoomSlot[r.room]?.[day]?.[period] || [];
      const matchSec = sessions.some(s => s.section.toLowerCase().includes(query) || s.subject.toLowerCase().includes(query));
      if (!matchName && !matchSec) return false;
    }

    // Building filter
    if (bldgFilter !== 'ALL') {
      const bKey = getBuildingShortKey(r.building);
      if (bKey !== bldgFilter) return false;
    }

    // Status filter
    const sessions = state.scheduleByRoomSlot[r.room]?.[day]?.[period] || [];
    const isOcc = sessions.length > 0;
    const isShared = sessions.length > 1;

    if (statusFilter === 'OCCUPIED' && !isOcc) return false;
    if (statusFilter === 'VACANT' && isOcc) return false;
    if (statusFilter === 'SHARED' && !isShared) return false;

    return true;
  });

  if (filteredRooms.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');

  let html = '';
  filteredRooms.forEach(r => {
    const sessions = state.scheduleByRoomSlot[r.room]?.[day]?.[period] || [];
    const isOcc = sessions.length > 0;
    const isShared = sessions.length > 1;
    const nextClass = getNextScheduledClass(r.room, day, period);

    let statusBadge = '';
    if (isShared) {
      statusBadge = `<span class="badge-shared px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-purple-600"></span> Shared (${sessions.length} Secs)
      </span>`;
    } else if (isOcc) {
      statusBadge = `<span class="badge-occupied px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-red-600"></span> Occupied
      </span>`;
    } else {
      statusBadge = `<span class="badge-vacant px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Vacant
      </span>`;
    }

    let sectionText = '—';
    let subjectText = '—';
    let facultyText = '—';

    if (isOcc) {
      const secList = sessions.map(s => {
        let txt = `<span class="font-bold text-blue-900 cursor-pointer hover:underline" onclick="selectAndLookupSection('${s.section}')">${s.section}</span>`;
        if (s.group) txt += ` ${renderCategoryBadge(s.group)}`;
        return txt;
      });
      sectionText = secList.join('<br>');

      const subjList = sessions.map(s => {
        return `<div class="leading-tight"><span class="font-semibold text-slate-800">${escapeHtml(s.subject)}</span> <span class="text-[10px] text-slate-500 font-mono">${s.courseCode ? `(${s.courseCode})` : ''}</span></div>`;
      });
      subjectText = subjList.join('<div class="my-1 border-t border-slate-100"></div>');

      const facList = sessions.map(s => {
        const tStr = s.teachers.length ? s.teachers.join(', ') : '<span class="text-slate-400 italic">Faculty unassigned</span>';
        return `<span>👨‍🏫 ${escapeHtml(tStr)}</span>`;
      });
      facultyText = facList.join('<br>');
    }

    const typeBadge = r.roomType === 'Lab' 
      ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Lab</span>' 
      : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">Classroom</span>';

    html += `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="py-3 px-4 font-bold text-slate-900">
          <div class="flex items-center gap-2">
            <button onclick="openRoomModal('${escapeAttr(r.room)}')" class="text-blue-700 hover:text-blue-900 hover:underline text-left">
              ${escapeHtml(r.room)}
            </button>
          </div>
          <div class="text-[11px] font-normal text-slate-500">${escapeHtml(r.building)}${r.floor !== null ? ` • Floor ${r.floor}` : ''}</div>
        </td>
        <td class="py-3 px-3">${statusBadge}</td>
        <td class="py-3 px-3">${sectionText}</td>
        <td class="py-3 px-4 max-w-xs">${subjectText}</td>
        <td class="py-3 px-4 text-slate-700">${facultyText}</td>
        <td class="py-3 px-3">${typeBadge}</td>
        <td class="py-3 px-3 text-slate-500">${nextClass}</td>
        <td class="py-3 px-3 text-right">
          <button onclick="openRoomModal('${escapeAttr(r.room)}')" class="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded border border-slate-300 transition">
            View Schedule
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function getNextScheduledClass(room, day, currentPeriod) {
  for (let p = currentPeriod + 1; p <= 9; p++) {
    const sessions = state.scheduleByRoomSlot[room]?.[day]?.[p] || [];
    if (sessions.length > 0) {
      const s = sessions[0];
      const pTiming = PERIOD_TIMINGS[p];
      return `<span class="text-slate-800 font-medium">Period ${p} (${pTiming.start})</span>: <span class="font-bold text-blue-800">${s.section}</span>`;
    }
  }
  return '<span class="text-emerald-700 font-medium">Free rest of day</span>';
}

// ========================================================
// 5. TAB 2: MULTI-ROOM SEARCH (Core Required Feature)
// ========================================================

function renderMultiRoomSearch() {
  renderMultiRoomCheckboxes();
  renderMultiRoomChips();
  renderMultiRoomResults();
}

function renderMultiRoomCheckboxes() {
  const container = document.getElementById('multiRoomCheckboxesGrid');
  if (!container) return;

  const query = (document.getElementById('multiRoomFilterInput')?.value || '').toLowerCase().trim();
  const bldgFilter = document.getElementById('multiRoomBuildingFilter')?.value || 'ALL';

  const filtered = state.rooms.filter(r => {
    if (query && !r.room.toLowerCase().includes(query)) return false;
    if (bldgFilter !== 'ALL') {
      const bKey = getBuildingShortKey(r.building);
      if (bKey !== bldgFilter) return false;
    }
    return true;
  });

  let html = '';
  filtered.forEach(r => {
    const isChecked = state.selectedRooms.includes(r.room);
    html += `
      <label class="flex items-center gap-1.5 p-1.5 rounded hover:bg-white cursor-pointer transition ${isChecked ? 'bg-blue-50/60 font-semibold' : ''}">
        <input type="checkbox" value="${escapeAttr(r.room)}" ${isChecked ? 'checked' : ''} 
          onchange="onMultiRoomToggle(this.value, this.checked)"
          class="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5">
        <span class="truncate">${escapeHtml(r.room)}</span>
      </label>
    `;
  });

  container.innerHTML = html || '<div class="col-span-full text-slate-400 py-2 text-center">No rooms found</div>';
}

function onMultiRoomToggle(room, isChecked) {
  if (isChecked) {
    if (!state.selectedRooms.includes(room)) {
      state.selectedRooms.push(room);
    }
  } else {
    state.selectedRooms = state.selectedRooms.filter(r => r !== room);
  }

  renderMultiRoomChips();
  renderMultiRoomResults();
}

function renderMultiRoomChips() {
  const container = document.getElementById('multiRoomChipsContainer');
  const countEl = document.getElementById('multiRoomSelectedCount');
  if (!container) return;

  if (countEl) countEl.textContent = state.selectedRooms.length;

  if (state.selectedRooms.length === 0) {
    container.innerHTML = '<span class="text-xs text-slate-400 italic">No rooms selected yet. Pick from above.</span>';
    return;
  }

  let html = '';
  state.selectedRooms.forEach(room => {
    html += `
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-white border border-slate-300 text-slate-800 shadow-xs">
        ${escapeHtml(room)}
        <button type="button" onclick="onMultiRoomToggle('${escapeAttr(room)}', false); renderMultiRoomCheckboxes();" class="text-slate-400 hover:text-red-600 font-bold ml-0.5">×</button>
      </span>
    `;
  });

  container.innerHTML = html;
}

function multiSelectPreset(presetKey) {
  if (presetKey === 'EB_3') {
    state.selectedRooms = ['EB 301', 'EB 302', 'EB 304', 'EB 305'];
  } else if (presetKey === 'EB_4') {
    state.selectedRooms = ['EB 402', 'EB 403', 'EB 404', 'EB 405', 'EB 406', 'EB 407'];
  } else if (presetKey === 'ALL_LABS') {
    state.selectedRooms = state.rooms.filter(r => r.roomType === 'Lab').map(r => r.room);
  }

  renderMultiRoomCheckboxes();
  renderMultiRoomChips();
  renderMultiRoomResults();
}

function multiSelectAll() {
  state.selectedRooms = state.rooms.map(r => r.room);
  renderMultiRoomCheckboxes();
  renderMultiRoomChips();
  renderMultiRoomResults();
}

function multiSelectClear() {
  state.selectedRooms = [];
  renderMultiRoomCheckboxes();
  renderMultiRoomChips();
  renderMultiRoomResults();
}

function setMultiRoomView(mode) {
  state.multiRoomViewMode = mode;
  const btnTable = document.getElementById('btnViewTable');
  const btnCards = document.getElementById('btnViewCards');
  const tableView = document.getElementById('multiRoomTableView');
  const cardsView = document.getElementById('multiRoomCardsView');

  if (mode === 'table') {
    btnTable.className = 'px-2.5 py-1 rounded-md bg-white text-slate-900 shadow-sm transition';
    btnCards.className = 'px-2.5 py-1 rounded-md text-slate-600 hover:text-slate-900 transition';
    tableView.classList.remove('hidden');
    cardsView.classList.add('hidden');
  } else {
    btnTable.className = 'px-2.5 py-1 rounded-md text-slate-600 hover:text-slate-900 transition';
    btnCards.className = 'px-2.5 py-1 rounded-md bg-white text-slate-900 shadow-sm transition';
    tableView.classList.add('hidden');
    cardsView.classList.remove('hidden');
  }
}

function renderMultiRoomResults() {
  const day = state.selectedDay;
  const period = state.selectedPeriod;
  const pInfo = PERIOD_TIMINGS[period] || { start: '', end: '' };

  const sub = document.getElementById('multiRoomResultsSub');
  if (sub) {
    sub.textContent = `Showing status for ${state.selectedRooms.length} selected rooms on ${day}, Period ${period} (${pInfo.start} - ${pInfo.end}).`;
  }

  const empty = document.getElementById('multiRoomEmptyState');
  const tableView = document.getElementById('multiRoomTableView');
  const cardsView = document.getElementById('multiRoomCardsView');
  const tbody = document.getElementById('multiRoomTableBody');

  if (state.selectedRooms.length === 0) {
    if (empty) empty.classList.remove('hidden');
    if (tableView) tableView.classList.add('hidden');
    if (cardsView) cardsView.classList.add('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  if (state.multiRoomViewMode === 'table') {
    if (tableView) tableView.classList.remove('hidden');
    if (cardsView) cardsView.classList.add('hidden');
  } else {
    if (tableView) tableView.classList.add('hidden');
    if (cardsView) cardsView.classList.remove('hidden');
  }

  const statusFilter = document.getElementById('multiRoomStatusFilter')?.value || 'ALL';

  let tableHtml = '';
  let cardsHtml = '';

  state.selectedRooms.forEach(roomName => {
    const rObj = state.rooms.find(r => r.room === roomName) || {
      room: roomName,
      building: 'Unknown',
      floor: null,
      roomType: 'Classroom'
    };

    const sessions = state.scheduleByRoomSlot[roomName]?.[day]?.[period] || [];
    const isOcc = sessions.length > 0;
    const isShared = sessions.length > 1;

    if (statusFilter === 'OCCUPIED' && !isOcc) return;
    if (statusFilter === 'VACANT' && isOcc) return;

    // Status Badge
    let statusBadge = '';
    let cardBorderClass = 'is-vacant';

    if (isShared) {
      statusBadge = `<span class="badge-shared px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-purple-600"></span> Occupied (Combined ${sessions.length} Sections)
      </span>`;
      cardBorderClass = 'is-shared';
    } else if (isOcc) {
      statusBadge = `<span class="badge-occupied px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-red-600"></span> Occupied
      </span>`;
      cardBorderClass = 'is-occupied';
    } else {
      statusBadge = `<span class="badge-vacant px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Verified Vacant
      </span>`;
      cardBorderClass = 'is-vacant';
    }

    // Details compilation
    let secText = '—';
    let subjText = '—';
    let codeText = '—';
    let facText = '—';
    let grpText = '—';
    let conflictWarning = '';

    if (isOcc) {
      secText = sessions.map(s => `<button onclick="selectAndLookupSection('${s.section}')" class="font-bold text-blue-800 hover:underline">${s.section}</button>`).join(', ');
      subjText = sessions.map(s => escapeHtml(s.subject)).join('<br>');
      codeText = sessions.map(s => escapeHtml(s.courseCode || '—')).join('<br>');
      facText = sessions.map(s => s.teachers.length ? escapeHtml(s.teachers.join(', ')) : '<span class="text-slate-400 italic">Unassigned</span>').join('<br>');
      grpText = sessions.map(s => s.group ? renderCategoryBadge(s.group) : '—').join('<br>');

      if (isShared) {
        conflictWarning = `<div class="mt-1 text-[11px] text-purple-700 bg-purple-50 p-1 rounded font-medium">
          ⚡ Shared Lecture / Potential multi-section cohort scheduled simultaneously.
        </div>`;
      }
    }

    // 1. Table row HTML
    tableHtml += `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-3 px-4 font-bold text-slate-900">
          <button onclick="openRoomModal('${escapeAttr(roomName)}')" class="text-blue-700 hover:underline font-black text-sm">
            ${escapeHtml(roomName)}
          </button>
        </td>
        <td class="py-3 px-3 text-slate-600">
          ${escapeHtml(rObj.building)}${rObj.floor !== null ? ` • Fl ${rObj.floor}` : ''}
        </td>
        <td class="py-3 px-3">${statusBadge}</td>
        <td class="py-3 px-4">${secText}</td>
        <td class="py-3 px-4 font-medium text-slate-800">${subjText}${conflictWarning}</td>
        <td class="py-3 px-3 font-mono text-[11px] text-slate-600">${codeText}</td>
        <td class="py-3 px-4 text-slate-700">${facText}</td>
        <td class="py-3 px-3">${grpText}</td>
        <td class="py-3 px-3 text-slate-500 whitespace-nowrap">${pInfo.start} - ${pInfo.end}</td>
        <td class="py-3 px-3 text-right">
          <button onclick="openRoomModal('${escapeAttr(roomName)}')" class="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold border border-slate-300">
            Details
          </button>
        </td>
      </tr>
    `;

    // 2. Card HTML
    cardsHtml += `
      <div class="room-card ${cardBorderClass} bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
        <div>
          <div class="flex items-start justify-between gap-2">
            <div>
              <button onclick="openRoomModal('${escapeAttr(roomName)}')" class="text-lg font-black text-slate-900 hover:text-blue-600 text-left">
                ${escapeHtml(roomName)}
              </button>
              <div class="text-xs text-slate-500">${escapeHtml(rObj.building)}${rObj.floor !== null ? ` • Floor ${rObj.floor}` : ''}</div>
            </div>
            <div>${statusBadge}</div>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
            ${isOcc ? `
              <div>
                <span class="text-slate-400 font-medium">Section:</span>
                <span class="font-bold text-blue-900 ml-1">${secText}</span>
              </div>
              ${sessions.some(s => s.group) ? `
                <div class="flex items-center gap-1 flex-wrap">
                  <span class="text-slate-400 font-medium">Category:</span>
                  ${sessions.filter(s => s.group).map(s => renderCategoryBadge(s.group)).join(' ')}
                </div>
              ` : ''}
              <div>
                <span class="text-slate-400 font-medium">Subject:</span>
                <div class="font-semibold text-slate-800 mt-0.5">${subjText}</div>
              </div>
              <div>
                <span class="text-slate-400 font-medium">Faculty:</span>
                <span class="text-slate-700 ml-1">${facText}</span>
              </div>
              ${conflictWarning}
            ` : `
              <div class="text-emerald-700 font-medium py-3">
                ✓ No class scheduled during Period ${period} (${pInfo.start}–${pInfo.end}). Verified vacant for university use.
              </div>
            `}
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>${rObj.roomType}</span>
          <button onclick="openRoomModal('${escapeAttr(roomName)}')" class="text-blue-600 font-bold hover:underline">
            Weekly Timetable →
          </button>
        </div>
      </div>
    `;
  });

  if (tbody) tbody.innerHTML = tableHtml || '<tr><td colspan="10" class="p-8 text-center text-slate-400">No rooms match filter.</td></tr>';
  if (cardsView) cardsView.innerHTML = cardsHtml;
}

// ========================================================
// 6. TAB 3: FLOOR EXPLORER (Floor-Wise Room Search)
// ========================================================

function renderFloorExplorer() {
  renderFloorPills();
  renderFloorGrid();
}

function onFloorBuildingChange() {
  const bldgSelect = document.getElementById('floorBuildingSelect');
  state.selectedFloorBuilding = bldgSelect.value;
  
  // Set default floor for that building
  if (state.selectedFloorBuilding === 'EB') state.selectedFloor = 3;
  else if (state.selectedFloorBuilding === 'Foundation Block') state.selectedFloor = 1;
  else if (state.selectedFloorBuilding === 'Law Block') state.selectedFloor = 4;
  else if (state.selectedFloorBuilding === 'SVH') state.selectedFloor = 2;
  else state.selectedFloor = 'other';

  renderFloorPills();
  renderFloorGrid();
}

function renderFloorPills() {
  const container = document.getElementById('floorPillsContainer');
  if (!container) return;

  const bKey = state.selectedFloorBuilding;
  let floors = [];

  if (bKey === 'EB') floors = [1, 2, 3, 4];
  else if (bKey === 'Foundation Block') floors = [1, 2, 3, 4];
  else if (bKey === 'Law Block') floors = [1, 3, 4];
  else if (bKey === 'SVH') floors = [1, 2, 3];
  else floors = ['All Labs'];

  let html = '';
  floors.forEach(f => {
    const isFloorActive = state.selectedFloor == f || (f === 'All Labs' && state.selectedFloor === 'other');
    const label = typeof f === 'number' ? `Floor ${f}` : f;
    const val = typeof f === 'number' ? f : 'other';

    html += `
      <button onclick="setFloor(${typeof f === 'number' ? f : `'other'`})" 
        class="px-3 py-1.5 text-xs font-bold rounded-lg border transition ${isFloorActive 
          ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}">
        ${label}
      </button>
    `;
  });

  container.innerHTML = html;
}

function setFloor(floorNum) {
  state.selectedFloor = floorNum;
  renderFloorPills();
  renderFloorGrid();
}

function renderFloorGrid() {
  const bKey = state.selectedFloorBuilding;
  const fKey = state.selectedFloor;
  const day = state.selectedDay;
  const period = state.selectedPeriod;

  // Find all rooms on this building and floor
  let floorRooms = [];
  if (bKey === 'Specialized Labs') {
    floorRooms = state.rooms.filter(r => getBuildingShortKey(r.building) === 'Specialized Labs' || r.floor === null);
  } else {
    floorRooms = state.rooms.filter(r => getBuildingShortKey(r.building) === bKey && r.floor === fKey);
  }

  // Update summary header
  let occCount = 0;
  let vacCount = 0;
  let unkCount = 0;

  const occCards = [];
  const vacCards = [];
  const unkCards = [];

  const occFilter = document.getElementById('floorOccupancyFilter')?.value || 'ALL';

  floorRooms.forEach(r => {
    const sessions = state.scheduleByRoomSlot[r.room]?.[day]?.[period] || [];
    const isOcc = sessions.length > 0;
    const isShared = sessions.length > 1;
    const nextClass = getNextScheduledClass(r.room, day, period);

    if (isOcc) {
      occCount++;
    } else {
      vacCount++;
    }

    if (occFilter === 'OCCUPIED' && !isOcc) return;
    if (occFilter === 'VACANT' && isOcc) return;

    let cardHtml = createFloorRoomCard(r, sessions, isOcc, isShared, nextClass, day, period);

    if (isOcc) {
      occCards.push(cardHtml);
    } else {
      vacCards.push(cardHtml);
    }
  });

  // Update badges & header stats
  const statsEl = document.getElementById('floorStatsText');
  const bOcc = document.getElementById('floorBadgeOccupied');
  const bVac = document.getElementById('floorBadgeVacant');
  const countOcc = document.getElementById('floorCountOccupied');
  const countVac = document.getElementById('floorCountVacant');

  const floorLabel = typeof fKey === 'number' ? `Floor ${fKey}` : 'All Labs';
  if (statsEl) statsEl.textContent = `${bKey} • ${floorLabel}: ${floorRooms.length} Verified Rooms`;
  if (bOcc) bOcc.textContent = `${occCount} Occupied`;
  if (bVac) bVac.textContent = `${vacCount} Vacant`;
  if (countOcc) countOcc.textContent = occCount;
  if (countVac) countVac.textContent = vacCount;

  // Render Grids
  const gridOcc = document.getElementById('floorGridOccupied');
  const gridVac = document.getElementById('floorGridVacant');

  if (gridOcc) {
    gridOcc.innerHTML = occCards.length ? occCards.join('') : '<div class="col-span-full p-6 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">No rooms are currently occupied on this floor.</div>';
  }
  if (gridVac) {
    gridVac.innerHTML = vacCards.length ? vacCards.join('') : '<div class="col-span-full p-6 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">No rooms are vacant on this floor.</div>';
  }
}

function createFloorRoomCard(r, sessions, isOcc, isShared, nextClass, day, period) {
  const pInfo = PERIOD_TIMINGS[period] || { start: '', end: '' };
  let statusBadge = '';
  let borderClass = 'is-vacant';

  if (isShared) {
    statusBadge = `<span class="badge-shared px-2 py-0.5 rounded text-[11px] font-bold">👥 Shared (${sessions.length} Secs)</span>`;
    borderClass = 'is-shared';
  } else if (isOcc) {
    statusBadge = `<span class="badge-occupied px-2 py-0.5 rounded text-[11px] font-bold">🔴 Occupied</span>`;
    borderClass = 'is-occupied';
  } else {
    statusBadge = `<span class="badge-vacant px-2 py-0.5 rounded text-[11px] font-bold">🟢 Vacant</span>`;
    borderClass = 'is-vacant';
  }

  let bodyContent = '';
  if (isOcc) {
    const secBadges = sessions.map(s => `
      <span class="inline-flex items-center gap-1">
        <span onclick="selectAndLookupSection('${s.section}')" class="font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 cursor-pointer hover:bg-blue-100">
          ${s.section}
        </span>
        ${s.group ? renderCategoryBadge(s.group) : ''}
      </span>
    `).join(' ');

    const subjs = sessions.map(s => escapeHtml(s.subject)).join(', ');
    const teachers = sessions.map(s => s.teachers.join(', ') || 'Unassigned').join(' | ');

    bodyContent = `
      <div class="space-y-1.5 text-xs text-slate-700">
        <div class="flex items-center gap-1 flex-wrap">
          <span class="text-slate-400 font-medium">Sec:</span>
          ${secBadges}
        </div>
        <div class="font-semibold text-slate-800 line-clamp-2" title="${escapeAttr(subjs)}">
          📘 ${subjs}
        </div>
        <div class="text-[11px] text-slate-600 truncate" title="${escapeAttr(teachers)}">
          👨‍🏫 ${escapeHtml(teachers)}
        </div>
      </div>
    `;
  } else {
    bodyContent = `
      <div class="text-xs text-emerald-800 space-y-1">
        <div class="font-semibold">✓ Free this period</div>
        <div class="text-[11px] text-slate-500">${nextClass}</div>
      </div>
    `;
  }

  return `
    <div class="room-card ${borderClass} bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between gap-1 mb-2">
          <button onclick="openRoomModal('${escapeAttr(r.room)}')" class="font-black text-sm text-slate-900 hover:text-blue-700 text-left">
            ${escapeHtml(r.room)}
          </button>
          ${statusBadge}
        </div>
        <div class="pt-2 border-t border-slate-100">
          ${bodyContent}
        </div>
      </div>

      <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <span class="text-slate-400 font-medium">${r.roomType}</span>
        <button onclick="openRoomModal('${escapeAttr(r.room)}')" class="text-blue-600 font-semibold hover:underline">
          View Week →
        </button>
      </div>
    </div>
  `;
}

function selectAllOnCurrentFloor() {
  const bKey = state.selectedFloorBuilding;
  const fKey = state.selectedFloor;
  
  let floorRooms = [];
  if (bKey === 'Specialized Labs') {
    floorRooms = state.rooms.filter(r => getBuildingShortKey(r.building) === 'Specialized Labs' || r.floor === null);
  } else {
    floorRooms = state.rooms.filter(r => getBuildingShortKey(r.building) === bKey && r.floor === fKey);
  }

  state.selectedRooms = floorRooms.map(r => r.room);
  switchTab('multiroom');
}

function quickFilterFloor(building, floor) {
  state.selectedFloorBuilding = building;
  state.selectedFloor = floor;
  const bSelect = document.getElementById('floorBuildingSelect');
  if (bSelect) bSelect.value = building;
  switchTab('floors');
}

// ========================================================
// 7. TAB 4: VACANT ROOMS CHECKER
// ========================================================

function renderVacantRooms() {
  const day = state.selectedDay;
  const startPeriod = state.selectedPeriod;
  const consec = document.getElementById('vacantConsecutiveSelect')?.value || '1';
  const bldgFilter = document.getElementById('vacantBuildingFilter')?.value || 'ALL';
  const typeFilter = document.getElementById('vacantTypeFilter')?.value || 'ALL';

  const container = document.getElementById('vacantCardsGrid');
  const empty = document.getElementById('vacantEmptyState');
  const countBadge = document.getElementById('vacantCountBadge');
  if (!container) return;

  // Determine periods to check
  const periodsToCheck = [];
  if (consec === 'REST_OF_DAY') {
    for (let p = startPeriod; p <= 9; p++) periodsToCheck.push(p);
  } else {
    const numP = parseInt(consec);
    for (let p = startPeriod; p < Math.min(10, startPeriod + numP); p++) {
      periodsToCheck.push(p);
    }
  }

  // Filter vacant rooms
  const vacantRooms = state.rooms.filter(r => {
    // Inventory Verification Rule: Room must exist in official room list
    if (!r.inventoryVerified) return false;

    // Building Filter
    if (bldgFilter !== 'ALL') {
      const bKey = getBuildingShortKey(r.building);
      if (bKey !== bldgFilter) return false;
    }

    // Type Filter
    if (typeFilter !== 'ALL' && r.roomType !== typeFilter) return false;

    // Vacancy Overlap Rule: Zero scheduled classes in ANY of the periods to check
    for (const p of periodsToCheck) {
      const sessions = state.scheduleByRoomSlot[r.room]?.[day]?.[p] || [];
      if (sessions.length > 0) {
        return false; // Occupied during this interval
      }
    }

    return true;
  });

  if (countBadge) countBadge.textContent = vacantRooms.length;

  if (vacantRooms.length === 0) {
    container.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');

  let html = '';
  vacantRooms.forEach(r => {
    const nextClass = getNextScheduledClass(r.room, day, periodsToCheck[periodsToCheck.length - 1]);
    const durationLabel = consec === 'REST_OF_DAY' 
      ? 'Rest of the day' 
      : `${periodsToCheck.length} period(s) (${PERIOD_TIMINGS[periodsToCheck[0]].start}–${PERIOD_TIMINGS[periodsToCheck[periodsToCheck.length - 1]].end})`;

    html += `
      <div class="room-card is-vacant bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
        <div>
          <div class="flex items-start justify-between">
            <div>
              <button onclick="openRoomModal('${escapeAttr(r.room)}')" class="font-black text-lg text-slate-900 hover:text-emerald-700 text-left">
                ${escapeHtml(r.room)}
              </button>
              <div class="text-xs text-slate-500">${escapeHtml(r.building)}${r.floor !== null ? ` • Floor ${r.floor}` : ''}</div>
            </div>
            <span class="badge-vacant px-2 py-0.5 rounded text-[11px] font-bold">🟢 Vacant</span>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
            <div class="text-emerald-800 font-semibold flex items-center gap-1.5">
              <span>✓ Guaranteed Free for:</span>
            </div>
            <div class="bg-emerald-50 text-emerald-900 font-bold px-2 py-1 rounded border border-emerald-200">
              ${durationLabel}
            </div>
            <div class="text-slate-500 pt-1 text-[11px]">
              <span class="font-medium text-slate-700">Next Occupancy:</span><br>
              ${nextClass}
            </div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span class="text-slate-400 font-medium text-[11px]">${r.roomType}</span>
          <button onclick="openRoomModal('${escapeAttr(r.room)}')" class="px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition">
            View Schedule
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ========================================================
// 8. TAB 5: SECTION LOOKUP & ROOM FINDER
// ========================================================

function renderSectionLookup() {
  populateSectionDropdown();
  renderSectionWeeklyTable();
  populateReverseRoomDropdown();
  runReverseRoomLookup();
}

function populateSectionDropdown() {
  const dropdown = document.getElementById('sectionSelectDropdown');
  if (!dropdown || dropdown.options.length > 0) return;

  state.sections.forEach(sec => {
    const opt = document.createElement('option');
    opt.value = sec;
    opt.textContent = sec;
    if (sec === state.selectedSection) opt.selected = true;
    dropdown.appendChild(opt);
  });
}

function onSectionSelectChange() {
  const dropdown = document.getElementById('sectionSelectDropdown');
  state.selectedSection = dropdown.value;
  renderSectionWeeklyTable();
}

function selectAndLookupSection(sec) {
  state.selectedSection = sec;
  const dropdown = document.getElementById('sectionSelectDropdown');
  if (dropdown) dropdown.value = sec;
  switchTab('sections');
  toggleReverseLookupMode(false);
}

function renderSectionWeeklyTable() {
  const sec = state.selectedSection;
  const titleEl = document.getElementById('selectedSectionTitle');
  const headerEl = document.getElementById('ttSectionNameHeader');
  const countEl = document.getElementById('selectedSectionSessionsCount');

  if (titleEl) titleEl.textContent = sec;
  if (headerEl) headerEl.textContent = sec;

  const headerRow = document.getElementById('sectionTTHeaderRow');
  const tbody = document.getElementById('sectionTTBody');
  if (!headerRow || !tbody) return;

  // Render Header
  headerRow.innerHTML = '<th class="py-3 px-3 text-left w-24 sticky left-0 bg-slate-200 z-10">Day</th>';
  for (let p = 1; p <= 9; p++) {
    const pInfo = PERIOD_TIMINGS[p];
    headerRow.innerHTML += `
      <th class="py-2.5 px-3 text-center border-l border-slate-200 min-w-[125px]">
        <div>Period ${p}</div>
        <div class="text-[10px] font-normal text-slate-500">${pInfo.start}–${pInfo.end}</div>
      </th>
    `;
  }

  // Count total sessions for this section
  let totalClassCount = 0;
  let bodyHtml = '';

  DAYS_OF_WEEK.forEach(day => {
    bodyHtml += `<tr>`;
    bodyHtml += `<td class="py-3 px-3 font-bold text-slate-800 bg-slate-100/90 sticky left-0 z-10 border-b border-slate-200">${day}</td>`;

    for (let p = 1; p <= 9; p++) {
      const sessions = state.scheduleBySection[sec]?.[day]?.[p] || [];
      totalClassCount += sessions.length;

      if (sessions.length === 0) {
        bodyHtml += `<td class="py-3 px-2 text-center text-slate-300 border-l border-slate-200 bg-white font-mono">-</td>`;
      } else {
        let cellContent = '';
        sessions.forEach(s => {
          const isLab = s.type === 'lab';
          const bgCol = isLab ? 'bg-amber-50/80 border-amber-300 text-amber-950' : 'bg-blue-50/80 border-blue-200 text-blue-950';

          cellContent += `
            <div class="p-2 mb-1.5 rounded-lg border ${bgCol} text-left shadow-xs transition hover:shadow-sm">
              <div class="font-bold text-[11px] leading-tight line-clamp-2">${escapeHtml(s.subject)}</div>
              ${s.group ? `<div class="mt-1">${renderCategoryBadge(s.group)}</div>` : ''}
              <div class="mt-1 text-[10px] text-slate-600 truncate">👨‍🏫 ${escapeHtml(s.teachers.join(', ') || 'Unassigned')}</div>
              <div class="mt-1">
                ${s.room ? `
                  <button onclick="openRoomModal('${escapeAttr(s.room)}')" class="inline-flex items-center gap-1 font-bold text-[10px] text-blue-700 hover:underline bg-white px-1.5 py-0.5 rounded border border-slate-300">
                    🏫 ${escapeHtml(s.room)}
                  </button>
                ` : `<span class="text-[10px] text-red-500 italic">No room assigned</span>`}
              </div>
            </div>
          `;
        });

        bodyHtml += `<td class="py-2 px-2 border-l border-slate-200 align-top bg-slate-50/40">${cellContent}</td>`;
      }
    }
    bodyHtml += `</tr>`;
  });

  tbody.innerHTML = bodyHtml;
  if (countEl) countEl.textContent = `${totalClassCount} sessions / week`;
}

function toggleReverseLookupMode(isReverse) {
  const ttView = document.getElementById('sectionWeeklyTimetableView');
  const revView = document.getElementById('reverseLookupView');
  const btnTT = document.getElementById('btnModeSectionTT');
  const btnRev = document.getElementById('btnModeReverseLookup');

  if (isReverse) {
    ttView.classList.add('hidden');
    revView.classList.remove('hidden');
    btnTT.className = 'px-3 py-1 font-semibold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
    btnRev.className = 'px-3 py-1 font-semibold rounded bg-blue-600 text-white shadow-sm transition';
  } else {
    ttView.classList.remove('hidden');
    revView.classList.add('hidden');
    btnTT.className = 'px-3 py-1 font-semibold rounded bg-blue-600 text-white shadow-sm transition';
    btnRev.className = 'px-3 py-1 font-semibold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
  }
}

function populateReverseRoomDropdown() {
  const dropdown = document.getElementById('reverseRoomSelect');
  if (!dropdown || dropdown.options.length > 0) return;

  state.rooms.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.room;
    opt.textContent = `${r.room} (${r.building}${r.floor !== null ? ` Fl ${r.floor}` : ''})`;
    if (r.room === 'EB 402') opt.selected = true;
    dropdown.appendChild(opt);
  });
}

function runReverseRoomLookup() {
  const room = document.getElementById('reverseRoomSelect')?.value || 'EB 402';
  const day = document.getElementById('reverseDaySelect')?.value || 'Wednesday';
  const period = parseInt(document.getElementById('reversePeriodSelect')?.value || '5');
  const card = document.getElementById('reverseLookupResultCard');
  if (!card) return;

  const sessions = state.scheduleByRoomSlot[room]?.[day]?.[period] || [];
  const pInfo = PERIOD_TIMINGS[period];
  const rObj = state.rooms.find(r => r.room === room);

  if (sessions.length === 0) {
    card.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="text-2xl">🟢</div>
        <div>
          <h3 class="text-sm font-bold text-emerald-800">Room ${escapeHtml(room)} is Verified Vacant</h3>
          <p class="text-xs text-slate-600 mt-1">
            No class section is scheduled to use <strong>${escapeHtml(room)}</strong> on <strong>${day}</strong> during <strong>Period ${period} (${pInfo.start} - ${pInfo.end})</strong>.
          </p>
          <div class="mt-3 flex gap-2">
            <button onclick="openRoomModal('${escapeAttr(room)}')" class="px-3 py-1 bg-white border border-slate-300 font-semibold rounded text-xs hover:bg-slate-50 transition">
              View ${escapeHtml(room)} Full Schedule
            </button>
          </div>
        </div>
      </div>
    `;
    return;
  }

  let sectionsHtml = '';
  sessions.forEach((s, idx) => {
    sectionsHtml += `
      <div class="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
        <div class="flex items-center justify-between">
          <span class="text-sm font-black text-blue-900 cursor-pointer hover:underline" onclick="selectAndLookupSection('${s.section}')">
            ${s.section}
          </span>
          ${s.group ? renderCategoryBadge(s.group) : ''}
        </div>
        <div class="font-bold text-slate-800 text-xs">${escapeHtml(s.subject)}</div>
        <div class="text-xs text-slate-600 font-mono">Code: ${escapeHtml(s.courseCode || '—')}</div>
        <div class="text-xs text-slate-700">👨‍🏫 Faculty: <strong>${escapeHtml(s.teachers.join(', ') || 'Unassigned')}</strong></div>
      </div>
    `;
  });

  card.innerHTML = `
    <div>
      <div class="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
        <span class="font-black text-base text-slate-900">Occupancy for ${escapeHtml(room)}</span>
        <span class="text-xs font-semibold text-blue-700">${day}, Period ${period} (${pInfo.start} - ${pInfo.end})</span>
      </div>
      <p class="text-xs text-slate-600 mb-3">
        Found <strong class="text-blue-900">${sessions.length} section(s)</strong> scheduled in this room at this time:
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        ${sectionsHtml}
      </div>
      <div class="mt-4 pt-3 border-t border-slate-200 flex justify-end">
        <button onclick="openRoomModal('${escapeAttr(room)}')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs transition">
          View Room ${escapeHtml(room)} Complete Week →
        </button>
      </div>
    </div>
  `;
}

// ========================================================
// 9. TAB 6: MASTER TIMETABLE VIEWER
// ========================================================

function renderMasterTimetable() {
  populateMasterDropdown();
  renderMasterTableGrid();
}

function setMasterViewMode(mode) {
  state.masterMode = mode;
  document.getElementById('btnMasterModeRoom').className = mode === 'room' ? 'flex-1 py-1.5 rounded-md bg-white text-blue-900 shadow-sm transition' : 'flex-1 py-1.5 rounded-md text-slate-600 transition';
  document.getElementById('btnMasterModeSection').className = mode === 'section' ? 'flex-1 py-1.5 rounded-md bg-white text-blue-900 shadow-sm transition' : 'flex-1 py-1.5 rounded-md text-slate-600 transition';
  document.getElementById('btnMasterModeFaculty').className = mode === 'faculty' ? 'flex-1 py-1.5 rounded-md bg-white text-blue-900 shadow-sm transition' : 'flex-1 py-1.5 rounded-md text-slate-600 transition';

  const label = document.getElementById('masterSelectLabel');
  if (label) {
    if (mode === 'room') label.textContent = 'Select Room:';
    else if (mode === 'section') label.textContent = 'Select Class Section:';
    else label.textContent = 'Select Faculty Member:';
  }

  populateMasterDropdown();
  renderMasterTableGrid();
}

function populateMasterDropdown() {
  const select = document.getElementById('masterTargetSelect');
  if (!select) return;

  select.innerHTML = '';
  let list = [];

  if (state.masterMode === 'room') {
    list = state.rooms.map(r => r.room);
    if (!list.includes(state.masterTarget)) state.masterTarget = 'EB 301';
  } else if (state.masterMode === 'section') {
    list = state.sections;
    if (!list.includes(state.masterTarget)) state.masterTarget = '2CSE10';
  } else {
    list = state.teachers;
    if (!list.includes(state.masterTarget)) state.masterTarget = list[0] || '';
  }

  list.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    if (item === state.masterTarget) opt.selected = true;
    select.appendChild(opt);
  });
}

function renderMasterTableGrid() {
  const select = document.getElementById('masterTargetSelect');
  if (select) state.masterTarget = select.value;
  const target = state.masterTarget;

  const heading = document.getElementById('masterTableHeading');
  if (heading) {
    heading.textContent = `${state.masterMode.toUpperCase()}: ${target}`;
  }

  const headerRow = document.getElementById('masterHeaderRow');
  const tbody = document.getElementById('masterTableBody');
  if (!headerRow || !tbody) return;

  headerRow.innerHTML = '<th class="py-2.5 px-3 text-left w-24 sticky left-0 bg-slate-200 z-10">Day</th>';
  for (let p = 1; p <= 9; p++) {
    const pInfo = PERIOD_TIMINGS[p];
    headerRow.innerHTML += `
      <th class="py-2 px-3 text-center border-l border-slate-200 min-w-[130px]">
        <div>Period ${p}</div>
        <div class="text-[10px] font-normal text-slate-500">${pInfo.start}–${pInfo.end}</div>
      </th>
    `;
  }

  let bodyHtml = '';
  DAYS_OF_WEEK.forEach(day => {
    bodyHtml += `<tr>`;
    bodyHtml += `<td class="py-3 px-3 font-bold text-slate-800 bg-slate-100/90 sticky left-0 z-10 border-b border-slate-200">${day}</td>`;

    for (let p = 1; p <= 9; p++) {
      let sessions = [];
      if (state.masterMode === 'room') {
        sessions = state.scheduleByRoomSlot[target]?.[day]?.[p] || [];
      } else if (state.masterMode === 'section') {
        sessions = state.scheduleBySection[target]?.[day]?.[p] || [];
      } else {
        sessions = state.scheduleByTeacher[target]?.[day]?.[p] || [];
      }

      if (sessions.length === 0) {
        bodyHtml += `<td class="py-3 px-2 text-center text-slate-300 border-l border-slate-200 font-mono">-</td>`;
      } else {
        let cell = '';
        sessions.forEach(s => {
          cell += `
            <div class="p-2 mb-1 rounded border bg-slate-50 text-left text-[11px] shadow-xs">
              <div class="font-bold text-blue-900 flex items-center justify-between gap-1 flex-wrap">
                <span>${s.section}</span>
                ${s.group ? renderCategoryBadge(s.group) : ''}
              </div>
              <div class="font-medium text-slate-800 truncate" title="${escapeAttr(s.subject)}">${escapeHtml(s.subject)}</div>
              <div class="text-[10px] text-slate-500">🏫 ${escapeHtml(s.room || 'No Room')}</div>
              <div class="text-[10px] text-slate-600 truncate">👨‍🏫 ${escapeHtml(s.teachers.join(', ') || 'Unassigned')}</div>
            </div>
          `;
        });
        bodyHtml += `<td class="py-2 px-2 border-l border-slate-200 align-top">${cell}</td>`;
      }
    }
    bodyHtml += `</tr>`;
  });

  tbody.innerHTML = bodyHtml;
}

// ========================================================
// 10. UNIFIED GLOBAL SEARCH
// ========================================================

function handleGlobalSearch(query) {
  const resultsDropdown = document.getElementById('globalSearchResults');
  if (!resultsDropdown) return;

  const q = query.trim().toLowerCase();
  if (q.length < 2) {
    resultsDropdown.classList.add('hidden');
    return;
  }

  // Find Room Matches
  const matchedRooms = state.rooms.filter(r => r.room.toLowerCase().includes(q)).slice(0, 5);

  // Find Section Matches
  const matchedSections = state.sections.filter(s => s.toLowerCase().includes(q)).slice(0, 5);

  // Find Faculty Matches
  const matchedTeachers = state.teachers.filter(t => t.toLowerCase().includes(q)).slice(0, 5);

  // Find Subject Matches
  const matchedClasses = state.classes.filter(c => c.subject.toLowerCase().includes(q) || (c.courseCode && c.courseCode.toLowerCase().includes(q))).slice(0, 4);

  let html = '';

  if (matchedRooms.length > 0) {
    html += `<div class="p-2 bg-slate-100 font-bold text-[11px] text-slate-500 uppercase">🏢 Rooms</div>`;
    matchedRooms.forEach(r => {
      html += `
        <div onclick="selectGlobalRoom('${escapeAttr(r.room)}')" class="px-4 py-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center text-xs">
          <span class="font-bold text-slate-900">${escapeHtml(r.room)}</span>
          <span class="text-slate-500 text-[11px]">${escapeHtml(r.building)}</span>
        </div>
      `;
    });
  }

  if (matchedSections.length > 0) {
    html += `<div class="p-2 bg-slate-100 font-bold text-[11px] text-slate-500 uppercase">👥 Class Sections</div>`;
    matchedSections.forEach(s => {
      html += `
        <div onclick="selectGlobalSection('${escapeAttr(s)}')" class="px-4 py-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center text-xs">
          <span class="font-bold text-blue-900">${escapeHtml(s)}</span>
          <span class="text-slate-500 text-[11px]">View Weekly Schedule →</span>
        </div>
      `;
    });
  }

  if (matchedTeachers.length > 0) {
    html += `<div class="p-2 bg-slate-100 font-bold text-[11px] text-slate-500 uppercase">👨‍🏫 Faculty Members</div>`;
    matchedTeachers.forEach(t => {
      html += `
        <div onclick="selectGlobalFaculty('${escapeAttr(t)}')" class="px-4 py-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center text-xs">
          <span class="font-bold text-slate-800">${escapeHtml(t)}</span>
          <span class="text-slate-500 text-[11px]">Faculty Timetable →</span>
        </div>
      `;
    });
  }

  if (matchedClasses.length > 0) {
    html += `<div class="p-2 bg-slate-100 font-bold text-[11px] text-slate-500 uppercase">📘 Subjects</div>`;
    matchedClasses.forEach(c => {
      html += `
        <div onclick="selectGlobalSection('${escapeAttr(c.section)}')" class="px-4 py-2 hover:bg-blue-50 cursor-pointer text-xs">
          <div class="font-bold text-slate-900">${escapeHtml(c.subject)}</div>
          <div class="text-[11px] text-slate-500">${c.section} • ${c.room || 'No Room'} • ${c.day} P${c.period}</div>
        </div>
      `;
    });
  }

  if (!html) {
    html = '<div class="p-4 text-center text-slate-400 text-xs">No matching rooms, sections, or faculty found.</div>';
  }

  resultsDropdown.innerHTML = html;
  resultsDropdown.classList.remove('hidden');
}

function selectGlobalRoom(room) {
  openRoomModal(room);
  document.getElementById('globalSearchResults')?.classList.add('hidden');
}

function selectGlobalSection(section) {
  selectAndLookupSection(section);
  document.getElementById('globalSearchResults')?.classList.add('hidden');
}

function selectGlobalFaculty(faculty) {
  setMasterViewMode('faculty');
  state.masterTarget = faculty;
  const select = document.getElementById('masterTargetSelect');
  if (select) select.value = faculty;
  switchTab('timetable');
  document.getElementById('globalSearchResults')?.classList.add('hidden');
}

// ========================================================
// 11. ROOM SCHEDULE MODAL
// ========================================================

function openRoomModal(roomName) {
  const modal = document.getElementById('roomModal');
  const title = document.getElementById('modalRoomTitle');
  const typeBadge = document.getElementById('modalRoomTypeBadge');
  const location = document.getElementById('modalRoomLocation');
  const banner = document.getElementById('modalSlotStatusBanner');
  const list = document.getElementById('modalWeeklyScheduleList');

  if (!modal) return;

  const rObj = state.rooms.find(r => r.room === roomName) || {
    room: roomName,
    building: 'Unknown',
    floor: null,
    roomType: 'Classroom'
  };

  if (title) title.textContent = roomName;
  if (typeBadge) typeBadge.textContent = rObj.roomType;
  if (location) location.textContent = `${rObj.building}${rObj.floor !== null ? ` • Floor ${rObj.floor}` : ''}`;

  // Current slot banner
  const day = state.selectedDay;
  const period = state.selectedPeriod;
  const sessions = state.scheduleByRoomSlot[roomName]?.[day]?.[period] || [];
  const pInfo = PERIOD_TIMINGS[period];

  if (sessions.length > 0) {
    const secList = sessions.map(s => `${s.section}${s.group ? ` (${s.group})` : ''}`).join(', ');
    const subjList = sessions.map(s => s.subject).join('; ');
    banner.className = 'p-3 rounded-xl border bg-red-50 border-red-200 text-red-900 flex items-center justify-between';
    banner.innerHTML = `
      <div>
        <div class="font-bold flex items-center gap-1.5 text-xs">
          <span class="w-2 h-2 rounded-full bg-red-600"></span> Currently Scheduled as Occupied
        </div>
        <div class="text-[11px] text-red-800 mt-0.5">
          ${day}, Period ${period} (${pInfo.start}–${pInfo.end}) • Section: <strong>${secList}</strong> (${subjList})
        </div>
      </div>
      <span class="badge-occupied px-2 py-0.5 rounded font-bold text-[11px]">Occupied</span>
    `;
  } else {
    banner.className = 'p-3 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900 flex items-center justify-between';
    banner.innerHTML = `
      <div>
        <div class="font-bold flex items-center gap-1.5 text-xs">
          <span class="w-2 h-2 rounded-full bg-emerald-600"></span> Currently Verified Vacant
        </div>
        <div class="text-[11px] text-emerald-800 mt-0.5">
          ${day}, Period ${period} (${pInfo.start}–${pInfo.end}) • Zero overlapping classes.
        </div>
      </div>
      <span class="badge-vacant px-2 py-0.5 rounded font-bold text-[11px]">Vacant</span>
    `;
  }

  // Compile weekly schedule list
  let schedHtml = '';
  DAYS_OF_WEEK.forEach(d => {
    let daySessions = [];
    for (let p = 1; p <= 9; p++) {
      const pSessions = state.scheduleByRoomSlot[roomName]?.[d]?.[p] || [];
      pSessions.forEach(s => daySessions.push({ period: p, ...s }));
    }

    if (daySessions.length > 0) {
      schedHtml += `<div class="bg-slate-50 p-3 rounded-xl border border-slate-200">`;
      schedHtml += `<div class="font-bold text-xs text-blue-900 mb-1.5">${d} (${daySessions.length} sessions)</div>`;
      schedHtml += `<div class="space-y-1">`;
      daySessions.forEach(s => {
        const pTiming = PERIOD_TIMINGS[s.period];
        schedHtml += `
          <div class="text-[11px] flex items-center justify-between p-1 rounded hover:bg-white transition border border-transparent hover:border-slate-200">
            <div>
              <span class="font-bold text-slate-800">Period ${s.period} (${pTiming.start}–${pTiming.end})</span>:
              <span class="text-blue-800 font-bold ml-1">${s.section}</span>
              ${s.group ? `<span class="ml-1">${renderCategoryBadge(s.group)}</span>` : ''}
              <span class="text-slate-600 ml-1">• ${escapeHtml(s.subject)}</span>
            </div>
            <div class="text-[10px] text-slate-500">${s.teachers.join(', ') || 'Unassigned'}</div>
          </div>
        `;
      });
      schedHtml += `</div></div>`;
    }
  });

  if (!schedHtml) {
    schedHtml = '<div class="p-4 text-center text-slate-400">No classes scheduled in this room throughout the week.</div>';
  }

  if (list) list.innerHTML = schedHtml;
  modal.classList.remove('hidden');
}

function closeRoomModal() {
  const modal = document.getElementById('roomModal');
  if (modal) modal.classList.add('hidden');
}

// ========================================================
// 12. UTILITY & EVENT HELPERS
// ========================================================

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'");
}

function showFatalError(msg) {
  const main = document.querySelector('main');
  if (main) {
    main.innerHTML = `
      <div class="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-red-900 max-w-lg mx-auto mt-12 shadow-md">
        <div class="text-4xl mb-3">⚠️</div>
        <h2 class="text-lg font-bold">Data Loading Warning</h2>
        <p class="text-xs text-red-700 mt-2">${escapeHtml(msg)}</p>
        <p class="text-[11px] text-slate-500 mt-4">
          Please run a local development server (e.g. <code>powershell -File server.ps1</code>) or access via GitHub Pages / Vercel.
        </p>
      </div>
    `;
  }
}

function setupEventListeners() {
  // Global search shortcut (Ctrl+K or /)
  window.addEventListener('keydown', e => {
    if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && document.activeElement.tagName !== 'INPUT')) {
      e.preventDefault();
      document.getElementById('globalSearchInput')?.focus();
    }
    if (e.key === 'Escape') {
      closeRoomModal();
      document.getElementById('globalSearchResults')?.classList.add('hidden');
    }
  });

  // Close search results dropdown on outside click
  document.addEventListener('click', e => {
    const input = document.getElementById('globalSearchInput');
    const dropdown = document.getElementById('globalSearchResults');
    if (input && dropdown && !input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
