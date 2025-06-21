import { useState } from 'react';

import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Label } from './components/ui/label';
import { Input } from './components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Alert, AlertDescription } from './components/ui/alert';
import { Button } from './components/ui/button';

interface FormData {
	nomPrenom: string;
	email: string;
	mobile: string;
	source: string;
	anneeDuBac: string;
	specialite: string;
	moyenneGenerale: string;
	noteMaths: string;
	notePhysique: string;
	noteFrancais: string;
	programme: string;
}

export default function ContactForm() {
	const [formData, setFormData] = useState<FormData>({
		nomPrenom: '',
		email: '',
		mobile: '',
		source: '',
		anneeDuBac: '',
		specialite: '',
		moyenneGenerale: '',
		noteMaths: '',
		notePhysique: '',
		noteFrancais: '',
		programme: '',
	});

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [status, setStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({
		type: '',
		message: '',
	});

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) =>
		setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

	const handleSelectChange = (name: keyof FormData, value: string) =>
		setFormData((prev) => ({ ...prev, [name]: value }));

	const isFormValid = () => {
		const { nomPrenom, mobile, source } = formData;
		return nomPrenom.trim() && mobile.trim() && source.trim();
	};

	const handleSubmit = async () => {
		if (!isFormValid()) return;

		setIsSubmitting(true);
		setStatus({ type: '', message: '' });

		try {
			const response = await fetch('http://localhost:8000/api/send-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData),
			});

			const payload = await response.json();

			if (response.ok) {
				setStatus({ type: 'success', message: 'Votre formulaire a été envoyé avec succès !' });
				setFormData({
					nomPrenom: '',
					email: '',
					mobile: '',
					source: '',
					anneeDuBac: '',
					specialite: '',
					moyenneGenerale: '',
					noteMaths: '',
					notePhysique: '',
					noteFrancais: '',
					programme: '',
				});
			} else {
				setStatus({ type: 'error', message: payload.error || "Erreur lors de l'envoi du formulaire" });
			}
		} catch (err) {
			setStatus({ type: 'error', message: `Erreur de connexion. Veuillez réessayer. ${err}` });
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className='min-h-screen bg-gray-50 py-12 px-4'>
			<div className='max-w-4xl mx-auto'>
				<div className='bg-white shadow-lg rounded-lg p-8'>
					<h1 className='text-3xl font-bold text-center mb-8'>Formulaire Prospects IFAG</h1>

					<div className='space-y-6'>
						{/* Informations personnelles */}
						<div className='bg-gray-50 p-4 rounded-lg'>
							<h2 className='text-xl font-semibold mb-4'>Informations personnelles</h2>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								<div className='space-y-2'>
									<Label htmlFor='nomPrenom'>Nom et prénom *</Label>
									<Input
										id='nomPrenom'
										name='nomPrenom'
										placeholder='Jean Dupont'
										value={formData.nomPrenom}
										onChange={handleInputChange}
									/>
								</div>

								<div className='space-y-2'>
									<Label htmlFor='email'>Email</Label>
									<Input
										id='email'
										name='email'
										type='email'
										placeholder='jean@example.com'
										value={formData.email}
										onChange={handleInputChange}
									/>
								</div>

								<div className='space-y-2'>
									<Label htmlFor='mobile'>Mobile *</Label>
									<Input
										id='mobile'
										name='mobile'
										type='tel'
										placeholder='06 12 34 56 78'
										value={formData.mobile}
										onChange={handleInputChange}
									/>
								</div>

								<div className='space-y-2'>
									<Label htmlFor='source'>Source *</Label>
									<Select value={formData.source} onValueChange={(v) => handleSelectChange('source', v)}>
										<SelectTrigger id='source'>
											<SelectValue placeholder='Comment nous avez-vous connu ?' />
										</SelectTrigger>
										<SelectContent>
											{['Passage', 'Salon', 'Recommendation'].map((v) => (
												<SelectItem key={v} value={v}>
													{v}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className='space-y-2'>
									<Label htmlFor='anneeDuBac'>Année du bac</Label>
									<Input
										id='anneeDuBac'
										name='anneeDuBac'
										type='number'
										placeholder='2023'
										min='1990'
										max='2030'
										value={formData.anneeDuBac}
										onChange={handleInputChange}
									/>
								</div>
							</div>
						</div>

						{/* Informations académiques */}
						<div className='bg-blue-50 p-4 rounded-lg'>
							<h2 className='text-xl font-semibold mb-4'>Informations académiques</h2>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								<div className='space-y-2'>
									<Label htmlFor='specialite'>Spécialité</Label>
									<Select
										value={formData.specialite}
										onValueChange={(v) => handleSelectChange('specialite', v)}>
										<SelectTrigger id='specialite'>
											<SelectValue placeholder='Sélectionnez une spécialité' />
										</SelectTrigger>
										<SelectContent>
											{[
												'Filières Scientifiques',
												'BAC Français',
												'Maths',
												'Maths Technique',
												'Gestion',
												'Filières Langues Étrangères',
												'Filières Lettres et Philosophie',
											].map((v) => (
												<SelectItem key={v} value={v}>
													{v}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className='space-y-2'>
									<Label htmlFor='moyenneGenerale'>Moyenne générale</Label>
									<Input
										id='moyenneGenerale'
										name='moyenneGenerale'
										type='number'
										step='0.01'
										min='0'
										max='20'
										placeholder='15.50'
										value={formData.moyenneGenerale}
										onChange={handleInputChange}
									/>
								</div>

								<div className='space-y-2'>
									<Label htmlFor='noteMaths'>Note Maths</Label>
									<Input
										id='noteMaths'
										name='noteMaths'
										type='number'
										step='0.01'
										min='0'
										max='20'
										placeholder='16.00'
										value={formData.noteMaths}
										onChange={handleInputChange}
									/>
								</div>

								<div className='space-y-2'>
									<Label htmlFor='notePhysique'>Note Physique</Label>
									<Input
										id='notePhysique'
										name='notePhysique'
										type='number'
										step='0.01'
										min='0'
										max='20'
										placeholder='14.50'
										value={formData.notePhysique}
										onChange={handleInputChange}
									/>
								</div>

								<div className='space-y-2'>
									<Label htmlFor='noteFrancais'>Note Français</Label>
									<Input
										id='noteFrancais'
										name='noteFrancais'
										type='number'
										step='0.01'
										min='0'
										max='20'
										placeholder='13.75'
										value={formData.noteFrancais}
										onChange={handleInputChange}
									/>
								</div>

								<div className='space-y-2'>
									<Label htmlFor='programme'>Programme souhaité</Label>
									<Select
										value={formData.programme}
										onValueChange={(v) => handleSelectChange('programme', v)}>
										<SelectTrigger id='programme'>
											<SelectValue placeholder='Sélectionnez un programme' />
										</SelectTrigger>
										<SelectContent>
											{[
												'LAC 1',
												'LAC 2',
												'LAC 3',
												'LINFO 1',
												'LINFO 2',
												'LINFO 3',
												'LFC 1',
												'LFC 2',
												'Master MM',
											].map((v) => (
												<SelectItem key={v} value={v}>
													{v}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>

						{status.message && (
							<Alert className={status.type === 'success' ? 'border-green-500' : 'border-red-500'}>
								{status.type === 'success' ? (
									<CheckCircle className='h-4 w-4 text-green-500' />
								) : (
									<AlertCircle className='h-4 w-4 text-red-500' />
								)}
								<AlertDescription className={status.type === 'success' ? 'text-green-700' : 'text-red-700'}>
									{status.message}
								</AlertDescription>
							</Alert>
						)}

						<Button onClick={handleSubmit} className='w-full' disabled={!isFormValid() || isSubmitting}>
							{isSubmitting ? (
								<>
									<Loader2 className='mr-2 h-4 w-4 animate-spin' />
									Envoi en cours…
								</>
							) : (
								'Envoyer la candidature'
							)}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
