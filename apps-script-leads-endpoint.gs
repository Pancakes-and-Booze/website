/**
 * Pancakes & Booze — email capture endpoint for dormant city pages.
 *
 * Deployed as a Google Apps Script Web App. When a visitor submits the
 * "Notify Me" form on a dormant city page (e.g. /chicago when there's no
 * live show), city.html POSTs a JSON payload to this endpoint. This script
 * appends the payload as a new row in the "Leads" tab of the same sheet.
 *
 * This is an interim solution until Foxy releases their API. Once Foxy is
 * ready, we swap the LEADS_ENDPOINT in city.html and export this sheet to
 * seed the Foxy list.
 *
 * ════════════════════════════════════════════════════════════════════════
 * SETUP (do this once in your Google Sheet)
 * ════════════════════════════════════════════════════════════════════════
 *
 * 1. Create the "Leads" tab:
 *      - In the sheet, click the "+" next to Sheet1 → rename new tab "Leads"
 *      - In row 1, paste these headers (one per cell, A through H):
 *            timestamp | first_name | last_name | email | source_url | city | lead_type | message
 *      - (Optional) freeze row 1: View → Freeze → 1 row
 *
 *      `lead_type` distinguishes where the lead came from:
 *          "rsvp"          — dormant city page "Notify me" form
 *          "city_request"  — homepage "Bring P&B to your city" popup
 *          (blank)         — legacy rows before this column existed
 *      `message` is free-text (e.g. venue recommendations / "why this city").
 *      Only populated by the city-request form; RSVP leaves it blank.
 *
 * 2. Add this script:
 *      - Extensions → Apps Script (opens the same project as your
 *        auto-uncheck script — that's fine, both functions live side-by-side)
 *      - Paste the code below BELOW the existing uncheckPastShows code
 *        (don't replace it — you want both functions in the same file)
 *      - File → Save (Ctrl/Cmd+S)
 *
 * 3. Deploy as a Web App:
 *      - Click "Deploy" (top right) → "New deployment"
 *      - Click the gear icon next to "Select type" → choose "Web app"
 *      - Description:       "P&B leads endpoint"
 *      - Execute as:        Me (justingallen@me.com)
 *      - Who has access:    Anyone
 *      - Click "Deploy"
 *      - Google will ask for permissions → Authorize → grant
 *      - You'll see a "Web app URL" ending in /exec — COPY IT.
 *
 * 4. Paste the Web App URL into city.html:
 *      - Open /city.html in your project
 *      - Find the line:  const LEADS_ENDPOINT = 'PASTE_APPS_SCRIPT_WEB_APP_URL_HERE';
 *      - Replace the placeholder with the /exec URL from step 3
 *      - Commit + push to GitHub (Netlify will auto-deploy)
 *
 * 5. Test it:
 *      - Visit a dormant city page (any slug with Live=FALSE) on the live site
 *      - Fill out the form → submit → confirm the row appears in the Leads tab
 *
 * Notes:
 *   - If you ever need to update this script (e.g. add a column), you must
 *     click Deploy → Manage deployments → pencil icon → "New version" → Deploy
 *     for changes to take effect at the /exec URL.
 *   - "Anyone" access means the /exec URL is public — DO NOT include anything
 *     sensitive in here. It only appends rows; it can't read them.
 */

function doPost(e) {
  try {
    // Body arrives as text/plain (we avoid a CORS preflight that way).
    const raw = (e && e.postData && e.postData.contents) || '';
    const data = raw ? JSON.parse(raw) : {};

    // Minimal validation — if email is missing, we reject rather than silently
    // log garbage.
    const email = clean(data.email);
    if (!email) {
      return jsonOut({ ok: false, error: 'email is required' });
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Leads');
    if (!sheet) {
      return jsonOut({ ok: false, error: 'Leads tab not found. Create a tab named "Leads" with headers.' });
    }

    sheet.appendRow([
      new Date(),               // timestamp
      clean(data.first_name),   // first_name
      clean(data.last_name),    // last_name
      email,                    // email
      clean(data.source_url),   // source_url
      clean(data.city),         // city
      clean(data.lead_type),    // lead_type  ("rsvp" | "city_request" | "")
      clean(data.message)       // message    (free-text, city-request form only)
    ]);

    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

// GET just returns a friendly signal, so you can paste the /exec URL into a
// browser and see "P&B leads endpoint live" instead of an error.
function doGet() {
  return jsonOut({ ok: true, message: 'P&B leads endpoint live' });
}

function clean(v) {
  if (v == null) return '';
  return String(v).trim();
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
