const express = require('express');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;
const googleTokenUrl = 'https://oauth2.googleapis.com/token';
const googleSheetsScope = 'https://www.googleapis.com/auth/spreadsheets';
const sheetHeaders = [
	'Date',
	'Ecole',
	'Nom',
	'Email',
	'Mobile',
	'Annee Bac',
	'Niveau',
	'Formation',
	'Moyenne generale',
	'Note maths',
	'Note francais',
	'Note anglais',
	'Note physique',
	'Specialite',
	'Source',
	"Chargee d'admission",
];
const defaultAllowedOrigins = [
	'https://salon.ifag-edu.com',
	'http://salon.ifag-edu.com',
	'https://www.salon.ifag-edu.com',
	'http://www.salon.ifag-edu.com',
];
const allowedOrigins = new Set(
	(process.env.FRONTEND_ORIGINS || defaultAllowedOrigins.join(','))
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean)
);
const localOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

// Middleware setup
app.use(express.json()); // To parse JSON body from requests
app.use(
	cors({
		origin(origin, callback) {
			if (!origin || allowedOrigins.has(origin) || localOriginPattern.test(origin)) {
				callback(null, true);
				return;
			}

			console.warn(`Blocked CORS origin: ${origin}`);
			callback(null, false);
		},
	})
);
app.use(express.static(path.join(__dirname, 'public')));

// Check if environment variables are loaded
console.log('Email User:', process.env.EMAIL_USER ? 'Loaded' : 'Missing');
console.log('Email Password:', process.env.EMAIL_PASSWORD ? 'Loaded' : 'Missing');
console.log('Google Sheet ID:', process.env.GOOGLE_SHEET_ID ? 'Loaded' : 'Missing');
console.log('Google Service Account:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'Loaded' : 'Missing');
console.log('Google Private Key:', process.env.GOOGLE_PRIVATE_KEY ? 'Loaded' : 'Missing');

// Nodemailer transporter setup with Gmail SMTP configuration
const transporter =
	process.env.EMAIL_USER && process.env.EMAIL_PASSWORD
		? nodemailer.createTransport({
				service: 'gmail',
				auth: {
					user: process.env.EMAIL_USER,
					pass: process.env.EMAIL_PASSWORD,
				},
			})
		: null;

// Test the transporter configuration
if (transporter) {
	transporter.verify((error) => {
		if (error) {
			console.log('SMTP connection error:', error);
			return;
		}

		console.log('SMTP server is ready to take our messages');
	});
}

let cachedGoogleAccessToken = null;
let sheetHeaderEnsured = false;

const base64UrlEncode = (value) =>
	Buffer.from(value)
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/g, '');

const requestJson = (url, { method = 'GET', headers = {}, body } = {}) =>
	new Promise((resolve, reject) => {
		const payload = body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
		const payloadHeaders = payload
			? {
					...(typeof body === 'string' ? {} : { 'Content-Type': 'application/json' }),
					'Content-Length': Buffer.byteLength(payload),
				}
			: {};
		const request = https.request(
			url,
			{
				method,
				headers: {
					...payloadHeaders,
					...headers,
				},
			},
			(response) => {
				let data = '';

				response.on('data', (chunk) => {
					data += chunk;
				});

				response.on('end', () => {
					let json = {};

					try {
						json = data ? JSON.parse(data) : {};
					} catch (error) {
						reject(new Error(`Invalid JSON response: ${error.message}`));
						return;
					}

					if (response.statusCode >= 200 && response.statusCode < 300) {
						resolve(json);
						return;
					}

					const error = new Error(json.error_description || json.error?.message || json.error || 'Request failed');
					error.statusCode = response.statusCode;
					error.response = json;
					reject(error);
				});
			}
		);

		request.on('error', reject);

		if (payload) request.write(payload);
		request.end();
	});

const getGooglePrivateKey = () => (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();

const hasGoogleSheetsConfig = () =>
	Boolean(process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && getGooglePrivateKey());

const getConfiguredSheetName = () => {
	const range = process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A:P';
	const separatorIndex = range.indexOf('!');

	return separatorIndex === -1 ? range : range.slice(0, separatorIndex);
};

const getUnquotedSheetName = () => {
	const sheetName = getConfiguredSheetName();

	if (sheetName.startsWith("'") && sheetName.endsWith("'")) {
		return sheetName.slice(1, -1).replace(/''/g, "'");
	}

	return sheetName;
};

const getSheetRange = (range) => `${getConfiguredSheetName()}!${range}`;

const createGoogleJwt = () => {
	const now = Math.floor(Date.now() / 1000);
	const header = { alg: 'RS256', typ: 'JWT' };
	const payload = {
		iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
		scope: googleSheetsScope,
		aud: googleTokenUrl,
		iat: now,
		exp: now + 3600,
	};
	const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
	const signature = crypto.createSign('RSA-SHA256').update(unsignedToken).sign(getGooglePrivateKey());

	return `${unsignedToken}.${base64UrlEncode(signature)}`;
};

const getGoogleAccessToken = async () => {
	if (cachedGoogleAccessToken && cachedGoogleAccessToken.expiresAt > Date.now() + 60000) {
		return cachedGoogleAccessToken.token;
	}

	const response = await requestJson(googleTokenUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion: createGoogleJwt(),
		}).toString(),
	});

	cachedGoogleAccessToken = {
		token: response.access_token,
		expiresAt: Date.now() + response.expires_in * 1000,
	};

	return cachedGoogleAccessToken.token;
};

const buildSheetRow = (submission) => [
	new Date().toISOString(),
	submission.ecole || '',
	submission.nomPrenom || '',
	submission.email || '',
	submission.mobile || '',
	submission.anneeDuBac || '',
	submission.niveauFormation || '',
	submission.programme || '',
	submission.moyenneGenerale || '',
	submission.noteMaths || '',
	submission.noteFrancais || '',
	submission.noteAnglais || '',
	submission.notePhysique || '',
	submission.specialite || '',
	submission.source || '',
	submission.chargeeAdmission || '',
];

const getSheetMetadata = async () => {
	if (!hasGoogleSheetsConfig()) {
		throw new Error('Google Sheets credentials are not configured');
	}

	const accessToken = await getGoogleAccessToken();
	const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}?fields=spreadsheetId,properties.title,sheets.properties(sheetId,title)`;

	return requestJson(metadataUrl, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
};

const getTargetSheetId = async () => {
	const metadata = await getSheetMetadata();
	const targetSheetName = getUnquotedSheetName();
	const targetSheet = metadata.sheets?.find((sheet) => sheet.properties?.title === targetSheetName);

	if (!targetSheet) {
		throw new Error(`Sheet tab not found: ${targetSheetName}`);
	}

	return targetSheet.properties.sheetId;
};

const updateSheetHeader = async (accessToken) => {
	const headerRange = getSheetRange(`A1:${String.fromCharCode(64 + sheetHeaders.length)}1`);
	const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}/values/${encodeURIComponent(
		headerRange
	)}?valueInputOption=USER_ENTERED`;

	await requestJson(updateUrl, {
		method: 'PUT',
		headers: { Authorization: `Bearer ${accessToken}` },
		body: { values: [sheetHeaders] },
	});
};

const insertHeaderRow = async (accessToken) => {
	const sheetId = await getTargetSheetId();
	const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}:batchUpdate`;

	await requestJson(batchUrl, {
		method: 'POST',
		headers: { Authorization: `Bearer ${accessToken}` },
		body: {
			requests: [
				{
					insertDimension: {
						range: {
							sheetId,
							dimension: 'ROWS',
							startIndex: 0,
							endIndex: 1,
						},
						inheritFromBefore: false,
					},
				},
			],
		},
	});
};

const ensureSheetHeader = async (accessToken) => {
	if (sheetHeaderEnsured) return;

	const headerRange = getSheetRange(`A1:${String.fromCharCode(64 + sheetHeaders.length)}1`);
	const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}/values/${encodeURIComponent(
		headerRange
	)}`;
	const headerResponse = await requestJson(headerUrl, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	const firstRow = headerResponse.values?.[0] || [];
	const alreadyHasHeader = firstRow[0] === sheetHeaders[0] && firstRow[sheetHeaders.length - 1] === sheetHeaders[sheetHeaders.length - 1];
	const hasExistingData = firstRow.some((value) => String(value || '').trim());

	if (alreadyHasHeader) {
		sheetHeaderEnsured = true;
		return;
	}

	if (hasExistingData) {
		await insertHeaderRow(accessToken);
	}

	await updateSheetHeader(accessToken);
	sheetHeaderEnsured = true;
};

const appendSubmissionToSheet = async (submission) => {
	if (!hasGoogleSheetsConfig()) {
		throw new Error('Google Sheets credentials are not configured');
	}

	const accessToken = await getGoogleAccessToken();
	await ensureSheetHeader(accessToken);

	const sheetRange = getSheetRange(`A:${String.fromCharCode(64 + sheetHeaders.length)}`);
	const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}/values/${encodeURIComponent(
		sheetRange
	)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

	await requestJson(appendUrl, {
		method: 'POST',
		headers: { Authorization: `Bearer ${accessToken}` },
		body: { values: [buildSheetRow(submission)] },
	});
};

app.get('/', (req, res) => {
	res.send('Hello There!');
});

// API route for handling form submission
app.post('/api/send-email', async (req, res) => {
	const {
		ecole,
		nomPrenom,
		email,
		mobile,
		source,
		chargeeAdmission,
		anneeDuBac,
		niveauFormation,
		specialite,
		moyenneGenerale,
		noteMaths,
		notePhysique,
		noteFrancais,
		noteAnglais,
		programme,
	} = req.body;

	const submission = {
		ecole,
		nomPrenom,
		email,
		mobile,
		source,
		chargeeAdmission,
		anneeDuBac,
		niveauFormation,
		specialite,
		moyenneGenerale,
		noteMaths,
		notePhysique,
		noteFrancais,
		noteAnglais,
		programme,
	};

	const emailContent = `
::Ecole : '${ecole || ''}'
::nom : '${nomPrenom || ''}'
::Email : '${email || ''}'
::Mobile : '${mobile || ''}'
::année: '${anneeDuBac || ''}'
::Niveau : '${niveauFormation || ''}'
::Formation : '${programme || ''}'
::Source : '${source || ''}'
::Chargé(e) d'admission : '${chargeeAdmission || ''}'
::Moyenne générale : '${moyenneGenerale || ''}'
::note en maths : '${noteMaths || ''}'
::note en français : '${noteFrancais || ''}'
::note en anglais : '${noteAnglais || ''}'
::note en physique : '${notePhysique || ''}'
::spécialité : '${specialite || ''}'
	`;

	const result = {
		sheetSaved: false,
		emailSent: false,
		errors: [],
	};

	try {
		await appendSubmissionToSheet(submission);
		result.sheetSaved = true;
	} catch (error) {
		console.error('Error saving to Google Sheet:', error);
		result.errors.push(`Google Sheets: ${error.message}`);
	}

	if (transporter) {
		try {
			await transporter.sendMail({
				from: process.env.EMAIL_USER, // Sender address
				to: 'ifag@under-test.com', // Updated recipient address
				subject: `${programme} - ${nomPrenom || 'Candidat'}`,
				text: emailContent,
				html: `<pre>${emailContent}</pre>`,
			});
			result.emailSent = true;
		} catch (error) {
			console.error('Error sending email:', error);
			result.errors.push(`Email: ${error.message}`);
		}
	}

	if (result.sheetSaved || result.emailSent) {
		res.status(200).json({
			success: true,
			message: result.sheetSaved ? 'Submission saved successfully' : 'Email sent successfully',
			sheetSaved: result.sheetSaved,
			emailSent: result.emailSent,
			warnings: result.errors,
		});
		return;
	}

	res.status(500).json({
		success: false,
		error: 'Failed to save submission',
		details: result.errors.join(' | ') || 'No delivery method configured',
	});
});

app.get('/api/health/sheets', async (req, res) => {
	try {
		if (!hasGoogleSheetsConfig()) {
			res.status(500).json({ success: false, error: 'Google Sheets credentials are not configured' });
			return;
		}

		const accessToken = await getGoogleAccessToken();
		await ensureSheetHeader(accessToken);
		const sheet = await getSheetMetadata();
		res.status(200).json({
			success: true,
			message: 'Google Sheets credentials are valid and the header is ready',
			sheetTitle: sheet.properties?.title,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: 'Google Sheets credentials failed',
			details: error.message,
		});
	}
});

// Start the server
const server = app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});

server.on('error', (error) => {
	console.error('Server startup error:', error);
});
