import { exec } from "child_process";

const PORT = 10000;
const isWin = process.platform === "win32";

const command = isWin
  ? `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${PORT} ^| findstr LISTENING') do taskkill /F /PID %a`
  : `lsof -ti:${PORT} | xargs kill -9`;

exec(command, (error) => {
  if (error) {
    console.log(`No process found using port ${PORT}`);
    return;
  }

  console.log(`Port ${PORT} cleared ✅`);
});
