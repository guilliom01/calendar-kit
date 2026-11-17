<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';
	import { Button } from '#lib/registry/ui/button/index.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// app.html already applied the system theme; the button switches the shadcn `.dark` class.
	let dark = $state(false);
	onMount(() => {
		dark = document.documentElement.classList.contains('dark');
	});

	function toggleDark() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
	}

	const links = [
		{ href: resolve('/'), label: 'Completo' },
		{ href: resolve('/minimo'), label: 'Solo mes' },
		{ href: resolve('/ganchos'), label: 'Ganchos' },
		{ href: resolve('/carga'), label: 'Carga por rango' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex h-dvh flex-col print:h-auto">
	<nav aria-label="Demos" class="border-b print:hidden">
		<div class="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 py-2">
			<span class="me-3 font-semibold">calendar-kit</span>
			{#each links as link (link.href)}
				{@const current = page.url.pathname === link.href}
				<Button
					href={link.href}
					size="sm"
					variant={current ? 'secondary' : 'ghost'}
					aria-current={current ? 'page' : undefined}
				>
					{link.label}
				</Button>
			{/each}
			<Button class="ms-auto" size="sm" variant="outline" aria-pressed={dark} onclick={toggleDark}>
				{#if dark}<SunIcon />{:else}<MoonIcon />{/if}
				Modo oscuro
			</Button>
		</div>
	</nav>
	<div class="min-h-0 flex-1">
		{@render children()}
	</div>
</div>
