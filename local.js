const fs = require("fs");

const { getAllAbsenceTimes } = require("./lib/Nmbrs");

(async function writeAbsenceTimesLocally() {
  const absenceTimes = await getAllAbsenceTimes({
    Username: process.env.NMBRS_USERNAME,
    Token: process.env.NMBRS_TOKEN
  });

  fs.writeFile("absence.json", JSON.stringify(absenceTimes), "utf8", err => {
    if (err) throw err;
    console.log("The file has been saved!");
  });
})();
