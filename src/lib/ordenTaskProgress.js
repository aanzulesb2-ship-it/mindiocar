const TASKS_PREFIX = "__OT_TASKS_V3__:";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeSection(value) {
  const section = normalizeText(value).toLowerCase();
  if (section === "cabezote") return "cabezote";
  if (section === "especiales") return "especiales";
  return "block";
}

function inferSection(text) {
  const raw = normalizeText(text).toLowerCase();
  if (!raw) return "block";
  if (raw.includes("cabezote") || raw.includes("culata") || raw.includes("valvula")) return "cabezote";
  if (raw.includes("torno") || raw.includes("soldadura") || raw.includes("soldar")) return "especiales";
  return "block";
}

function createTask(text, section = "block", fallbackId) {
  return {
    id: normalizeText(fallbackId) || `task_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    text: normalizeText(text),
    done: false,
    section: normalizeSection(section),
  };
}

function normalizeTask(task, index, fallbackSection = "block") {
  return {
    id: normalizeText(task?.id) || `task_${index + 1}`,
    text: normalizeText(task?.text),
    done: Boolean(task?.done),
    section: normalizeSection(task?.section || fallbackSection),
  };
}

function splitTasksBySection(tasks) {
  const state = {
    blockTasks: [],
    cabezoteTasks: [],
    especialesTasks: [],
  };

  for (const task of tasks) {
    if (!task.text) continue;
    if (task.section === "cabezote") state.cabezoteTasks.push(task);
    else if (task.section === "especiales") state.especialesTasks.push(task);
    else state.blockTasks.push(task);
  }

  return state;
}

function buildLegacyState(tasks, armadoDone) {
  const normalized = tasks
    .map((task, index) => normalizeTask(task, index, inferSection(task?.text)))
    .filter((task) => task.text);

  const base = splitTasksBySection(normalized);
  const hasBlock = base.blockTasks.length > 0;
  const hasCabezote = base.cabezoteTasks.length > 0;

  return {
    ...base,
    armadoBlockDone: Boolean(armadoDone) && (hasBlock || !hasCabezote),
    armadoCabezoteDone: Boolean(armadoDone) && hasCabezote,
  };
}

export function parseTaskState(value) {
  if (typeof value === "string" && value.startsWith(TASKS_PREFIX)) {
    try {
      const parsed = JSON.parse(value.slice(TASKS_PREFIX.length));
      const allTasks = Array.isArray(parsed?.tasks)
        ? parsed.tasks.map((task, index) => normalizeTask(task, index, task?.section))
        : [];

      const base = splitTasksBySection(allTasks);

      return {
        ...base,
        armadoBlockDone: Boolean(parsed?.armadoBlockDone),
        armadoCabezoteDone: Boolean(parsed?.armadoCabezoteDone),
      };
    } catch {
      return {
        blockTasks: [],
        cabezoteTasks: [],
        especialesTasks: [],
        armadoBlockDone: false,
        armadoCabezoteDone: false,
      };
    }
  }

  if (typeof value === "string" && value.startsWith("__OT_TASKS_V2__:")) {
    try {
      const parsed = JSON.parse(value.slice("__OT_TASKS_V2__:".length));
      const tasks = Array.isArray(parsed?.tasks)
        ? parsed.tasks.map((task, index) => normalizeTask(task, index, inferSection(task?.text)))
        : [];

      return buildLegacyState(tasks, parsed?.armadoDone);
    } catch {
      return buildLegacyState([], false);
    }
  }

  const plainTasks = String(value || "")
    .split(/\r?\n/)
    .map((item, index) => createTask(item, inferSection(item), `task_${index + 1}`))
    .filter((task) => task.text);

  return buildLegacyState(plainTasks, false);
}

export function serializeTaskState(state) {
  const allTasks = [
    ...(Array.isArray(state?.blockTasks) ? state.blockTasks : []),
    ...(Array.isArray(state?.cabezoteTasks) ? state.cabezoteTasks : []),
    ...(Array.isArray(state?.especialesTasks) ? state.especialesTasks : []),
  ]
    .map((task, index) => normalizeTask(task, index, task?.section))
    .filter((task) => task.text);

  return `${TASKS_PREFIX}${JSON.stringify({
    tasks: allTasks,
    armadoBlockDone: Boolean(state?.armadoBlockDone),
    armadoCabezoteDone: Boolean(state?.armadoCabezoteDone),
  })}`;
}

export function buildTask(text, section = "block") {
  return createTask(text, section);
}

export function parseDetailItems(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

export function serializeDetailItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .join("\n");
}

export function getOrdenProgress(taskState) {
  const blockTasks = Array.isArray(taskState?.blockTasks) ? taskState.blockTasks : [];
  const cabezoteTasks = Array.isArray(taskState?.cabezoteTasks) ? taskState.cabezoteTasks : [];
  const especialesTasks = Array.isArray(taskState?.especialesTasks) ? taskState.especialesTasks : [];
  const normalTasks = [...blockTasks, ...cabezoteTasks];
  const totalTasks = normalTasks.length;
  const completedTasks = normalTasks.filter((task) => task.done).length;
  const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 80 : 0;

  const hasBlock = blockTasks.length > 0;
  const hasCabezote = cabezoteTasks.length > 0;
  const armadoUnit = hasBlock && hasCabezote ? 10 : 20;
  const armadoProgress =
    (hasBlock && taskState?.armadoBlockDone ? armadoUnit : 0) +
    (hasCabezote && taskState?.armadoCabezoteDone ? armadoUnit : 0);

  const totalProgress = Math.min(100, taskProgress + armadoProgress);
  const isTaskStageComplete = totalTasks > 0 && completedTasks === totalTasks;
  const blockTasksComplete = hasBlock && blockTasks.every((task) => task.done);
  const cabezoteTasksComplete = hasCabezote && cabezoteTasks.every((task) => task.done);
  const requiredArmadosDone =
    (!hasBlock || Boolean(taskState?.armadoBlockDone)) &&
    (!hasCabezote || Boolean(taskState?.armadoCabezoteDone));

  return {
    totalTasks,
    completedTasks,
    taskProgress,
    armadoProgress,
    totalProgress,
    isTaskStageComplete,
    canToggleArmadoBlock: blockTasksComplete,
    canToggleArmadoCabezote: cabezoteTasksComplete,
    canFinalize: isTaskStageComplete && requiredArmadosDone && (hasBlock || hasCabezote),
    hasBlock,
    hasCabezote,
    specialCount: especialesTasks.length,
  };
}
