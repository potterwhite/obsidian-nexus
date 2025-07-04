<%*
// --- 这部分逻辑保持不变 ---
const file = app.workspace.getActiveFile();
// 这段正则在你的原始脚本中，但并未在输出中使用，如果你需要它，可以取消下面的注释
// const projectGuess = tp.file.content.match(/\[\[Project-[^\]]+\]\]/g);
// let projectName = "";
//
// if (projectGuess && projectGuess.length > 0) {
//   projectName = projectGuess[0];
// } else {
//   projectName = await tp.system.prompt("Please input the name of project，如 [[Project-xxx]]");
// }

const taskText = await tp.system.prompt("Task description：");
const startTime = tp.date.now("HH:mm");

tR += `- [ ] ${taskText} (start:: ${startTime}) (end:: ) (task_uuid:: ) (task_name:: )`;

// 如果你未来需要 project 或 category，可以这样添加在末尾：
// tR += ` (project:: ${projectName}) (category:: )`;
%>