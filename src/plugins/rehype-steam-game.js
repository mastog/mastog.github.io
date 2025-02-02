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

            let gameData;
            try {
                const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept-Language': 'en-US'
                    }
                });
                const json = await res.json();
                if (!json[appId]?.success) throw new Error('Invalid appId');
                gameData = json[appId].data;
                
                replaceNode(node, createGameNode(appId, gameData));
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

function createGameNode(appId, data) {
    const children = [];
    if (data.header_image) {
        children.push({
            type: 'element',
            tagName: 'img',
            properties: { src: data.header_image, alt: data.name, class: 'game-img' },
            children: []
        });
    }

    const steamUrl = `https://store.steampowered.com/app/${appId}/`;
    children.push({
        type: 'element',
        tagName: 'a',
        properties: { href: steamUrl, class: 'game-title' },
        children: [{ type: 'text', value: data.name }]
    });

    if (data.price_overview) {
        children.push({
            type: 'element',
            tagName: 'div',
            properties: { class: 'game-price' },
            children: [{ type: 'text', value: data.price_overview.final_formatted }]
        });
    } else {
        children.push({
            type: 'element',
            tagName: 'div',
            properties: { class: 'game-price' },
            children: [{ type: 'text', value: 'N/A' }]
        });
    }

    return {
        type: 'element',
        tagName: 'div',
        properties: { class: 'steam-game' },
        children
    };
}

function replaceNode(oldNode, newNode) {
    oldNode.tagName = newNode.tagName;
    oldNode.properties = newNode.properties;
    oldNode.children = newNode.children;
}