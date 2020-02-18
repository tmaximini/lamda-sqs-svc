const soapRequest = require("easy-soap-request");
const xmlParser = require("fast-xml-parser");

const isLambda = !!(process.env.LAMBDA_TASK_ROOT || false);

// only load .env locally
if (!isLambda) {
  require("dotenv").config();
}

const COMPANIES_URL = "https://api.nmbrs.nl/soap/v2.1/CompanyService.asmx";
const EMPLOYEES_URL = "https://api.nmbrs.nl/soap/v2.1/EmployeeService.asmx";

const reqHeaders = {
  "user-agent": "NmbrsApp",
  "Content-Type": "text/xml;charset=UTF-8"
};

const getCompanyIDs = async ({ auth }) => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
  <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"> 
    <soap:Header> 
      <AuthHeader xmlns="https://api.nmbrs.nl/soap/v2.1/CompanyService"> 
        <Username>${auth.Username}</Username> 
        <Token>${auth.Token}</Token> </AuthHeader> 
      </soap:Header> 
    <soap:Body> 
      <List_GetAll xmlns="https://api.nmbrs.nl/soap/v2.1/CompanyService" /> 
    </soap:Body>
  </soap:Envelope>`;

  const { response } = await soapRequest({
    url: COMPANIES_URL,
    headers: reqHeaders,
    xml,
    timeout: 1000
  });

  const { body, statusCode } = response;

  if (statusCode !== 200) {
    console.error("Problem with the request");
    return [];
  }

  try {
    const parsed = xmlParser.parse(body);

    const result = parsed["soap:Envelope"]["soap:Body"]["List_GetAllResponse"];

    return Object.keys(result).map(key => result[key].Company.ID);
  } catch (err) {
    console.info("error parsing XML response", err);
  }
};

const getEmployeeIDsForCompany = async (companyId, { auth }) => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
  <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Header>
      <AuthHeader xmlns="https://api.nmbrs.nl/soap/v2.1/EmployeeService">
        <Username>${auth.Username}</Username>
        <Token>${auth.Token}</Token>
      </AuthHeader>
    </soap:Header>
    <soap:Body>
      <List_GetByCompany xmlns="https://api.nmbrs.nl/soap/v2.1/EmployeeService">
        <CompanyId>${companyId}</CompanyId>
        <active>all</active>
      </List_GetByCompany>
    </soap:Body>
  </soap:Envelope>`;

  const { response } = await soapRequest({
    url: EMPLOYEES_URL,
    headers: reqHeaders,
    xml,
    timeout: 1000
  });

  const { body, statusCode } = response;

  if (statusCode !== 200) {
    console.error("Problem with the request");
    return [];
  }

  try {
    const parsed = xmlParser.parse(body);

    const result =
      parsed["soap:Envelope"]["soap:Body"]["List_GetByCompanyResponse"][
        "List_GetByCompanyResult"
      ]["Employee"];

    return result.map(employee => employee.Id);

    // return Object.keys(result).map(key => result[key].Company.ID);
  } catch (err) {
    console.info("error parsing XML response", err);
  }
};

const transformAbsence = item => ({
  date: item.Start ? item.Start.substr(0, 10) : "no-start-date",
  data: {
    duration_minutes: ((8 * 60) / 100) * item.Percentage,
    day_off_name: item.Comment || "No Reason provided",

    // ???
    internal_code: 5,
    type_work: 0,
    type_company_holiday: 0,
    type_holiday: 1
  }
});

const getEmployeeAbsenceList = async (employeeId, { auth }) => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
  <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Header>
      <AuthHeader xmlns="https://api.nmbrs.nl/soap/v2.1/EmployeeService">
      <Username>${auth.Username}</Username>
      <Token>${auth.Token}</Token>
      </AuthHeader>
    </soap:Header>
    <soap:Body>
      <Absence_GetList xmlns="https://api.nmbrs.nl/soap/v2.1/EmployeeService">
        <EmployeeId>${employeeId}</EmployeeId>
      </Absence_GetList>
    </soap:Body>
  </soap:Envelope>`;

  const { response } = await soapRequest({
    url: EMPLOYEES_URL,
    headers: reqHeaders,
    xml,
    timeout: 2000
  });

  const { body, statusCode } = response;

  if (statusCode !== 200) {
    console.error("Problem with the request");
    return [];
  }

  try {
    const parsed = xmlParser.parse(body);

    const result =
      parsed["soap:Envelope"]["soap:Body"]["Absence_GetListResponse"][
        "Absence_GetListResult"
      ]["Absence"];

    const transformedResult = {
      personId: employeeId,
      // make result an array for easier later processing, even if only one item or empty
      historical_days_off: result
        ? Array.isArray(result)
          ? result.map(transformAbsence)
          : [transformAbsence(result)]
        : []
    };

    return transformedResult;
  } catch (err) {
    console.info("error parsing XML response", err);
  }
};

const getAllAbsenceTimes = async authObj => {
  const companies = await getCompanyIDs({ auth: authObj });

  const promises = [];

  for (let i = 0; i < companies.length; i++) {
    const employees = await getEmployeeIDsForCompany(companies[i], {
      auth: authObj
    });
    for (let y = 0; y < employees.length; y++) {
      promises.push(getEmployeeAbsenceList(employees[y], { auth: authObj }));
    }
  }

  return Promise.all(promises);
};

module.exports = {
  getAllAbsenceTimes
};
