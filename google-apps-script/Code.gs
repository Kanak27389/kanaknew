/**
 * =========================================================================
 * INSTITUTION OF ADVANCED INFORMATION TECHNOLOGY (IAIT)
 * GOOGLE APPS SCRIPT - OFFICIAL ADMISSION & ENROLLMENT NUMBER GENERATOR
 * =========================================================================
 * 
 * SPECIFICATION RULES:
 * 1. Format: YY + 4-digit Serial Number (e.g. 261000 for 2026, 271000 for 2027).
 * 2. Serial number MUST START AT 1000 for each new admission year.
 * 3. Serial number MUST increase sequentially for every successful admission:
 *    - 1st admission of 2026: 261000
 *    - 2nd admission: 261001
 *    - 3rd admission: 261002
 *    - 4th admission: 261003
 *    - 5th admission: 261004
 *    - 6th admission: 261005
 * 4. LockService.getScriptLock() prevents duplicate numbers on concurrent submissions.
 * 5. Existing old records (e.g. 268541, 268542) remain untouched in the database,
 *    and are strictly ignored when computing the new 1000-based sequence.
 * 6. Returns JSON: { "success": true, "enrollmentNumber": "261000" }
 */

var SHEET_NAME = "Admissions";

/**
 * Handle incoming POST requests from the website admission form
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  
  // Acquire script lock with a 30-second timeout to handle simultaneous submissions safely
  try {
    lock.waitLock(30000);
  } catch (lockError) {
    return createJsonResponse({
      success: false,
      error: "Server lock timeout. Another admission is being processed. Please try again."
    });
  }

  try {
    // Parse admission payload
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    // Determine current admission year and 2-digit prefix
    var admissionYear = data.admissionDate ? new Date(data.admissionDate).getFullYear() : new Date().getFullYear();
    if (isNaN(admissionYear)) {
      admissionYear = new Date().getFullYear();
    }
    var yearPrefix = String(admissionYear).slice(-2); // e.g. "26" for 2026

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateAdmissionsSheet(spreadsheet);

    // Scan existing sheet records to find highest serial in the NEW 1000-based sequence for this year
    var highestExistingSerial = findHighestSerialForYear(sheet, yearPrefix);

    // Check persistent ScriptProperties counter for atomic tracking
    var props = PropertiesService.getScriptProperties();
    var propKey = "IAIT_SERIAL_" + yearPrefix;
    var storedCounter = parseInt(props.getProperty(propKey) || "0", 10);
    
    // Legacy outliers (>= 8000, like 8541, 8542) are strictly ignored
    if (storedCounter >= 1000 && storedCounter < 8000 && storedCounter > highestExistingSerial) {
      highestExistingSerial = storedCounter;
    }

    // Determine next serial:
    // If no admission exists in the 1000-based sequence for this year, start at 1000.
    // Otherwise, increment sequentially by 1.
    var nextSerial;
    if (highestExistingSerial < 1000) {
      nextSerial = 1000;
    } else {
      nextSerial = highestExistingSerial + 1;
    }

    var enrollmentNumber = yearPrefix + String(nextSerial); // e.g. "261000"

    // Persist the updated counter
    props.setProperty(propKey, String(nextSerial));

    // Append admission record to Google Sheet
    sheet.appendRow([
      enrollmentNumber,
      new Date(),
      data.studentName || "",
      data.guardianName || "",
      data.dob || "",
      data.gender || "",
      data.phone || "",
      data.email || "",
      data.address || "",
      data.course || "",
      data.qualification || "",
      data.batch || "",
      data.admissionDate || new Date().toISOString().split("T")[0],
      data.utrNumber || "",
      data.status || "Approved"
    ]);

    // Release lock before returning response
    lock.releaseLock();

    return createJsonResponse({
      success: true,
      enrollmentNumber: enrollmentNumber,
      admissionYear: admissionYear,
      serial: nextSerial,
      message: "Institutional Enrollment Number successfully generated and saved."
    });

  } catch (error) {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
    return createJsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

/**
 * GET endpoint for health check and previewing the next available enrollment number
 */
function doGet(e) {
  try {
    var year = new Date().getFullYear();
    var yearPrefix = String(year).slice(-2);
    
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateAdmissionsSheet(spreadsheet);
    var highest = findHighestSerialForYear(sheet, yearPrefix);
    
    var props = PropertiesService.getScriptProperties();
    var propKey = "IAIT_SERIAL_" + yearPrefix;
    var storedCounter = parseInt(props.getProperty(propKey) || "0", 10);
    if (storedCounter >= 1000 && storedCounter < 8000 && storedCounter > highest) {
      highest = storedCounter;
    }
    
    var next = highest < 1000 ? 1000 : highest + 1;
    var nextEnrollmentNumber = yearPrefix + String(next);

    return createJsonResponse({
      success: true,
      service: "IAIT Admission & Enrollment Generator",
      currentYear: year,
      yearPrefix: yearPrefix,
      nextEnrollmentNumber: nextEnrollmentNumber
    });
  } catch (err) {
    return createJsonResponse({
      success: false,
      error: err.toString()
    });
  }
}

/**
 * Scans the sheet for the highest serial in the new sequence for a given year.
 * CRITICAL RULE:
 * Existing records such as 268541, 268542 remain untouched in the database,
 * and are strictly ignored when computing the new 1000-based sequence.
 */
function findHighestSerialForYear(sheet, yearPrefix) {
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return 0;

  var enrollmentColIdx = 0; // First column is Enrollment Number
  var highestSerial = 0;

  for (var i = 1; i < values.length; i++) {
    var val = String(values[i][enrollmentColIdx] || "").trim();
    if (!val) continue;

    // Match exact 6-digit YYSSSS
    var match = val.match(/^(\d{2})(\d{4})$/);
    if (match && match[1] === yearPrefix) {
      var serial = parseInt(match[2], 10);
      // Only consider serials in the new 1000-based sequence (1000 to 7999)
      // Excludes legacy numbers such as 8541, 8542
      if (serial >= 1000 && serial < 8000) {
        if (serial > highestSerial) {
          highestSerial = serial;
        }
      }
    }
  }

  return highestSerial;
}

/**
 * Helper to get or initialize the Admissions sheet
 */
function getOrCreateAdmissionsSheet(ss) {
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "Enrollment Number",
      "Submission Timestamp",
      "Student Name",
      "Guardian Name",
      "Date of Birth",
      "Gender",
      "Phone",
      "Email",
      "Address",
      "Course",
      "Qualification",
      "Batch",
      "Admission Date",
      "UTR Number",
      "Status"
    ]);
    sheet.getRange(1, 1, 1, 15).setFontWeight("bold").setBackground("#00163d").setFontColor("#ffffff");
  }
  return sheet;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
