const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 8080;

app.use(cors());
app.use(bodyParser.json());

// 1. List Printers
app.get('/printers', (req, res) => {
    const command = `powershell -Command "Get-Printer | Select-Object Name | ConvertTo-Json"`;
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error("Error fetching printers:", stderr);
            return res.status(500).json({ error: "Failed to fetch printers" });
        }
        try {
            const printers = JSON.parse(stdout);
            const list = Array.isArray(printers) ? printers.map(p => p.Name) : [printers.Name];
            res.json(list.filter(Boolean));
        } catch (e) {
            res.json([]);
        }
    });
});

// 2. Print
app.post('/print', (req, res) => {
    const { content, printerName } = req.body;

    if (!content) return res.status(400).json({ error: "No content provided" });

    // Save content to temp HTML file
    const tempFile = path.join(os.tmpdir(), `kiosk-print-${Date.now()}.html`);
    fs.writeFileSync(tempFile, content);

    // PowerShell Print Command
    // We use Start-Process -Verb PrintTo if possible, or Out-Printer
    // But specific printer requires specialized command usually.
    // Use the same helper script logic or a direct command.

    // Simple robust print command for HTML using MSHTML (InternetExplorer logic) or just passing to a browser is hard silently.
    // A robust way for simple HTML receipts is simply writing to a temporary file and using mspaint /pt or similar, but for HTML, 
    // the best way in Windows without 3rd party tools is complex. 

    // RE-USE the "Right Way":
    // The previously used `print_silent.ps1` logic was:
    // `Start-Process -FilePath $FilePath -ArgumentList $PrinterName -Verb PrintTo -WindowStyle Hidden -Wait` is for files associated with printto.
    // HTML files are associated with Browsers. They might open a dialog.

    // ALTERNATIVE: Use a lighter weight approach if possible.
    // However, since we used `print_silent.ps1` successfully on the server, let's reuse that logic!
    // I'll create the PS1 file locally here too.

    const scriptPath = path.join(__dirname, 'print.ps1');
    const printerArg = printerName ? `"${printerName}"` : `""`;

    const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" "${tempFile}" ${printerArg}`;

    console.log(`Printing to ${printerName || 'Default'}...`);

    exec(command, (error, stdout, stderr) => {
        // Cleanup temp file after delay
        setTimeout(() => {
            try { fs.unlinkSync(tempFile); } catch (e) { }
        }, 5000);

        if (error) {
            console.error("Print Error:", stderr);
            res.status(500).json({ success: false, error: stderr });
        } else {
            console.log("Print Success");
            res.json({ success: true });
        }
    });
});

app.listen(PORT, () => {
    console.log(`DoveQMS Print Agent running on http://localhost:${PORT}`);
    console.log("Keep this window open to allow printing.");
});
