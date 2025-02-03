import { visit } from 'unist-util-visit';
import fetch from 'node-fetch';

export function rehypeSteamGame() {
    return async (tree) => {
        const nodes = [];
        visit(tree, 'element', (node) => {
            if (node.tagName === 'steam-game') {
                nodes.push(node);
            }
        });

        for (const node of nodes) {
            const appId = node.properties?.appId;
            if (!appId) continue;

            let gameData, reviewData;
            try {
                const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=english`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept-Language': 'en-US'
                    }
                });
                const json = await res.json();
                if (!json[appId]?.success) throw new Error('Invalid appId');
                gameData = json[appId].data;
                
                const resReview = await fetch(`https://store.steampowered.com/appreviews/${appId}?json=1&l=english`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept-Language': 'en-US'
                    }
                });
                const jsonReview = await resReview.json();
                if (!jsonReview.success) throw new Error('Invalid appId');
                reviewData = jsonReview.data;

                replaceNode(node, createGameNode(appId, gameData, reviewData));
            } catch (error) {
                node.children = [{
                    type: 'text',
                    value: `Steam游戏加载失败（${appId}）：${error.message}`
                }];
                node.tagName = 'div';
                node.properties = { style: 'color: red; border: 1px solid red; margin: 0.5rem 0; padding: 1.1rem 1.5rem 1.1rem 1.5rem; border-radius: var(--radius-large);' };
            }
        }
    };
}

function createGameNode(appId, gameData, reviewData) {
    const children = [];
    const infoChildren = [];

    infoChildren.push({
        type: 'element',
        tagName: 'div',
        properties: { class: 'game-title' },
        children: [{ type: 'text', value: gameData.name }]
    });

    if (gameData.price_overview) {
        infoChildren.push({
            type: 'element',
            tagName: 'div',
            properties: { class: 'game-price' },
            children: [{ type: 'text', value: gameData.price_overview.final_formatted }]
        });
    } else {
        infoChildren.push({
            type: 'element',
            tagName: 'div',
            properties: { class: 'game-price' },
            children: [{ type: 'text', value: 'N/A' }]
        });
    }

    children.push({
        type: 'element',
        tagName: 'div',
        properties: { class: 'game-info' },
        children: infoChildren
    });

    if (gameData.header_image) {
        children.push({
            type: 'element',
            tagName: 'div',
            properties: { class: 'game-cover' },
            children: [{
                type: 'element',
                tagName: 'img',
                properties: { 
                    src: gameData.header_image, 
                    alt: gameData.name,
                    loading: 'lazy'
                },
                children: []
            }]
        });
    }

    const steamUrl = `https://store.steampowered.com/app/${appId}/`;
    return {
        type: 'element',
        tagName: 'a',
        properties: {
            class: 'steam-game',
            href: steamUrl,
            target: '_blank'
        },
        children
    };
}

function replaceNode(oldNode, newNode) {
    oldNode.tagName = newNode.tagName;
    oldNode.properties = newNode.properties;
    oldNode.children = newNode.children;
}