require("dotenv").config();

const {
  getCompanyIDs,
  getEmployeeIDsForCompany,
  getEmployeeAbsenceList,
  getAllAbsenceTimes,
  transformAbsence
} = require("../Nmbrs");

describe("Numbers API service", () => {
  const auth = {
    Username: process.env.NMBRS_USERNAME,
    Token: process.env.NMBRS_TOKEN
  };

  it("Can fetch company ids with a valid token", async () => {
    const companyIds = await getCompanyIDs({ auth });
    expect(Array.isArray(companyIds)).toBeTruthy();
  });

  it("can not fetch company ids without a valid token", async () => {
    expect(
      await getCompanyIDs({
        auth: { Username: "WRONG", TOKEN: "XXXX" }
      })
    ).toBeInstanceOf(Error);
  });

  it("Can fetch employee IDs for a company", async () => {
    const validCompanyId = 54613;
    const ids = await getEmployeeIDsForCompany(validCompanyId, { auth });

    expect(Array.isArray(ids)).toBeTruthy();
  });

  it("Can fetch absence times for an employee of the company", async () => {
    const validEmployeeId = 503293;
    const absence = await getEmployeeAbsenceList(validEmployeeId, { auth });

    expect(absence.personId).toEqual(validEmployeeId);
    expect(Array.isArray(absence.historical_days_off)).toBeTruthy();
  });

  it("transforms the XML data to the desired format", () => {
    const before = {
      AbsenceId: 75241,
      Comment: "Automated by Officient",
      Percentage: 100,
      Start: "2018-07-05T22:00:00",
      RegistrationStartDate: "2018-07-05T22:00:00",
      End: "2018-07-05T22:00:00",
      RegistrationEndDate: "2018-07-05T22:00:00",
      Dossier: "Zwangerschapverlof",
      Dossiernr: 62201
    };

    const after = transformAbsence(before);

    const expected = {
      date: "2018-07-05",
      data: {
        duration_minutes: 480,
        day_off_name: "Automated by Officient",

        // ???
        internal_code: 5,
        type_work: 0,
        type_company_holiday: 0,
        type_holiday: 1
      }
    };

    expect(after).toEqual(expected);
  });
});
