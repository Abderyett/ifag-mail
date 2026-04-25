import { motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/lib/utils';

type SuccessCheckAnimationProps = {
	size?: 'sm' | 'md' | 'lg';
	className?: string;
};

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

const sizeClass: Record<NonNullable<SuccessCheckAnimationProps['size']>, string> = {
	sm: 'h-20 w-20',
	md: 'h-28 w-28',
	lg: 'h-32 w-32',
};

const svgSizeClass: Record<NonNullable<SuccessCheckAnimationProps['size']>, string> = {
	sm: 'h-[4.5rem] w-[4.5rem]',
	md: 'h-24 w-24',
	lg: 'h-28 w-28',
};

export function SuccessCheckAnimation({ size = 'md', className }: SuccessCheckAnimationProps) {
	const reduceMotion = useReducedMotion();

	return (
		<motion.div
			initial={reduceMotion ? false : { scale: 0.92, opacity: 0 }}
			animate={{ scale: 1, opacity: 1 }}
			transition={{ duration: 0.28, ease: easeOut }}
			className={cn('relative inline-flex items-center justify-center', sizeClass[size], className)}
			aria-hidden='true'>
			<motion.div
				initial={reduceMotion ? false : { scale: 0.72, opacity: 0 }}
				animate={{ scale: reduceMotion ? 1 : [0.72, 1.06, 1], opacity: 1 }}
				transition={{ duration: 0.5, ease: easeOut }}
				className='absolute inset-0 rounded-full bg-emerald-500/15'
			/>
			<motion.svg viewBox='0 0 120 120' className={cn('relative text-emerald-500', svgSizeClass[size])}>
				<motion.circle
					cx='60'
					cy='60'
					r='42'
					fill='none'
					stroke='currentColor'
					strokeWidth='7'
					strokeLinecap='round'
					initial={reduceMotion ? false : { pathLength: 0 }}
					animate={{ pathLength: 1 }}
					transition={{ duration: 0.7, ease: easeOut }}
				/>
				<motion.path
					d='M40 61.5 53.5 75 82 45'
					fill='none'
					stroke='currentColor'
					strokeWidth='8'
					strokeLinecap='round'
					strokeLinejoin='round'
					initial={reduceMotion ? false : { pathLength: 0 }}
					animate={{ pathLength: 1 }}
					transition={{ duration: 0.45, ease: easeOut, delay: reduceMotion ? 0 : 0.42 }}
				/>
			</motion.svg>
		</motion.div>
	);
}
