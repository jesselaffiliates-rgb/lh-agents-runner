import { google } from "googleapis";

export async function sheetWrite({ spreadsheetId, range, values }) {
  const key = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS_JSON);
  const auth = new google.auth.JWT(
    key.client_email,
    undefined,
    key.private_key,
    ["https://www.googleapis.com/auth/spreadsheets","https://www.googleapis.com/auth/drive.file"]
  );
  const sheets = google.sheets({ version: "v4", auth });
  const resp = await sheets.spreadsheets.values.append({
    spreadsheetId, range, valueInputOption: "USER_ENTERED",
    requestBody: { values }
  });
  return resp.data.updates?.updatedRange;
}
