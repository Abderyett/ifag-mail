import { useEffect, useMemo, useState } from 'react';

import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from './components/ui/alert';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { cn } from './lib/utils';

const API_URL = import.meta.env.VITE_API_URL || '/api/send-email';
const IFAG_RED = '#e30613';

const IFAG_LICENCE_PROGRAMMES = [
	'Licence Commerce Marketing',
	'Licence Commerce Marketing Anglais',
	'Licence Informatique',
	'Licence Finance Comptabilité',
];

const IFAG_MASTER_PROGRAMMES = [
	'Master Marketing Management',
	'Master Transformation Digital',
	'Master IA',
	'Master Cyber Security',
	'Master Finance Entreprise',
	'Master Controle et Audit',
];

const INSAG_PROGRAMMES = [
	'Bachelor Management',
	'Bachelor Marketing',
	'Bachelor Info',
	'Ms Pharma',
	'Ms Finance',
	'Ms Management',
	'Ms RH',
];

const BAC_YEARS = ['2024', '2025', '2026'];
const BAC_TYPES = ['Science', 'Maths', 'Maths Tech', 'Français', 'Langue', 'Lettre'];
const SOURCES = ['khotwa alger', 'khotwa oran', 'graduate fair alger', 'graduate fair oran'];

const INITIAL_FORM_DATA = {
	ecole: '',
	nomPrenom: '',
	email: '',
	mobile: '',
	source: '',
	anneeDuBac: '',
	niveauFormation: '',
	specialite: '',
	moyenneGenerale: '',
	noteMaths: '',
	notePhysique: '',
	noteFrancais: '',
	noteAnglais: '',
	programme: '',
};

type FormData = typeof INITIAL_FORM_DATA;
type FormField = keyof FormData;
type NoteField = 'noteMaths' | 'notePhysique' | 'noteFrancais' | 'noteAnglais';

type Option = {
	label: string;
	value: string;
};

type StepKind = 'choice' | 'select' | 'input';

type Step = {
	id: string;
	field: FormField;
	kind: StepKind;
	title: string;
	description?: string;
	placeholder?: string;
	options?: Option[];
	inputType?: React.HTMLInputTypeAttribute;
	optional?: boolean;
	step?: string;
	min?: string;
	max?: string;
	maxLength?: number;
};

type InputMode = React.ComponentProps<'input'>['inputMode'];

type ProgrammeRequirement = {
	bacType?: boolean;
	moyenne?: boolean;
	notes?: NoteField[];
};

const PROGRAMME_REQUIREMENTS: Record<string, ProgrammeRequirement> = {
	'Licence Commerce Marketing': { bacType: true, moyenne: true, notes: ['noteFrancais', 'noteMaths'] },
	'Licence Commerce Marketing Anglais': { moyenne: true, notes: ['noteAnglais', 'noteMaths'] },
	'Licence Informatique': { moyenne: true, notes: ['noteMaths', 'notePhysique'] },
	'Licence Finance Comptabilité': { moyenne: true, notes: ['noteFrancais', 'noteMaths'] },
	'Bachelor Management': { bacType: true, moyenne: true, notes: ['noteFrancais', 'noteMaths'] },
	'Bachelor Marketing': { bacType: true, moyenne: true, notes: ['noteFrancais', 'noteMaths'] },
	'Bachelor Info': { moyenne: true, notes: ['noteMaths', 'notePhysique'] },
	'Ms Pharma': { moyenne: true },
	'Ms Finance': { moyenne: true },
	'Ms Management': { moyenne: true },
	'Ms RH': { moyenne: true },
};

const NOTE_STEPS: Record<NoteField, Omit<Step, 'id' | 'kind' | 'field'>> = {
	noteFrancais: {
		title: 'Quelle est votre note de français ?',
		description: 'Saisissez une note entre 0 et 20.',
		placeholder: 'Ex: 14.50',
		inputType: 'number',
		step: '0.01',
		min: '0',
		max: '20',
	},
	noteAnglais: {
		title: "Quelle est votre note d'anglais ?",
		description: 'Saisissez une note entre 0 et 20.',
		placeholder: 'Ex: 15.00',
		inputType: 'number',
		step: '0.01',
		min: '0',
		max: '20',
	},
	noteMaths: {
		title: 'Quelle est votre note de maths ?',
		description: 'Saisissez une note entre 0 et 20.',
		placeholder: 'Ex: 16.00',
		inputType: 'number',
		step: '0.01',
		min: '0',
		max: '20',
	},
	notePhysique: {
		title: 'Quelle est votre note de physique ?',
		description: 'Saisissez une note entre 0 et 20.',
		placeholder: 'Ex: 13.75',
		inputType: 'number',
		step: '0.01',
		min: '0',
		max: '20',
	},
};

const toOptions = (values: string[]) => values.map((value) => ({ value, label: value }));
const optionLetter = (index: number) => String.fromCharCode(65 + index);

function isScore(value: string) {
	const score = Number(value);
	return value.trim() !== '' && Number.isFinite(score) && score >= 0 && score <= 20;
}

function getInputMode(step: Step): InputMode {
	if (step.field === 'mobile') return 'tel';
	if (step.field === 'anneeDuBac') return 'numeric';
	if (step.inputType === 'number') return 'decimal';
	return undefined;
}

export default function ContactForm() {
	const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
	const [currentStepIndex, setCurrentStepIndex] = useState(0);
	const [showError, setShowError] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [status, setStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({
		type: '',
		message: '',
	});

	const steps = useMemo<Step[]>(() => {
		const nextSteps: Step[] = [
			{
				id: 'ecole',
				field: 'ecole',
				kind: 'choice',
				title: 'Choisissez votre école',
				description: 'Votre parcours change selon IFAG ou INSAG.',
				options: toOptions(['IFAG', 'INSAG']),
			},
		];

		if (!formData.ecole) return nextSteps;

		nextSteps.push(
			formData.ecole === 'IFAG'
				? {
						id: 'annee-ifag',
						field: 'anneeDuBac',
						kind: 'select',
						title: 'Quelle est votre année du bac ?',
						description: 'Sélectionnez une année disponible.',
						placeholder: 'Sélectionner une année',
						options: toOptions(BAC_YEARS),
					}
				: {
						id: 'annee-insag',
						field: 'anneeDuBac',
						kind: 'input',
						title: 'Quelle est votre année du bac ?',
						description: 'Saisissez une année sur 4 chiffres.',
						placeholder: 'Ex: 2024',
						inputType: 'number',
						maxLength: 4,
					}
		);

		if (formData.ecole === 'IFAG') {
			nextSteps.push({
				id: 'niveau-formation',
				field: 'niveauFormation',
				kind: 'choice',
				title: 'Quel niveau de formation souhaitez-vous ?',
				description: 'Choisissez Licence ou Master pour afficher les formations correspondantes.',
				options: toOptions(['Licence', 'Master']),
			});

			if (!formData.niveauFormation) return nextSteps;
		}

		const programmeOptions =
			formData.ecole === 'IFAG'
				? formData.niveauFormation === 'Licence'
					? IFAG_LICENCE_PROGRAMMES
					: IFAG_MASTER_PROGRAMMES
				: INSAG_PROGRAMMES;

		nextSteps.push({
			id: 'programme',
			field: 'programme',
			kind: 'choice',
			title: 'Quelle formation souhaitez-vous rejoindre ?',
			description:
				formData.ecole === 'IFAG'
					? `Programmes ${formData.niveauFormation}.`
					: `Programmes ${formData.ecole}.`,
			options: toOptions(programmeOptions),
		});

		if (!formData.programme) return nextSteps;

		const requirement = PROGRAMME_REQUIREMENTS[formData.programme] ?? {};

		if (requirement.bacType) {
			nextSteps.push({
				id: 'bac-type',
				field: 'specialite',
				kind: 'select',
				title: 'Quel est votre type de bac ?',
				placeholder: 'Sélectionner le type de bac',
				options: toOptions(BAC_TYPES),
			});
		}

		if (requirement.moyenne) {
			nextSteps.push({
				id: 'moyenne',
				field: 'moyenneGenerale',
				kind: 'input',
				title: 'Quelle est votre moyenne du bac ?',
				description: 'Saisissez une moyenne entre 0 et 20.',
				placeholder: 'Ex: 15.50',
				inputType: 'number',
				step: '0.01',
				min: '0',
				max: '20',
			});
		}

		requirement.notes?.forEach((noteField) => {
			nextSteps.push({
				...NOTE_STEPS[noteField],
				id: noteField,
				field: noteField,
				kind: 'input',
			});
		});

		nextSteps.push(
			{
				id: 'nom-prenom',
				field: 'nomPrenom',
				kind: 'input',
				title: 'Quel est votre nom et prénom ?',
				placeholder: 'Ex: Amine Benali',
				inputType: 'text',
			},
			{
				id: 'mobile',
				field: 'mobile',
				kind: 'input',
				title: 'Quel est votre numéro de téléphone ?',
				placeholder: 'Ex: 0550 00 00 00',
				inputType: 'tel',
			},
			{
				id: 'source',
				field: 'source',
				kind: 'select',
				title: 'Comment avez-vous connu IFAG / INSAG ?',
				placeholder: 'Sélectionner une source',
				options: toOptions(SOURCES),
			}
		);

		return nextSteps;
	}, [formData.ecole, formData.niveauFormation, formData.programme]);

	useEffect(() => {
		setCurrentStepIndex((index) => Math.min(index, steps.length - 1));
	}, [steps.length]);

	const currentStep = steps[currentStepIndex];
	const isLastStep = currentStep.id === 'source';
	const progress = isLastStep
		? 100
		: Math.min(95, Math.max(5, Math.round((currentStepIndex / Math.max(steps.length - 1, 1)) * 100)));
	const visibleStepCount = isLastStep ? steps.length : Math.max(steps.length, currentStepIndex + 2);
	const currentValue = formData[currentStep.field];

	const resetAfterSchoolChange = (base: FormData, ecole: string): FormData => ({
		...base,
		ecole,
		anneeDuBac: '',
		niveauFormation: '',
		programme: '',
		specialite: '',
		moyenneGenerale: '',
		noteMaths: '',
		notePhysique: '',
		noteFrancais: '',
		noteAnglais: '',
	});

	const resetAfterLevelChange = (base: FormData, niveauFormation: string): FormData => ({
		...base,
		niveauFormation,
		programme: '',
		specialite: '',
		moyenneGenerale: '',
		noteMaths: '',
		notePhysique: '',
		noteFrancais: '',
		noteAnglais: '',
	});

	const resetAfterProgrammeChange = (base: FormData, programme: string): FormData => ({
		...base,
		programme,
		specialite: '',
		moyenneGenerale: '',
		noteMaths: '',
		notePhysique: '',
		noteFrancais: '',
		noteAnglais: '',
	});

	const updateField = (field: FormField, value: string) => {
		setStatus({ type: '', message: '' });
		setShowError(false);

		setFormData((previous) => {
			if (field === 'ecole') return resetAfterSchoolChange(previous, value);
			if (field === 'niveauFormation') return resetAfterLevelChange(previous, value);
			if (field === 'programme') return resetAfterProgrammeChange(previous, value);
			return { ...previous, [field]: value };
		});
	};

	const getStepError = (step: Step) => {
		const value = formData[step.field].trim();

		if (!step.optional && !value) return 'Ce champ est obligatoire.';

		if (step.field === 'anneeDuBac' && formData.ecole === 'INSAG' && !/^\d{4}$/.test(value)) {
			return 'Veuillez saisir une année sur 4 chiffres.';
		}

		if (
			['moyenneGenerale', 'noteMaths', 'notePhysique', 'noteFrancais', 'noteAnglais'].includes(step.field) &&
			!isScore(value)
		) {
			return 'Veuillez saisir une valeur entre 0 et 20.';
		}

		return '';
	};

	const goToNextStep = () => {
		if (getStepError(currentStep)) {
			setShowError(true);
			return;
		}

		setShowError(false);
		setCurrentStepIndex((index) => Math.min(index + 1, steps.length - 1));
	};

	const goToPreviousStep = () => {
		setShowError(false);
		setCurrentStepIndex((index) => Math.max(index - 1, 0));
	};

	const handleChoice = (field: FormField, value: string) => {
		updateField(field, value);
		setCurrentStepIndex((index) => index + 1);
	};

	const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== 'Enter') return;
		event.preventDefault();
		if (isLastStep) {
			void handleSubmit();
			return;
		}
		goToNextStep();
	};

	const resetForm = () => {
		setFormData(INITIAL_FORM_DATA);
		setCurrentStepIndex(0);
		setShowError(false);
		setIsSubmitting(false);
		setIsSubmitted(false);
		setStatus({ type: '', message: '' });
	};

	const handleSubmit = async () => {
		const invalidStepIndex = steps.findIndex((step) => getStepError(step));

		if (invalidStepIndex !== -1) {
			setCurrentStepIndex(invalidStepIndex);
			setShowError(true);
			return;
		}

		setIsSubmitting(true);
		setStatus({ type: '', message: '' });

		try {
			const response = await fetch(API_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData),
			});

			const payload = await response.json().catch(() => ({ error: '' }));

			if (response.ok) {
				setFormData(INITIAL_FORM_DATA);
				setCurrentStepIndex(0);
				setShowError(false);
				setStatus({ type: '', message: '' });
				setIsSubmitted(true);
			} else {
				setStatus({ type: 'error', message: payload.error || "Erreur lors de l'envoi du formulaire" });
			}
		} catch (err) {
			console.error('Submit failed:', err);
			setStatus({
				type: 'error',
				message: 'Impossible de joindre le serveur. Veuillez réessayer dans quelques instants.',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const renderChoiceStep = (step: Step) => (
		<div className={cn('grid gap-2.5 sm:gap-3', (step.options?.length ?? 0) > 6 && 'sm:grid-cols-2')}>
			{step.options?.map((option, index) => {
				const isSelected = currentValue === option.value;

				return (
					<button
						key={option.value}
						type='button'
						onClick={() => handleChoice(step.field, option.value)}
						className={cn(
							'group flex min-h-13 w-full cursor-pointer items-center gap-3 rounded-lg border bg-white px-3.5 py-3 text-left shadow-sm transition-all duration-200 focus-visible:ring-3 focus-visible:outline-none sm:min-h-14 sm:gap-4 sm:px-4',
							isSelected
								? 'border-[#e30613] shadow-[0_12px_28px_rgba(227,6,19,0.12)] focus-visible:ring-[#e30613]/30'
								: 'border-slate-300 hover:border-slate-500 hover:shadow-md focus-visible:border-[#e30613] focus-visible:ring-[#e30613]/25'
						)}>
						<span
							className={cn(
								'grid size-7 shrink-0 place-items-center rounded-md text-xs font-black transition-colors sm:size-8 sm:text-sm',
								isSelected ? 'bg-[#e30613] text-white' : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
							)}>
							{optionLetter(index)}
						</span>
						<span className='min-w-0 text-[15px] leading-snug font-bold break-words text-slate-900 sm:text-lg'>
							{option.label}
						</span>
					</button>
				);
			})}
		</div>
	);

	const renderSelectStep = (step: Step) => (
		<div className='space-y-3'>
			<Label htmlFor={step.id} className='sr-only'>
				{step.title}
			</Label>
			<Select value={currentValue} onValueChange={(value) => updateField(step.field, value)}>
				<SelectTrigger
					id={step.id}
					className='h-13 w-full rounded-lg border-slate-300 bg-white px-3.5 text-[15px] font-semibold text-slate-900 shadow-sm focus:ring-[#e30613]/25 focus-visible:border-[#e30613] sm:h-14 sm:px-4 sm:text-base'>
					<SelectValue placeholder={step.placeholder} />
				</SelectTrigger>
				<SelectContent className='border-slate-200 bg-white text-slate-900'>
					{step.options?.map((option) => (
						<SelectItem
							key={option.value}
							value={option.value}
							className='cursor-pointer rounded-md text-base focus:bg-slate-100 focus:text-slate-950'>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);

	const renderInputStep = (step: Step) => (
		<div className='space-y-3'>
			<Label htmlFor={step.id} className='sr-only'>
				{step.title}
			</Label>
			<Input
				id={step.id}
				name={step.field}
				type={step.inputType}
				inputMode={getInputMode(step)}
				min={step.min}
				max={step.max}
				step={step.step}
				maxLength={step.maxLength}
				placeholder={step.placeholder}
				value={currentValue}
				onChange={(event) => updateField(step.field, event.target.value)}
				onKeyDown={handleInputKeyDown}
				className='h-14 rounded-lg border-slate-300 bg-white px-3.5 text-lg font-bold text-slate-950 shadow-sm placeholder:text-slate-400 focus-visible:border-[#e30613] focus-visible:ring-[#e30613]/25 sm:h-16 sm:px-4 sm:text-xl'
			/>
		</div>
	);

	const renderCurrentStep = () => {
		if (currentStep.kind === 'choice') return renderChoiceStep(currentStep);
		if (currentStep.kind === 'select') return renderSelectStep(currentStep);
		return renderInputStep(currentStep);
	};

	const stepError = showError ? getStepError(currentStep) : '';

	if (isSubmitted) {
		return (
			<main className='min-h-dvh overflow-hidden bg-slate-100 text-slate-950'>
				<div className='mx-auto flex min-h-dvh w-full max-w-3xl items-center justify-center px-5 py-10'>
					<section className='relative flex w-full flex-col items-center text-center animate-in fade-in-0 zoom-in-95 duration-500 motion-reduce:animate-none'>
						<div className='pointer-events-none absolute -top-12 left-8 hidden size-16 rounded-full bg-emerald-200/50 blur-2xl sm:block' />
						<div className='pointer-events-none absolute right-8 bottom-10 hidden size-24 rounded-full bg-[#e30613]/10 blur-3xl sm:block' />

						<div className='relative mb-8 grid size-34 place-items-center sm:size-40'>
							<span className='absolute inset-0 rounded-full bg-emerald-400/20 animate-ping motion-reduce:animate-none' />
							<span className='absolute inset-4 rounded-full bg-emerald-300/30 animate-pulse motion-reduce:animate-none' />
							<span className='relative grid size-24 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_22px_60px_rgba(16,185,129,0.35)] sm:size-28'>
								<CheckCircle className='size-14 stroke-[2.6] sm:size-16' />
							</span>
							<Sparkles className='absolute top-2 right-5 size-6 text-emerald-600 animate-bounce motion-reduce:animate-none' />
							<Sparkles className='absolute bottom-5 left-4 size-5 text-[#e30613] animate-pulse motion-reduce:animate-none' />
						</div>

						<div className='space-y-4'>
							<p className='text-sm font-black tracking-wide text-emerald-700 uppercase'>Candidature envoyée</p>
							<h1 className='text-4xl leading-tight font-black tracking-normal text-slate-950 sm:text-6xl'>
								Votre inscription a été envoyée.
							</h1>
							<p className='mx-auto max-w-md text-base leading-7 font-medium text-slate-600 sm:text-lg'>
								Merci. Notre équipe va revenir vers vous avec les prochaines étapes.
							</p>
						</div>

						<Button
							type='button'
							onClick={resetForm}
							className='mt-9 h-12 rounded-lg bg-[#e30613] px-6 font-bold text-white shadow-sm hover:bg-[#c90010] focus-visible:ring-[#e30613]/30'>
							Nouvelle inscription
							<ArrowRight className='size-4' />
						</Button>
					</section>
				</div>
			</main>
		);
	}

	return (
		<main className='min-h-dvh bg-slate-100 text-slate-950'>
			<div className='mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pt-4 sm:px-8 sm:py-6 lg:px-10'>
				<header className='flex items-center justify-between gap-3 sm:gap-5'>
					<div className='shrink-0 text-xs font-black tracking-wide text-slate-700 uppercase sm:text-sm'>IFAG / INSAG</div>
					<div className='flex min-w-0 flex-1 items-center justify-end gap-3'>
						<div className='h-1.5 w-full max-w-36 overflow-hidden rounded-full bg-slate-300 sm:h-2 sm:max-w-52'>
							<div
								className='h-full rounded-full bg-[#e30613] transition-all duration-500 ease-out'
								style={{ width: `${progress}%` }}
							/>
						</div>
						<span className='w-9 text-right text-xs font-bold text-slate-600 sm:w-11'>{progress}%</span>
					</div>
				</header>

				<section className='flex flex-1 items-start py-7 sm:items-center sm:py-14'>
					<div className='w-full' aria-live='polite'>
						<div
							key={currentStep.id}
							className='mx-auto flex w-full max-w-3xl flex-col gap-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 motion-reduce:animate-none sm:gap-8'>
							<div className='space-y-3 sm:space-y-4'>
								<div className='flex items-center gap-2.5 text-xs font-bold text-slate-500 sm:gap-3 sm:text-sm'>
									<span style={{ color: IFAG_RED }}>{String(currentStepIndex + 1).padStart(2, '0')}</span>
									<span>→</span>
									<span>{String(visibleStepCount).padStart(2, '0')}</span>
								</div>
								<div className='space-y-3'>
									<h1 className='max-w-3xl text-3xl leading-tight font-black tracking-normal text-slate-950 sm:text-5xl'>
										{currentStep.title}
									</h1>
									{currentStep.description && (
										<p className='max-w-xl text-sm leading-6 font-medium text-slate-600 sm:text-lg sm:leading-7'>
											{currentStep.description}
										</p>
									)}
								</div>
							</div>

							<div className='space-y-4'>
								{renderCurrentStep()}
								{stepError && (
									<p className='flex items-center gap-2 text-sm font-semibold text-[#e30613]'>
										<AlertCircle className='size-4' />
										{stepError}
									</p>
								)}
							</div>
						</div>
					</div>
				</section>

				<footer className='sticky bottom-0 -mx-4 mt-auto flex w-auto flex-col gap-3 bg-slate-100/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur sm:static sm:mx-auto sm:w-full sm:max-w-3xl sm:gap-4 sm:bg-transparent sm:px-0 sm:pt-0 sm:pb-6 sm:backdrop-blur-none'>
					{status.message && (
						<Alert
							className={cn(
								'rounded-lg bg-white',
								status.type === 'success' ? 'border-emerald-500' : 'border-[#e30613]'
							)}>
							{status.type === 'success' ? (
								<CheckCircle className='h-4 w-4 text-emerald-600' />
							) : (
								<AlertCircle className='h-4 w-4 text-[#e30613]' />
							)}
							<AlertDescription className={status.type === 'success' ? 'text-emerald-700' : 'text-[#e30613]'}>
								{status.message}
							</AlertDescription>
						</Alert>
					)}

					<div className='grid grid-cols-[auto_1fr] items-center gap-2.5 sm:flex sm:justify-between sm:gap-3'>
						<Button
							type='button'
							variant='outline'
							onClick={goToPreviousStep}
							disabled={currentStepIndex === 0 || isSubmitting}
							className='h-12 rounded-lg border-slate-300 bg-white px-3 text-slate-700 hover:bg-slate-50 sm:h-11 sm:px-4'>
							<ArrowLeft className='size-4' />
							<span className='sr-only sm:not-sr-only'>Retour</span>
						</Button>

						<div className='flex min-w-0 items-center gap-3 sm:min-w-fit'>
							<span className='hidden text-sm font-medium text-slate-500 sm:inline'>Entrée ↵</span>
							<Button
								type='button'
								onClick={isLastStep ? handleSubmit : goToNextStep}
								disabled={isSubmitting}
								className='h-12 w-full rounded-lg bg-[#e30613] px-5 font-bold text-white shadow-sm hover:bg-[#c90010] focus-visible:ring-[#e30613]/30 sm:h-11 sm:w-auto'>
								{isSubmitting ? (
									<>
										<Loader2 className='size-4 animate-spin' />
										Envoi...
									</>
								) : isLastStep ? (
									<>
										Envoyer
										<CheckCircle className='size-4' />
									</>
								) : (
									<>
										Continuer
										<ArrowRight className='size-4' />
									</>
								)}
							</Button>
						</div>
					</div>
				</footer>
			</div>
		</main>
	);
}
