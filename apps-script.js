// =============================================================
//  OR SURVEY — Google Apps Script
//  Paste this entire file into your Google Sheet's Apps Script editor
//  (Extensions → Apps Script → delete existing code → paste this)
// =============================================================

// Handles form submissions (POST requests)
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    if (data.action === 'submit') {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      
      // --- RESPONSES sheet ---
      var sheet = ss.getSheetByName('Responses');
      if (!sheet) {
        sheet = ss.insertSheet('Responses');
        sheet.appendRow([
          'Timestamp', 'Name',
          'Jun 9 – UH', 'Jun 30 – UH', 'Jul 14 – UH', 'Aug 11 – UH',
          'Jun 9 – Brighton', 'Jun 16 – Brighton', 'Jun 30 – Brighton',
          'Jul 14 – Brighton', 'Jul 21 – Brighton', 'Aug 11 – Brighton', 'Aug 18 – Brighton',
          'Comments'
        ]);
        // Bold + freeze header
        sheet.getRange(1, 1, 1, 14).setFontWeight('bold');
        sheet.setFrozenRows(1);
      }
      
      var allSlots = [
        'Jun 9 – UH', 'Jun 30 – UH', 'Jul 14 – UH', 'Aug 11 – UH',
        'Jun 9 – Brighton', 'Jun 16 – Brighton', 'Jun 30 – Brighton',
        'Jul 14 – Brighton', 'Jul 21 – Brighton', 'Aug 11 – Brighton', 'Aug 18 – Brighton'
      ];
      
      var row = [
        new Date().toLocaleString(),
        data.name
      ];
      
      // Mark Yes for each selected slot
      allSlots.forEach(function(slot) {
        row.push(data.available.indexOf(slot) !== -1 ? 'Yes' : '');
      });
      
      row.push(data.comments || '');
      sheet.appendRow(row);
      
      // --- GROWTH REQUESTS sheet ---
      if (data.requests && data.requests.length > 0) {
        var growthSheet = ss.getSheetByName('Growth Requests');
        if (!growthSheet) {
          growthSheet = ss.insertSheet('Growth Requests');
          growthSheet.appendRow([
            'Timestamp', 'Name', 'Location', 'Day of Week', 
            'Week #', 'Robot Needed', 'Notes'
          ]);
          growthSheet.getRange(1, 1, 1, 7).setFontWeight('bold');
          growthSheet.setFrozenRows(1);
        }
        
        var ts = new Date().toLocaleString();
        data.requests.forEach(function(req) {
          growthSheet.appendRow([
            ts,
            data.name,
            req.location || '',
            req.day || '',
            req.week || '',
            req.robot || '',
            req.notes || ''
          ]);
        });
      }
      
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handles admin panel reads (GET requests)
function doGet(e) {
  try {
    var action = e.parameter.action;
    
    if (action === 'getAll') {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var responses = [];
      
      // Read Responses sheet
      var sheet = ss.getSheetByName('Responses');
      if (sheet && sheet.getLastRow() > 1) {
        var data = sheet.getDataRange().getValues();
        var headers = data[0];
        
        for (var i = 1; i < data.length; i++) {
          var row = data[i];
          var available = [];
          
          // Columns 2-12 are the slot columns (index 2 through 12)
          var slotNames = [
            'Jun 9 – UH', 'Jun 30 – UH', 'Jul 14 – UH', 'Aug 11 – UH',
            'Jun 9 – Brighton', 'Jun 16 – Brighton', 'Jun 30 – Brighton',
            'Jul 14 – Brighton', 'Jul 21 – Brighton', 'Aug 11 – Brighton', 'Aug 18 – Brighton'
          ];
          
          for (var j = 0; j < slotNames.length; j++) {
            if (row[j + 2] === 'Yes') {
              available.push(slotNames[j]);
            }
          }
          
          responses.push({
            timestamp: row[0].toString(),
            name: row[1],
            available: available,
            comments: row[13] || '',
            requests: []
          });
        }
      }
      
      // Read Growth Requests sheet and attach to matching responses
      var growthSheet = ss.getSheetByName('Growth Requests');
      if (growthSheet && growthSheet.getLastRow() > 1) {
        var growthData = growthSheet.getDataRange().getValues();
        
        for (var g = 1; g < growthData.length; g++) {
          var gRow = growthData[g];
          var gName = gRow[1];
          var req = {
            location: gRow[2] || '',
            day: gRow[3] || '',
            week: gRow[4] || '',
            robot: gRow[5] || '',
            notes: gRow[6] || ''
          };
          
          // Find matching response and attach
          for (var r = responses.length - 1; r >= 0; r--) {
            if (responses[r].name === gName) {
              responses[r].requests.push(req);
              break;
            }
          }
        }
      }
      
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', responses: responses }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', message: 'No action specified' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
