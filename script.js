// 텍스트 입력과 음성 입력 모드 전환을 관리
const modeButtons = document.querySelectorAll("[data-mode]");
const panels = document.querySelectorAll("[data-panel]");
const mainWindow = document.querySelector("#main-window");
const memoText = document.querySelector("#memo-text");
const queueNoteButton = document.querySelector("#queue-note");
const notesLayer = document.querySelector("#notes-layer");
const noteCount = document.querySelector("#note-count");
const openLogButton = document.querySelector("#open-log");
const closeLogButton = document.querySelector("#close-log");
const logWindow = document.querySelector("#log-window");
const logList = document.querySelector("#log-list");
const voiceStatus = document.querySelector("#voice-status");
const voiceTranscript = document.querySelector("#voice-transcript");
const voiceToggleButton = document.querySelector("#voice-toggle");
const queueVoiceNoteButton = document.querySelector("#queue-voice-note");

const deletedLogKey = "sticky-notes.deleted-log.v1";
const maxDeletedLogEntries = 200;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const noteThemes = [
  {
    name: "orbital-black",
    background: "#111827",
    text: "#f8fbff",
    outline: "#05070d",
  },
  {
    name: "mission-blue",
    background: "#173f6f",
    text: "#f5f9ff",
    outline: "#061324",
  },
  {
    name: "solar-copper",
    background: "#6f2f1d",
    text: "#fff4df",
    outline: "#1d0904",
  },
  {
    name: "radar-green",
    background: "#123c2f",
    text: "#effff8",
    outline: "#03130e",
  },
  {
    name: "plasma-violet",
    background: "#35215f",
    text: "#fff8ff",
    outline: "#10061f",
  },
  {
    name: "heat-shield",
    background: "#4c1f2f",
    text: "#fff5ef",
    outline: "#16070c",
  },
];
const minNoteFontSize = 11;
const maxNoteFontSize = 20;
let noteTotal = 0;
let topNoteZIndex = 30;
let speechRecognition = null;
let isRecognizing = false;
let finalTranscript = "";

function setInputMode(nextMode) {
  modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === nextMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  panels.forEach((panel) => {
    panel.classList.toggle("is-hidden", panel.dataset.panel !== nextMode);
  });
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setInputMode(button.dataset.mode);
  });
});

function getRandomNoteTheme() {
  return noteThemes[Math.floor(Math.random() * noteThemes.length)];
}

function formatNoteTime(date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const time = date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${year}.${month}.${day} ${time}`;
}

function updateNoteCount() {
  const count = notesLayer.querySelectorAll(".note-card").length;
  noteCount.textContent = `${count} item(s)`;
}

function readDeletedLog() {
  const rawLog = localStorage.getItem(deletedLogKey);

  if (!rawLog) {
    return [];
  }

  try {
    const parsedLog = JSON.parse(rawLog);
    return Array.isArray(parsedLog) ? parsedLog : [];
  } catch {
    return [];
  }
}

function writeDeletedLog(entries) {
  try {
    localStorage.setItem(deletedLogKey, JSON.stringify(entries.slice(0, maxDeletedLogEntries)));
    return true;
  } catch (error) {
    console.warn("Deleted note log could not be saved.", error);
    return false;
  }
}

function appendDeletedLog(entry) {
  const entries = readDeletedLog();
  entries.unshift(entry);
  return writeDeletedLog(entries);
}

function formatStoredTime(isoTime) {
  return formatNoteTime(new Date(isoTime));
}

function redactSensitiveText(text) {
  const redactions = [
    {
      pattern: /\b[A-Za-z]:\\(?:[^<>:"|?*\r\n]+\\)*[^<>:"|?*\r\n]*/g,
      replacement: "[REDACTED_PATH]",
    },
    {
      pattern: /(?:^|\s)(?:\.{0,2}\/|~\/)(?:[^\s"'<>]+\/)*[^\s"'<>]*/g,
      replacement: " [REDACTED_PATH]",
    },
    {
      pattern: /\b[\w.-]+\.(?:env|pem|key|p12|pfx|crt|cer|sqlite|db|json|yaml|yml|ini|toml)\b/gi,
      replacement: "[REDACTED_FILE]",
    },
    {
      pattern: /\b(?:api[_-]?key|secret|token|password|passwd|pwd|access[_-]?token|refresh[_-]?token)\s*[:=]\s*["']?[^"'\s,;]+/gi,
      replacement: "[REDACTED_SECRET]",
    },
    {
      pattern: /\b(?:sk|pk|ghp|github_pat|xoxb|xoxp|AKIA|ASIA)[A-Za-z0-9_-]{12,}\b/g,
      replacement: "[REDACTED_TOKEN]",
    },
    {
      pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
      replacement: "[REDACTED_PRIVATE_KEY]",
    },
  ];

  return redactions.reduce((safeText, redaction) => {
    return safeText.replace(redaction.pattern, redaction.replacement);
  }, text);
}

function renderDeletedLog() {
  const entries = readDeletedLog();
  logList.replaceChildren();

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "log-empty";
    empty.textContent = "No deleted notes.";
    logList.append(empty);
    return;
  }

  entries.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "log-entry";

    const meta = document.createElement("div");
    meta.className = "log-meta";

    const createdAt = document.createElement("span");
    createdAt.textContent = `CREATED ${formatStoredTime(entry.createdAt)}`;

    const deletedAt = document.createElement("span");
    deletedAt.textContent = `DELETED ${formatStoredTime(entry.deletedAt)}`;

    const details = document.createElement("span");
    details.textContent = `ID ${entry.id} / THEME ${entry.theme} / FONT ${entry.fontSize}px`;

    const content = document.createElement("p");
    content.className = "log-content";
    content.textContent = entry.content;

    meta.append(createdAt, deletedAt, details);
    item.append(meta, content);
    logList.append(item);
  });
}

function getNextNotePosition() {
  const desktopRect = document.querySelector(".desktop").getBoundingClientRect();
  const windowRect = mainWindow.getBoundingClientRect();
  const noteWidth = Math.min(240, window.innerWidth - 28);
  const noteHeight = 148;
  const gap = 16;
  const offset = (noteTotal % 5) * 18;
  const rightSpace = desktopRect.right - windowRect.right;
  const leftSpace = windowRect.left - desktopRect.left;

  let left = windowRect.right + gap + offset;
  let top = windowRect.top + offset;

  if (rightSpace < noteWidth + gap && leftSpace >= noteWidth + gap) {
    left = windowRect.left - noteWidth - gap - offset;
  }

  if (rightSpace < noteWidth + gap && leftSpace < noteWidth + gap) {
    left = gap + offset;
    top = windowRect.bottom + gap + offset;
  }

  return {
    left: Math.max(gap, Math.min(left, window.innerWidth - noteWidth - gap)),
    top: Math.max(gap, Math.min(top, window.innerHeight - noteHeight - gap)),
  };
}

function moveNoteToFront(note) {
  topNoteZIndex += 1;
  note.style.zIndex = String(topNoteZIndex);
}

function enableNoteDrag(note) {
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  let didDrag = false;
  let suppressNextClick = false;

  note.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".note-check, .note-font-button") || note.classList.contains("is-removing")) {
      return;
    }

    moveNoteToFront(note);
    didDrag = false;
    startX = event.clientX;
    startY = event.clientY;
    startLeft = note.offsetLeft;
    startTop = note.offsetTop;
    note.setPointerCapture(event.pointerId);
  });

  note.addEventListener("pointermove", (event) => {
    if (!note.hasPointerCapture(event.pointerId)) {
      return;
    }

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    if (Math.abs(deltaX) + Math.abs(deltaY) > 4) {
      didDrag = true;
      suppressNextClick = true;
    }

    note.style.left = `${startLeft + deltaX}px`;
    note.style.top = `${startTop + deltaY}px`;
  });

  note.addEventListener("pointerup", (event) => {
    if (note.hasPointerCapture(event.pointerId)) {
      note.releasePointerCapture(event.pointerId);
    }

    didDrag = false;
  });

  note.addEventListener("click", (event) => {
    if (suppressNextClick) {
      suppressNextClick = false;
      event.stopImmediatePropagation();
    }
  }, true);
}

function updateNoteOverflow(note) {
  const body = note.querySelector(".note-body");
  const more = note.querySelector(".note-more");
  const wasExpanded = note.classList.contains("is-expanded");

  note.classList.remove("is-expanded");
  const isOverflowing = body.scrollHeight > body.clientHeight + 1;
  note.classList.toggle("is-long", isOverflowing);

  if (!isOverflowing) {
    more.textContent = "More";
    return;
  }

  note.classList.toggle("is-expanded", wasExpanded);
  more.textContent = wasExpanded ? "Less" : "More";
}

function updateAllNoteOverflow() {
  notesLayer.querySelectorAll(".note-card").forEach(updateNoteOverflow);
}

function createNote(content) {
  const note = document.createElement("article");
  const position = getNextNotePosition();
  const theme = getRandomNoteTheme();

  note.className = "note-card";
  note.style.setProperty("--note-color", theme.background);
  note.style.setProperty("--note-text", theme.text);
  note.style.setProperty("--note-outline", theme.outline);
  note.style.left = `${position.left}px`;
  note.style.top = `${position.top}px`;
  note.style.zIndex = String(topNoteZIndex);
  note.style.setProperty("--note-font-size", "13px");
  note.dataset.noteTheme = theme.name;
  note.dataset.noteId = `note-${Date.now()}-${noteTotal}`;
  note.dataset.noteFontSize = "13";
  note.dataset.noteCreatedAt = new Date().toISOString();

  const checkButton = document.createElement("button");
  checkButton.className = "note-check";
  checkButton.type = "button";
  checkButton.setAttribute("aria-label", "메모 완료");

  const fontControls = document.createElement("div");
  fontControls.className = "note-font-controls";

  const decreaseFontButton = document.createElement("button");
  decreaseFontButton.className = "note-font-button";
  decreaseFontButton.type = "button";
  decreaseFontButton.textContent = "-";
  decreaseFontButton.setAttribute("aria-label", "메모 글씨 작게");

  const increaseFontButton = document.createElement("button");
  increaseFontButton.className = "note-font-button";
  increaseFontButton.type = "button";
  increaseFontButton.textContent = "+";
  increaseFontButton.setAttribute("aria-label", "메모 글씨 크게");

  fontControls.append(decreaseFontButton, increaseFontButton);

  const time = document.createElement("span");
  time.className = "note-time";
  time.textContent = formatStoredTime(note.dataset.noteCreatedAt);

  const body = document.createElement("p");
  body.className = "note-body";
  body.textContent = content;

  const more = document.createElement("span");
  more.className = "note-more";
  more.textContent = "More";

  note.append(checkButton, fontControls, time, body, more);
  notesLayer.append(note);
  noteTotal += 1;
  moveNoteToFront(note);
  enableNoteDrag(note);
  updateNoteCount();
  requestAnimationFrame(() => updateNoteOverflow(note));

  note.addEventListener("click", () => {
    if (!note.classList.contains("is-long") || note.classList.contains("is-removing")) {
      return;
    }

    const expanded = note.classList.toggle("is-expanded");
    more.textContent = expanded ? "Less" : "More";
  });

  checkButton.addEventListener("click", (event) => {
    event.stopPropagation();
    appendDeletedLog({
      id: note.dataset.noteId,
      content,
      createdAt: note.dataset.noteCreatedAt,
      deletedAt: new Date().toISOString(),
      theme: note.dataset.noteTheme,
      fontSize: Number.parseInt(note.dataset.noteFontSize, 10) || 13,
    });
    note.classList.add("is-removing");
    window.setTimeout(() => {
      note.remove();
      updateNoteCount();
    }, 700);
  });

  decreaseFontButton.addEventListener("click", (event) => {
    event.stopPropagation();
    changeNoteFontSize(note, -1);
  });

  increaseFontButton.addEventListener("click", (event) => {
    event.stopPropagation();
    changeNoteFontSize(note, 1);
  });
}

function changeNoteFontSize(note, delta) {
  const currentSize = Number.parseInt(note.style.getPropertyValue("--note-font-size"), 10) || 13;
  const nextSize = Math.max(minNoteFontSize, Math.min(maxNoteFontSize, currentSize + delta));
  note.style.setProperty("--note-font-size", `${nextSize}px`);
  note.dataset.noteFontSize = String(nextSize);
  requestAnimationFrame(() => updateNoteOverflow(note));
}

function queueNote() {
  const content = redactSensitiveText(memoText.value.trim());

  if (!content) {
    memoText.focus();
    return;
  }

  createNote(content);
  memoText.value = "";
  memoText.focus();
}

function queueVoiceNote() {
  const content = redactSensitiveText(voiceTranscript.value.trim());

  if (!content) {
    voiceTranscript.focus();
    return;
  }

  createNote(content);
  voiceTranscript.value = "";
  finalTranscript = "";
  voiceTranscript.focus();
}

function setVoiceStatus(message) {
  voiceStatus.textContent = message;
}

function setVoiceRecognitionState(nextState) {
  isRecognizing = nextState;
  voiceToggleButton.textContent = isRecognizing ? "Stop Rec" : "Start Rec";
}

function initializeSpeechRecognition() {
  if (!SpeechRecognition) {
    setVoiceStatus("Speech recognition is not supported in this browser.");
    voiceToggleButton.disabled = true;
    queueVoiceNoteButton.disabled = false;
    return;
  }

  speechRecognition = new SpeechRecognition();
  speechRecognition.lang = "ko-KR";
  speechRecognition.continuous = true;
  speechRecognition.interimResults = true;

  speechRecognition.addEventListener("start", () => {
    setVoiceRecognitionState(true);
    setVoiceStatus("Listening...");
  });

  speechRecognition.addEventListener("result", (event) => {
    let interimTranscript = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = event.results[index][0].transcript;

      if (event.results[index].isFinal) {
        finalTranscript = `${finalTranscript} ${transcript}`.trim();
      } else {
        interimTranscript = `${interimTranscript} ${transcript}`.trim();
      }
    }

    voiceTranscript.value = `${finalTranscript} ${interimTranscript}`.trim();
  });

  speechRecognition.addEventListener("error", (event) => {
    setVoiceRecognitionState(false);
    setVoiceStatus(`Speech error: ${event.error}`);
  });

  speechRecognition.addEventListener("end", () => {
    setVoiceRecognitionState(false);
    setVoiceStatus(finalTranscript ? "Recognition stopped." : "Microphone standby.");
  });
}

function toggleVoiceRecognition() {
  if (!speechRecognition) {
    return;
  }

  if (isRecognizing) {
    speechRecognition.stop();
    return;
  }

  finalTranscript = voiceTranscript.value.trim();
  speechRecognition.start();
}

queueNoteButton.addEventListener("click", queueNote);
voiceToggleButton.addEventListener("click", toggleVoiceRecognition);
queueVoiceNoteButton.addEventListener("click", queueVoiceNote);

openLogButton.addEventListener("click", () => {
  renderDeletedLog();
  logWindow.classList.remove("is-hidden");
});

closeLogButton.addEventListener("click", () => {
  logWindow.classList.add("is-hidden");
});

memoText.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.ctrlKey) {
    event.preventDefault();
    queueNote();
  }
});

window.addEventListener("resize", updateAllNoteOverflow);
initializeSpeechRecognition();
