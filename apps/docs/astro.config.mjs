// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import fs from 'node:fs';
import path from 'node:path';
import starlightSidebarTopicsPlugin from 'starlight-sidebar-topics';
import starlightLinksValidatorPlugin from 'starlight-links-validator';
import starlightThemeNext from 'starlight-theme-next';
import { readFileSync } from 'node:fs';

const sidebarFilePath = path.resolve('./src/api-sidebar.json');
const apiSidebarItems = fs.existsSync(sidebarFilePath)
  ? JSON.parse(fs.readFileSync(sidebarFilePath, 'utf-8'))
  : [];

export default defineConfig({
    site: 'https://erlcjs.xyz',
    base: '/',
	integrations: [
		starlight({
			title: 'erlc.js',
            customCss: [ './src/styles/custom.css' ],
            editLink: {
                baseUrl: 'https://github.com/erlc-js/erlcjs/edit/main/apps/docs',
            },
			social: [
                { icon: 'github', label: 'GitHub', href: 'https://github.com/erlc-js/erlcjs' },
                { icon: 'discord', label: 'Discord', href: 'https://discord.gg/yMK7Szrn8Q' },
            ],
            head: [
                {
                tag: 'script',
                content: readFileSync(new URL('./src/scripts/toc.js', import.meta.url), 'utf-8')
                }
            ],
            plugins: [
                starlightThemeNext(),
                // starlightLinksValidatorPlugin(),
                starlightSidebarTopicsPlugin([
                    {
                        label: 'Guides',
                        link: '/guides/getting-started',
                        icon: 'open-book',
                        items: [
                            { label: 'Getting Started', slug: 'guides/getting-started' },
                            { label: 'Instantiating Client', slug: 'guides/client' },
                            { label: 'Managing Players', slug: 'guides/players' },
                            { label: 'Server & Command Management', slug: 'guides/server-commands' },
                            { label: 'Handling Events', slug: 'guides/events' },
                            { label: 'Accessing the Cache', slug: 'guides/cache' },
                            { 
                                label: 'Using Presets', 
                                items: [
                                    { label: 'Getting Started', slug: 'guides/presets/getting-started' },
                                ],
                            },
                        ],
                    },
                    {
                        label: 'API Reference',
                        link: '/api/',
                        icon: 'information',
                        id: 'reference',
                        items: [
                            { label: 'Overview', slug: 'api' },
                            ...apiSidebarItems
                        ]
                    },
                ])
            ],
            expressiveCode: {
                themes: ['github-dark', 'github-light'],
                styleOverrides: {
                    codeBackground: ({ theme }) => 
                        theme.type === 'dark' ? '#121212' : '#F4F4F5',
                    
                    frames: {
                        terminalBackground: ({ theme }) => 
                            theme.type === 'dark' ? '#121212' : '#F4F4F5',
                        terminalTitlebarBackground: ({ theme }) => 
                            theme.type === 'dark' ? '#121212' : '#F4F4F5',
                        terminalTitlebarBorderBottomColor: ({ theme }) => 
                            theme.type === 'dark' ? '#21262d' : '#d0d7de',
                        
                        editorTabBarBackground: ({ theme }) => 
                            theme.type === 'dark' ? '#090d12' : '#f0f3f6',
                        editorActiveTabBackground: ({ theme }) => 
                            theme.type === 'dark' ? '#121212' : '#F4F4F5',
                        editorTabBarBorderBottomColor: ({ theme }) => 
                            theme.type === 'dark' ? '#21262d' : '#d0d7de',
                    }
                },
            },
		}),
	],
});
