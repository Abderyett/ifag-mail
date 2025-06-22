const express = require('express');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

// Middleware setup
app.use(express.json()); // To parse JSON body from requests
app.use(cors()); // Allow cross-origin requests from your React app

// Check if environment variables are loaded
console.log('Email User:', process.env.EMAIL_USER ? 'Loaded' : 'Missing');
console.log('Email Password:', process.env.EMAIL_PASSWORD ? 'Loaded' : 'Missing');

// Nodemailer transporter setup with Gmail SMTP configuration
const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASSWORD,
	},
});

// Test the transporter configuration
transporter.verify((error, success) => {
	if (error) {
		console.log('SMTP connection error:', error);
	} else {
		console.log('SMTP server is ready to take our messages');
	}
});

app.get('/', (req, res) => {
	res.send('Hello There!');
});

// API route for handling form submission
app.post('/api/send-email', async (req, res) => {
	const {
		nomPrenom,
		email,
		mobile,
		source,
		anneeDuBac,
		specialite,
		moyenneGenerale,
		noteMaths,
		notePhysique,
		noteFrancais,
		programme,
	} = req.body;

	// Check if required credentials exist
	if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
		return res.status(500).json({
			success: false,
			error: 'Email credentials not configured properly',
		});
	}

	const emailContent = `
::nom : '${nomPrenom || ''}'
::Email : '${email || ''}'
::Mobile : '${mobile || ''}'
::année: '${anneeDuBac || ''}'
::Formation : '${programme || ''}'
::Source : '${source || ''}'
::Moyenne générale : '${moyenneGenerale || ''}'
::note en maths : '${noteMaths || ''}'
::note en français : '${noteFrancais || ''}'
::note en physique : '${notePhysique || ''}'
::spécialité : '${specialite || ''}'
	`;

	try {
		await transporter.sendMail({
			from: process.env.EMAIL_USER, // Sender address
			to: 'ifag@under-test.com', // Updated recipient address
			subject: `${programme} - ${nomPrenom || 'Candidat'}`,
			text: emailContent,
			html: `<pre>${emailContent}</pre>`,
		});

		res.status(200).json({ success: true, message: 'Email sent successfully' });
	} catch (error) {
		console.error('Error sending email:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to send email',
			details: error.message,
		});
	}
});

// Start the server
app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});
